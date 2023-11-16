class Choferes{
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
        $("[nav='choferes'] a").addClass("active")
        this.list = (await $.get({url: "/choferes/get-list"})).list;
        this.cajas = (await $.get({url: "/cajas/get-list?as=array"})).list;
        
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
                this.listarCtaCte();
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

        $("[name='abonar_viajes']").click(ev=>{
            if (typeof this.crud.element == "undefined") { modal.mensaje("Seleccione un chofer para realizar esta acción"); return; }
            this.abonarCta();
        });

        $("[name='imprimir']").click(ev=>{
            modal.mensaje("Para imprimir haga DOBLE CLICK desde el 1er registro que quiere imprimir");
        })

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
    async listarCtaCte(){
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
            if( vx.valorViaje){//es viaje
                if( vx.estado === 3 ){//solo viajes concretados
                    saldo = saldo + vx.comisionChofer;
                        
                    tbody += `<tr _id="${vx._id}">
                        <td>
                            <small>${fechas.parse2(vx.fechaPartida, "ARG_FECHA_HORA")}</small>
                        </td>
                        <td>
                            Viaje #${vx.numero} dest. ${vx.destino}
                        </td>
                        <td class="text-right">${vx.comisionChofer}</td>
                        <td class="text-right table-warning font-weight-bold">${saldo}</td>
                    </tr>`;
                }
            }else{//es registroCaja
                vx.monto = vx.monto * -1;
                saldo = saldo + vx.monto;

                tbody += `<tr _id="${vx._id}">
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

        $("#tabla-cta-cte tbody tr").dblclick(async ev=>{
            let _id= $(ev.currentTarget).attr("_id");

            let clon = $("#tabla-cta-cte").parent().clone();
            let encontro = false;
            clon.find("tbody tr").each((ind, rx)=>{
                if( $(rx).attr("_id") == _id ) encontro = true;
                if(!encontro) $(rx).addClass("d-none")
            });
            clon.find("tfoot").remove();

            let encabezado= `<h3>RESUMEN CHOFER -> ${this.crud.element.nombre}</h3>`

            let response = await $.post({
                url: "/exportar-documento",
                data: {
                    contenido: encabezado + clon.html()
                }
            })
            let response2 = await $.post({
                url: "/imprimir",
                data: {
                    parametros: "?imprimir=true&cerrar=true"
                }
            })
        });
    }
    async abonarCta(){
        let foo = $("#modal_abonar_viajes").html();
        modal.mostrar({
            titulo: "Abonar",
            cuerpo: foo,
            tamano: "modal-lg",
            botones: "volver"
        });

        let tbody = "";
        this.registrosViajes.forEach(vx=>{
            if(vx.estado == 3 && vx.pagado == false){
                tbody += `<tr _id="${vx._id}">
                    <td><i class="fas fa-square"></i></td>
                    <td><small>${fechas.parse2(vx.fecha, "ARG_FECHA_HORA")}</small></td>
                    <td>${vx.origen}</td>
                    <td>${vx.destino}</td>
                    <td class="text-right">${vx.comisionChofer}</td>
                </tr>`
            }
        });
        $("#modal table tbody").html(tbody);

        $("#modal [name='caja']").html( `<option value="0">-SELECCIONAR-</option>` + G.getOptions({arr: this.cajas, value: "_id", label: "nombre"}) );

        let total = 0;
        let viajesAbonar = [];
        $("#modal tbody tr").click(ev=>{
            let row = $(ev.currentTarget);
            let i = row.find("i:eq(0)");
            let _id = row.attr("_id");
            if( i.hasClass("fa-square-check") ){
                i.removeClass("fa-square-check").addClass("fa-square");
                viajesAbonar = viajesAbonar.filter(v=>v._id == _id);
            }else{
                i.addClass("fa-square-check").removeClass("fa-square");
                viajesAbonar.push(this.registrosViajes.find(v=>v._id == _id));
            }
            
            total = viajesAbonar.reduce((acc, cur)=>{
                acc += cur.comisionChofer;
                return acc;
            },0)
            $("#modal [name='total']").val(total);
        });

        $("#modal [name='abonar']").click(async ev=>{
            let ele = $(ev.currentTarget);

            if(viajesAbonar.length <= 0){
                modal.addAsyncPopover({querySelector: ele, message: "Seleccione uno o mas viajes para abonar"});
                return;
            }
            
            if(total <= 0){
                modal.addAsyncPopover({querySelector: ele, message: "El monto a abonar no puede ser menor o igual a cero"});
                return;
            }

            let cid = $("#modal [name='caja']").val();
            if(cid == "0"){ 
                modal.addAsyncPopover({querySelector: ele, message: "Caja no válida"});
                return;
            }

            let aux = await modal.addAsyncPopover({querySelector: ele, type: "yesno", message: "¿Confirma el pago?"})
            if(!aux) return;


            let ret = await $.post({
                url: "/cajas/add-registry",
                data: {
                    detalle: "Abonar de viajes",
                    monto: total,
                    cid: cid,
                    model: "chofer",
                    modelOid: this.crud.element._id,
                    viajes: JSON.stringify( viajesAbonar.map(v=>v._id) )
                }
            });

            for(let v in viajesAbonar){
                await $.post({
                    url: "/viajes/set-pagado-cobrado",
                    data: {
                        vid: viajesAbonar[v]._id,
                        prop: "pagado",
                        pagado: true
                    }
                })
            }
            this.listarCtaCte();
            modal.ocultar();
        })
    }
}