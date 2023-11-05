class Choferes{
    constructor(initHTML = false){
        this.list = [];
        this.bandera = false;
        this.crud = null;
        this.registrosViajes = [];
        this.registrosAbonosViajes = [];
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='choferes'] a").addClass("active")
        this.list = (await $.get({url: "/choferes/get-list"})).list;
        
        this.crud = new SimpleCRUD({
            list: this.list,
            searchProps: ["nombre", "telefono"],
            structure: [
                {
                    label: "Nombre",
                    prop: "nombre",
                    width: "calc(100% - 100px)"
                },
                {
                    label: "Activo",
                    prop: "activo",
                    width: "100px",
                    right: true,
                    fn: (e, f) => {
                        if(f.activo){
                            return `<span class="badge badge-success">Si</span>`
                        }else{
                            return `<span class="badge badge-danger">No</span>`
                        }
                    }
                }
            ],
            afterSelect: e =>{
                this.listarViajes();
            }
        });
        this.crud.setTable($("#container-main-table"));
        this.crud.inicialize("mongodb");

        $("[crud='btNew']").click(ev=>{
            this.crud.onNew();
            $("[crud='fields'] [name='activo']").val(1);
        })

        $("[crud='btModify']").click(async ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un chofer para realizar esta acción"); return; }
            this.crud.onModify();
        });

        $("[crud='btDelete']").click(ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un chofer para realizar esta acción"); return; }
            this.onDelete();
        })

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

        $("[name='vencimientos']").click(ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un chofer para realizar esta acción"); return; }
            this.modalVencimientos();
        });
        G.removeCinta();
    }
    async onSave(){
        try{
            let data = this.crud.getDataToSave();
            if(data.nombre.length < 3) throw "Nombre no válido";
            if(data.telefono.length < 3) throw "Teléfono no válido";
            data.activo = Number(data.activo) === 1;
    
            let ret = await $.post({
                url: "/choferes/save",
                data: data
            })

            if(data._action == "new"){
                ret.chofer._action = data._action;
                this.crud.afterSave(ret.chofer);
            }else{
                this.crud.afterSave(data);
            }
            this.crud.search("");
            
            G._playSound({message: "Guardado", icon: "success", title: "..."});
        }catch(err){
            modal.mensaje(err.toString());
        }
    }
    modalVencimientos(){
        let foo = $("#modal_vencimientos").html();
        modal.mostrar({
            titulo: "Vencimientos",
            cuerpo: foo,
            tamano: "modal-xl",
            botones: "volver"
        })

        let vencimientos = [];
        const listarVencimientos = async () =>{
            let ret = await $.get({url: `/vencimientos/find?model=chofer&oid=${this.crud.element._id}`})
            console.log(ret);
            vencimientos = ret.result;

            let tbody = ""
            vencimientos.forEach(vx=>{
                if(vx.activo){
                    let dd = fechas.diff_days(new Date(), vx.fecha);
                    let color = "table-success";
                    if(dd < 0) color = "table-danger";
                    else if(dd < 30) color = "table-warning";

                    tbody += `<tr class="${color}">
                        <td>${vx.nombre}</td>
                        <td class="text-right">${fechas.parse2(vx.fecha, "ARG_FECHA")}</td>
                    </tr>`
                }
            });
            $("#modal tbody").html(tbody);
        }
        
        listarVencimientos();
        

        $("#modal [name='registrar']").click(async ev=>{
            let nombre = $("#modal [name='nombre']").val();
            let fechaVencimiento = $("#modal [name='vencimiento']").val();
            if(!nombre){
                modal.addPopover({querySelector: "#modal [name='registrar']", message: "Nombre no válido"});
                return;
            }

            if(!fechaVencimiento){
                modal.addPopover({querySelector: "#modal [name='registrar']", message: "Fecha de vencimiento no válida"});
                return;
            }

            let ret = await modal.addAsyncPopover({querySelector: "#modal [name='registrar']", type: "yesno", message: "¿Confirma agregar el registro?"})
            if(!ret) return;
            
            let ret2 = await $.post({
                url: "/vencimientos/insert",
                data: {
                    model: "chofer",
                    nombre: nombre,
                    oid: this.crud.element._id,
                    nombreReferencia: this.crud.element.nombre,
                    fecha: fechaVencimiento
                }
            })

            //busco todos los vencimientos y vuelvo a listar
            listarVencimientos();

        });
    }
    async listarViajes(){
        this.registrosViajes = (await $.get({ url: "/viajes/get-viajes/chofer/" + this.crud.element._id })).list;
        this.registrosAbonosViajes = (await $.get({ url: "/cajas/chofer/" + this.crud.element._id })).result;

        let saldo = 0;
        let tbody = "";
        this.registrosViajes.concat(this.registrosAbonosViajes).sort((a, b)=>{
            let f1 = (a.fechaPartida ? a.fechaPartida : a.fecha);
            let f2 = (b.fechaPartida ? b.fechaPartida : b.fecha);
            if(f1 > f2) return 1;
            else if(f1 < f2) return -1;
            return 0;
        }).forEach(vx=>{
            if( vx.valorViaje && vx.estado === 3 ){//es viaje
                
                saldo = saldo + vx.comisionChofer;
                    
                tbody += `<tr>
                    <td>
                        <small>${fechas.parse2(vx.fechaPartida, "ARG_FECHA_HORA")}</small>
                    </td>
                    <td>
                        Viaje #${vx.numero} dest. ${vx.destino}
                    </td>
                    <td class="text-right">${vx.comisionChofer}</td>
                    <td class="text-right table-warning font-weight-bold">${saldo}</td>
                </tr>`;
            }else{//es registroCaja

                saldo = saldo + vx.comisionChofer;

                tbody += `<tr>
                    <td>
                        <small>${fechas.parse2(vx.fecha, "ARG_FECHA_HORA")}</small>
                    </td>
                    <td>${vx.detalle}</td>
                    <td class="text-right">${vx.monto}</td>
                    <td class="text-right table-warning font-weight-bold">${saldo}</td>
                </tr>`;
            }
        })
        $("#tabla-cta-cte tbody").html(tbody);
    }
}