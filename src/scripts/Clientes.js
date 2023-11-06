class Clientes{
    constructor(initHTML = false){
        this.list = [];
        this.cajas = [];
        this.bandera = false;
        this.crud = null;
        this.registrosViajes = [];
        this.registrosAbonosViajes = [];
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='clientes'] a").addClass("active")
        let _clientes = await $.get({url: "/clientes/get-list"});
        this.cajas = (await $.get({url: "/cajas/get-list?as=array"})).list;
        /* _clientes.list.forEach(lx=>{
            lx.saldo = _clientes.saldos[lx._id] || 0;
        }); */
        this.list = _clientes.list;

        this.crud = new SimpleCRUD({
            list: this.list,
            searchProps: ["nombre", "telefono"],
            structure: [
                {
                    label: "Nombre",
                    prop: "nombre",
                    width: "calc(100% - 100px)"
                },
                /* {
                    label: "Saldo",
                    prop: "saldo",
                    right: true,
                    fn: (e,f) =>{
                        return `<span class="badge badge-${e > 0 ? "danger" : "success"}">${e}</span>`
                    }
                } */
            ],
            afterSelect: e =>{
                this.listarCtaCte();
            }
        });
        this.crud.setTable($("#container-main-table"));
        this.crud.inicialize("mongodb");

        $("[crud='btNew']").click(ev=>{
            this.crud.onNew();
        })

        $("[crud='btModify']").click(async ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un cliente para realizar esta acción"); return; }
            this.crud.onModify();
        });

        $("[crud='btDelete']").click(ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un cliente para realizar esta acción"); return; }
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

        $("[name='cobrar_viajes']").click(ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un cliente para realizar esta acción"); return; }
            this.cobrarCta();
        });

        G.removeCinta();
    }
    async onSave(){
        try{
            let data = this.crud.getDataToSave();
            if(data.nombre.length < 3) throw "Nombre no válido";
            if(data.telefono.length < 3) throw "Teléfono no válido";
    
            let ret = await $.post({
                url: "/clientes/save",
                data: data
            })

            if(data._action == "new"){
                ret.cliente._action = data._action;
                this.crud.afterSave(ret.cliente);
            }else{
                this.crud.afterSave(data);
            }
            this.crud.search("");
            
            G._playSound({message: "Guardado", icon: "success", title: "..."});
        }catch(err){
            modal.mensaje(err.toString());
        }
    }
    async listarCtaCte(){
        this.registrosViajes = (await $.get({ url: "/viajes/get-viajes/cliente/" + this.crud.element._id })).list;
        this.registrosAbonosViajes = (await $.get({ url: "/cajas/cliente/" + this.crud.element._id })).result;

        let saldo = 0;
        let tbody = "";
        this.registrosViajes.concat(this.registrosAbonosViajes).sort((a, b)=>{
            let f1 = (a.fechaPartida ? a.fechaPartida : a.fecha);
            let f2 = (b.fechaPartida ? b.fechaPartida : b.fecha);
            if(f1 > f2) return 1;
            else if(f1 < f2) return -1;
            return 0;
        }).forEach(vx=>{
            if( vx.valorViaje){//es viaje
                if( vx.estado === 3 ){//solo viajes concretados
                    saldo = saldo + vx.valorViaje;
                        
                    tbody += `<tr>
                        <td>
                            <small>${fechas.parse2(vx.fechaPartida, "ARG_FECHA_HORA")}</small>
                        </td>
                        <td>
                            Viaje #${vx.numero} dest. ${vx.destino}
                        </td>
                        <td class="text-right">${vx.valorViaje}</td>
                        <td class="text-right table-warning font-weight-bold">${saldo}</td>
                    </tr>`;
                }
            }else{//es registroCaja

                saldo = saldo + vx.monto;

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
    async cobrarCta(){
        let foo = $("#modal_cobrar_viajes").html();
        modal.mostrar({
            titulo: "Cobrar",
            cuerpo: foo,
            tamano: "modal-lg",
            botones: "volver"
        });

        let tbody = "";
        this.registrosViajes.forEach(vx=>{
            if(vx.estado == 3 && vx.cobrado == false){
                tbody += `<tr _id="${vx._id}">
                    <td><i class="fas fa-square"></i></td>
                    <td><small>${fechas.parse2(vx.fecha, "ARG_FECHA_HORA")}</small></td>
                    <td>${vx.origen}</td>
                    <td>${vx.destino}</td>
                    <td class="text-right">${vx.valorViaje}</td>
                </tr>`
            }
        });
        $("#modal table tbody").html(tbody);

        $("#modal [name='caja']").html( `<option value="0">-SELECCIONAR-</option>` + G.getOptions({arr: this.cajas, value: "_id", label: "nombre"}) );

        let total = 0;
        let viajesCobrar = [];
        $("#modal tbody tr").click(ev=>{
            let row = $(ev.currentTarget);
            let i = row.find("i:eq(0)");
            let _id = row.attr("_id");
            if( i.hasClass("fa-square-check") ){
                i.removeClass("fa-square-check").addClass("fa-square");
                viajesCobrar = viajesCobrar.filter(v=>v._id == _id);
            }else{
                i.addClass("fa-square-check").removeClass("fa-square");
                viajesCobrar.push(this.registrosViajes.find(v=>v._id == _id));
            }
            
            total = viajesCobrar.reduce((acc, cur)=>{
                acc += cur.valorViaje;
                return acc;
            },0)
            $("#modal [name='total']").val(total);
        });

        $("#modal [name='cobrar']").click(async ev=>{
            let ele = $(ev.currentTarget);

            if(viajesCobrar.length <= 0){
                modal.addAsyncPopover({querySelector: ele, message: "Seleccione uno o mas viajes para cobrar"});
                return;
            }
            
            if(total <= 0){
                modal.addAsyncPopover({querySelector: ele, message: "El monto a cobrar no puede ser menor o igual a cero"});
                return;
            }

            let cid = $("#modal [name='caja']").val();
            if(cid == "0"){ 
                modal.addAsyncPopover({querySelector: ele, message: "Caja no válida"});
                return;
            }

            let aux = await modal.addAsyncPopover({querySelector: ele, type: "yesno", message: "¿Confirma el cobro?"})
            if(!aux) return;


            let ret = await $.post({
                url: "/cajas/add-registry",
                data: {
                    detalle: "Cobro de viajes",
                    monto: total,
                    cid: cid,
                    model: "cliente",
                    modelOid: this.crud.element._id,
                    viajes: JSON.stringify( viajesCobrar.map(v=>v._id) )
                }
            });

            for(let v in viajesCobrar){
                await $.post({
                    url: "/viajes/set-pagado-cobrado",
                    data: {
                        vid: viajesCobrar[v]._id,
                        prop: "cobrado",
                        cobrado: true
                    }
                })
            }
            this.listarCtaCte();
            modal.ocultar();
        })
    }
}