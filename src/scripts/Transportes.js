class Transportes{
    constructor(initHTML = false){
        this.list = [];
        this.bandera = false;
        this.crud = null;
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='transportes'] a").addClass("active")
        this.list = (await $.get({url: "/transportes/get-list"})).list;
        
        this.crud = new SimpleCRUD({
            list: this.list,
            searchProps: ["nombre", "marcaModelo"],
            structure: [
                {
                    label: "Nombre",
                    prop: "nombre",
                },
                {
                    label: "Marca/Modelo",
                    prop: "marcaModelo",
                },
                {
                    label: "Activo",
                    prop: "activo",
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
            $("[name='activo']").val(1);
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

        $("[name='imprimir']").click(ev=>{
            modal.mensaje("Para imprimir haga DOBLE CLICK desde el 1er registro que quiere imprimir");
        })

        G.removeCinta();
    }
    async onSave(){
        try{
            let data = this.crud.getDataToSave();
            if(data.nombre.length < 3) throw "Nombre no válido";
            if(data.dominio.length < 3) throw "Dominio no válido";
            if(data.marcaModelo.length < 3) throw "Marca/Modelo no válido";
            if(data.anio < 2000 || data.anio > 2035) throw "Año no válido";
            if( !parseInt(data.proximoService) ) throw "Próximo service no válido";
            data.activo = Number(data.activo) === 1;
    
            let ret = await $.post({
                url: "/transportes/save",
                data: data
            })

            if(data._action == "new"){
                ret.transporte._action = data._action;
                this.crud.afterSave(ret.transporte);
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
            let ret = await $.get({url: `/vencimientos/find?model=transporte&oid=${this.crud.element._id}`})
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
                    model: "transporte",
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
        let ret = await $.get({ url: "/viajes/get-viajes/transporte/" + this.crud.element._id });
        let tbody = "";
        ret.list.forEach(vx=>{
            let ee = "";
            if(vx.estado === 1) ee = `<span class='badge badge-warning'>Creado</span>`;
            else if(vx.estado === 2) ee = `<span class='badge badge-warning'>Viajando</span>`;
            else if(vx.estado === 3) ee = `<span class='badge badge-success'>Concretado</span>`;
            else if(vx.estado === 4) ee = `<span class='badge badge-danger'>Cancelado</span>`;

            let _cobrado = `<span class='badge badge-info'>No</span>`;
            if(vx.cobrado) _cobrado = `<span class='badge badge-success'>Si</span>`;

            let _abonado = `<span class='badge badge-info'>No</span>`;
            if(vx.abonado) _abonado = `<span class='badge badge-success'>Si</span>`;

            tbody += `<tr _id="${vx._id}">
                <td>
                    <span class="badge badge-info">${vx.numero}</span>
                </td>
                <td>
                    <small>${fechas.parse2(vx.fechaPartida, "ARG_FECHA_HORA")}</small>
                </td>
                <td>${vx.origen}</td>
                <td>${vx.destino}</td>
                <td class="text-right">${ee}</td>
            </tr>`;
        });
        $("#tabla-viajes tbody").html(tbody);

        $("#tabla-cta-cte tbody tr").dblclick(async ev=>{
            let _id= $(ev.currentTarget).attr("_id");

            let clon = $("#tabla-cta-cte").parent().clone();
            let encontro = false;
            clon.find("tbody tr").each((ind, rx)=>{
                if( $(rx).attr("_id") == _id ) encontro = true;
                if(!encontro) $(rx).addClass("d-none")
            });
            clon.find("tfoot").remove();

            let encabezado= `<h3>RESUMEN TRANSPORTE -> ${this.crud.element.nombre}</h3>`

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
}