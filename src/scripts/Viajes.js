class Viajes{
    constructor(initHTML = false){
        this.list = [];
        this.bandera = false;
        this.crud = null;
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='viajes'] a").addClass("active")
        this.list = (await $.get({url: "/viajes/get-list"})).list;
        this.clientes = (await $.get({url: "/clientes/get-list"})).list;
        this.choferes = (await $.get({url: "/choferes/get-list"})).list;
        this.transportes = (await $.get({url: "/transportes/get-list"})).list;

        $("[name='cliente']").html( `<option value="0" selected>-SELECCIONAR-</option>` + G.getOptions({arr: this.clientes, value: "_id", label: "nombre"}) )
        $("[name='chofer']").html( `<option value="0" selected>-SELECCIONAR-</option>` + G.getOptions({arr: this.choferes.filter(x=>x.activo), value: "_id", label: "nombre"}) )
        $("[name='transporte']").html( `<option value="0" selected>-SELECCIONAR-</option>` + G.getOptions({arr: this.transportes.filter(x=>x.activo), value: "_id", label: "nombre"}) )
        
        this.listOrigenDestino = [];
        this.list.forEach(vx=>{
            if( this.listOrigenDestino.includes( vx.origen ) == false) this.listOrigenDestino.push(vx.origen);
            if( this.listOrigenDestino.includes( vx.destino ) == false) this.listOrigenDestino.push(vx.destino);
        });
        $("[name='origen']").html(`<option value="0" selected>-SELECCIONAR-</option>` + G.getOptionsV1(this.listOrigenDestino));
        $("[name='destino']").html(`<option value="0" selected>-SELECCIONAR-</option>` + G.getOptionsV1(this.listOrigenDestino));



        this.crud = new SimpleCRUD({
            list: this.list,
            searchProps: ["origen", "destino", "_cliente", "_chofer", "_transporte"],
            structure: [
                {
                    label: "#",
                    prop: "numero",
                    fn: (e, f)=> "<span class='badge badge-info'>" + e + "</span>"
                },
                {
                    label: "F. partida",
                    prop: "fechaPartida",
                    fn: (e, f)=> "<small>" + fechas.parse2(e, "ARG_FECHA_HORA") + "</small>"
                },
                {
                    label: "Origen",
                    prop: "origen",
                },
                {
                    label: "Destino",
                    prop: "destino",
                },
                {
                    label: "Estado",
                    prop: "estado",
                    right: true,
                    fn: (e, f)=>{
                        if(e === 1) return `<span class='badge badge-warning'>Creado</span>`;
                        else if(e === 2) return `<span class='badge badge-warning'>Viajando</span>`;
                        else if(e === 3) return `<span class='badge badge-success'>Concretado</span>`;
                        else if(e === 4) return `<span class='badge badge-danger'>Cancelado</span>`;
                    }
                }
            ]
        });
        this.crud.setTable($("#container-main-table"));
        this.crud.inicialize("mongodb");

        $("[crud='btNew']").click(ev=>{
            this.crud.onNew();
            /* $("[name='origen']").prop("disabled", true);
            $("[name='destino']").prop("disabled", true); */

            $("[name='origen']").val(0);
            $("[name='destino']").val(0);
            $("[name='cliente']").val(0);
            $("[name='chofer']").val(0);
            $("[name='transporte']").val(0);
        })

        $("[crud='btModify']").click(async ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un viaje para realizar esta acción"); return; }
            if(this.crud.element.estado != 1) { modal.mensaje("No se puede modificar un viaje CONCRETADO ó CANCELADO"); return; }
            this.crud.onModify();
        });

        $("[crud='btDelete']").click(ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un viaje para realizar esta acción"); return; }
            if(this.crud.element.estado != 1) { modal.mensaje("No se puede modificar un viaje CONCRETADO ó CANCELADO"); return; }
            this.onDelete();
        })

        $("[name='cambiar_estado']").click(async ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un viaje para realizar esta acción"); return; }
            this.modalCambiarEstado();
        });

        $("[crud='btSave']").click(async ev=>{
            if(this.bandera) return;
            this.bandera = true;
            await this.onSave();
            this.bandera = false;
        })

        $("[crud='txSearch']").keyup(ev=>{
            let v = $("[crud='txSearch']").val()
            if(ev.keyCode == 13 || v == ""){//enter
                this.crud.search(v);
            }
        });

        $("[name='crear-origen']").click(async ev=>{
            let aux = await modal.prompt({label: "Origen"});
            if(aux && aux.length > 3){
                $("[name='origen']").append(`<option value="${aux}">${aux}</option>`);
                $("[name='origen']").val(aux);
            }
        })
        $("[name='crear-destino']").click(async ev=>{
            let aux = await modal.prompt({label: "Destino"});
            if(aux && aux.length > 3){
                $("[name='destino']").append(`<option value="${aux}">${aux}</option>`);
                $("[name='destino']").val(aux);
            }
        })
        G.removeCinta();
    }
    async onSave(){
        try{
            let data = this.crud.getDataToSave();
            if(!data.origen || data.origen == "0") throw "Origen no válido";
            if(!data.destino || data.destino == "0") throw "Destino no válido";
            if(!data.fechaPartida) throw "Fecha de partida no válido";
            if(!data.fechaRegreso) throw "Fecha de regreso no válido";
            if(data.fechaPartida > data.fechaRegreso) throw "La fecha de partida no puede ser superior a la fecha de regreso";
            data.kilometrosRecorrer = parseInt(data.kilometrosRecorrer);
            if(isNaN(data.kilometrosRecorrer) || data.kilometrosRecorrer <= 0) throw "Kilometros a recorrer no válido.";
            if(!data.cliente || data.cliente == "0") throw "Cliente no válido";
            data.pasajeros = parseInt(data.pasajeros);
            if(isNaN(data.pasajeros) || data.pasajeros <= 0) throw "Pasajeros no válido.";
            if(!data.chofer || data.chofer == "0") throw "Chofer no válido";
            if(!data.transporte || data.transporte == "0") throw "Transporte no válido";
            data.valorViaje = parseInt(data.valorViaje);
            if(isNaN(data.valorViaje) || data.valorViaje <= 0) throw "Valor viaje no válido.";
            data.comisionChofer = parseInt(data.comisionChofer);
            if(isNaN(data.comisionChofer) || data.comisionChofer <= 0) throw "Comisión chofer no válido.";
            
            this.list.forEach(guardado=>{
                let comparte = false;
                if(data.fechaPartida < guardado.fechaPartida && data.fechaRegreso > guardado.fechaPartida && data.fechaRegreso < guardado.fechaRegreso){
                    /*
                     guardado =>     |----------|
                     data =>      |--------|
                    */
                    comparte = true;
                }else if(data.fechaPartida > guardado.fechaPartida && data.fechaRegreso < guardado.fechaRegreso){
                    /*
                     guardado =>    |----------|
                     data =>           |----|
                    */
                    comparte = true;
                }else if(data.fechaPartida > guardado.fechaPartida && data.fechaRegreso > guardado.fechaRegreso && data.fechaPartida < guardado.fechaRegreso){
                    /*
                     guardado =>    |--------|
                     data =>             |--------|
                    */
                     comparte = true;
                }
                if(comparte && guardado.estado != 4 && data._id  != guardado._id){
                    if(data.chofer == guardado.chofer) throw `ERROR<br>El <b>chofer</b> ya tiene un viaje programado para esa fecha <b>VIAJE: #${guardado.numero}</b>`;
                    if(data.transporte == guardado.transporte) throw `ERROR<br>El <b>transporte</b> ya tiene un viaje programado para esa fecha <b>VIAJE: #${guardado.numero}</b>`;
                }
            });


            let ret = await $.post({
                url: "/viajes/save",
                data: data
            })

            if(data._action == "new"){
                ret.viaje._action = data._action;
                this.crud.afterSave(ret.viaje);
            }else{
                this.crud.afterSave(data);
            }
            this.crud.search("");
            
            G._playSound({message: "Guardado", icon: "success", title: "..."});
        }catch(err){
            modal.mensaje(err.toString());
        }
    }
    modalCambiarEstado(){
        let foo = $("#modal_cambiar_estado").html();
        modal.mostrar({
            titulo: "Cambiar estado",
            cuerpo: foo,
            botones: "volver"
        })

        if(this.crud.element.estado === 1){
            $("#modal [name='creado']").html("<i class='fas fa-hand-point-right'></i> Creado")
            $("#modal [name='viajando']").prop("disabled", false);
            $("#modal [name='concretado']").prop("disabled", false);
            $("#modal [name='cancelado']").prop("disabled", false);
        }else if(this.crud.element.estado === 2){
            $("#modal [name='viajando']").html("<i class='fas fa-hand-point-right'></i> Viajando")
            $("#modal [name='concretado']").prop("disabled", false);
        }else if(this.crud.element.estado === 3){
            $("#modal [name='concretado']").html("<i class='fas fa-hand-point-right'></i> Concretado")
        }else if(this.crud.element.estado === 4){
            $("#modal [name='cancelado']").html("<i class='fas fa-hand-point-right'></i> Cancelado")
        }

        $("#modal [name='creado']").click(ev=>{
            //nada nunca esta habilitado
        });

        $("#modal [name='creado'], #modal [name='viajando'], #modal [name='concretado'], #modal [name='cancelado']").click(async ev=>{
            let nuevoEstado = 0;
            let attr = $(ev.currentTarget).attr("name");
            console.log(attr);
            if(attr == "creado") nuevoEstado = 1;
            else if(attr == "viajando") nuevoEstado = 2;
            else if(attr == "concretado") nuevoEstado = 3;
            else if(attr == "cancelado") nuevoEstado = 4;

            let ret = await $.post({
                url: "/viajes/set-state",
                data: {
                    vid: this.crud.element._id,
                    estado: nuevoEstado
                }
            })
            console.log(ret);
            this.crud.element.estado = nuevoEstado;
            this.crud.updateTableRow();
            modal.ocultar();
        });
    }
}