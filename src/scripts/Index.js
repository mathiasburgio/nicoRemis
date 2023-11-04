class Index{
    constructor(initHTML = false){
        this.list = [];
        this.calendario = null;
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='inicio'] a").addClass("active")
        this.vencimientos = (await $.get({ url: "/vencimientos/get-all" }));
        this.serviceTransportes = (await $.get({ url: "/transportes/get-list" }));
        
        this.vencimientos = this.vencimientos.result;
        this.serviceTransportes = this.serviceTransportes.list;
        
        this.listarVencimientos();
        this.listarServiceTransportes();

        let objAhora = fechas.parse({val: new Date()})
        
        $("[name='mes']").val(objAhora.anio + "-" + objAhora.mes);
        $("[name='mes']").change(ev=>{
            let v = $(ev.currentTarget).val();
            if(!v) return;
            const anio = v.split("-")[0];
            const mes = v.split("-")[1];
            this.listarViajes(anio, mes);
        }).change();

        /* this.calendario = new FullCalendar.Calendar($("#calendario")[0], {

            locale: "es",
            events: [
                { title: 'Meeting', start: new Date() }
            ],
            eventClick: e => console.log("ev1", e),
            datesSet: e => console.log("ev2",e),
            eventRender: (info) => console.log(info)
        })*/  

        $("[name='configuracion']").click(ev=>this.modalConfigurar());


        G.removeCinta(()=>{
            //this.calendario.render(); // Renderizar el calendario
        });       
    }
    listarVencimientos(){
        let tbody = "";
        this.vencimientos.forEach(tx=>{
            if(tx.activo){
                tbody += `<tr>
                    <td>${tx.model} => ${tx.nombreReferencia}</td>
                    <td>${tx.nombre}</td>
                    <td class="text-right">${fechas.parse2(tx.fecha, "ARG_FECHA")}</td>
                </tr>`;
            }
        });
        $("#tabla-vencimientos tbody").html(tbody);
    }
    listarServiceTransportes(){
        let tbody = "";
        this.serviceTransportes.forEach(tx=>{
            if(tx.activo && tx.eliminado == false){
                tbody += `<tr>
                    <td>${tx.nombre}</td>
                    <td class="text-right">${tx.proximoService}</td>
                </tr>`;
            }
        });
        $("#tabla-services tbody").html(tbody);
    }
    async listarViajes(anio, mes){
        this.viajes = (await $.get({ url: "/viajes/get-month/" + anio + "/" + mes })).result;
        let tbody = "";
        this.viajes.forEach(vx=>{
            let ee = "";
            if(vx.estado === 1) ee = `<span class='badge badge-warning'>Creado</span>`;
            else if(vx.estado === 2) ee = `<span class='badge badge-warning'>Viajando</span>`;
            else if(vx.estado === 3) ee = `<span class='badge badge-success'>Concretado</span>`;
            else if(vx.estado === 4) ee = `<span class='badge badge-danger'>Cancelado</span>`;
            tbody += `<tr>
                <td>
                    <span class="badge badge-info">${vx.numero}</span>
                </td>
                <td>
                    <small>${fechas.parse2(vx.fechaPartida, "ARG_FECHA_HORA")}</small>
                </td>
                <td>${vx.origen}</td>
                <td>${vx.destino}</td>
                <td class="text-right">${ee}</td>
                <td class="text-right">
                    <span class="badge badge-info">${vx.cobrado ? "Si" : "No"}</span>
                </td>
                <td class="text-right">
                    <span class="badge badge-info">${vx.abonado ? "Si" : "No"}</span>
                </td>
            </tr>`;
        });
        $("#tabla-viajes tbody").html(tbody);
    }
    async modalConfigurar(){
        
        let foo = $("#modal_configuracion").html();
        modal.mostrar({
            titulo: "Configuración",
            cuerpo: foo,
            tamano: "modal-lg",
            botones: "volver"
        })

        try{
            let ret = await $.get({url: "/get-conf"});
            if(ret.status && ret.conf){
                let conf = JSON.parse(ret.conf);
                for(let prop in conf){
                    if(prop == "path-mongodump") $("#modal [name='valor']:eq(0)").val(conf[prop]);
                    else if(prop == "path-backup") $("#modal [name='valor']:eq(1)").val(conf[prop]);
                    else{
                        let par = `<div class="col-4 my-2">
                                        <input type="text" name="llave" class="form-control" value="${prop}">
                                    </div>
                                    <div class="col-8 my-2">
                                        <input type="text" name="valor" class="form-control" value="${conf[prop]}">
                                    </div>`;
                        $("#modal .lista").append(par);
                    }
                }
            }    
        }catch(err){
            console.log(err);
        }
        
        $("#modal [name='agregar_prop']").click(ev=>{
            let par = `<div class="col-4 my-2">
                        <input type="text" name="llave" class="form-control" placeholder="Llave">
                    </div>
                    <div class="col-8 my-2">
                        <input type="text" name="valor" class="form-control" placeholder="Valor">
                    </div>`;
            $("#modal .lista").append(par);
        })
        $("#modal [name='guardar']").click(async ev=>{
            let toSave = {};
            $("#modal [name='llave']").each((ind, ev)=>{
                let l = $(ev).val();
                let $v = $("#modal [name='valor']:eq(" + ind + ")");
                let v = $v.val();
                if(l && v) toSave[l] = v;
            });
            
            let ret2 = await $.post({
                url: "/set-conf",
                data: { conf: JSON.stringify(toSave) }
            });
            console.log(ret2);
            if(ret2.status === 1){
                G._playSound({message: "Configuración guardada"})
                modal.ocultar();
            }
        })
    }
}