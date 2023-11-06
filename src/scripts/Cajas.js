class Cajas{
    constructor(initHTML = false){
        this.list = [];
        this.cajaActual = null;
        this.registros = null;
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='cajas'] a").addClass("active")
        let retCajas = await $.get({url: "/cajas/get-list?as=array"});
        console.log(retCajas);
        this.list = retCajas.list;

        $("[name='nueva_caja']").click(ev=>{
            this.nuevaCaja();
        });
        $("[name='agregar_registro']").click(ev=>{
            if(!this.cajaActual){ modal.mensaje("Para realizar esta acción debe seleccionar una caja"); return; }
            this.agregarRegistro();
        });
        this.listarCajas();
        
       G.removeCinta();
    }
    async nuevaCaja(){
        let aux = await modal.prompt({label: "Nombre"});
        if(aux && aux.length > 3){
            let ret = await $.post({
                url: "/cajas/save",
                data: {
                    _action: "new",
                    nombre: aux,
                    activa: true,
                }
            })
            ret.caja.saldo = 0;
            this.list.push(ret.caja);
            this.listarCajas();
            G._playSound({message: "Caja guardada"});
        }
    }
    listarCajas(){
        $("#tabla-registros tbody").html("");//limpio tabla registros
        this.cajaActual = null;
        this.registros = null;

        let tbody = "";
        this.list.forEach(cx=>{
            tbody += `<tr _id="${cx._id}">
                <td>${cx.nombre}</td>
                <td class='text-right'>
                    <span class="badge badge-info">${cx.saldo}</span>
                </td>
                <td class='text-right'>
                    <button class="btn btn-primary btn-flat btn-sm" name="modificar" style='width:30px'><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger btn-flat btn-sm" name="eliminar" style='width:30px'><i class="fas fa-times"></i></button>
                </td>
            </tr>`
        })
        $("#tabla-cajas tbody").html(tbody);

        $("#tabla-cajas tbody [name='modificar']").click(async ev=>{
            ev.stopPropagation();
            let ele =  $(ev.currentTarget);
            let row = ele.parent().parent();
            let _id = row.attr("_id");
            let caja = this.list.find(c=>c._id === _id);
            let aux = await modal.prompt({querySelector: ele, label: "Nombre", value: caja.nombre});
            if(aux && aux.length > 3){
                let r = await $.post({
                    url: "/cajas/save",
                    data: {
                        _action: "modify",
                        _id: caja._id,
                        nombre: aux,
                        activa: true,
                        eliminada: false
                    }
                });
                console.log(r);
                caja.nombre = aux;
                this.listarCajas();
                G._playSound({message: "Caja guardada"});
            }
        });
        $("#tabla-cajas tbody [name='eliminar']").click(async ev=>{
            ev.stopPropagation();
            let ele =  $(ev.currentTarget);
            let row = ele.parent().parent();
            let _id = row.attr("_id");
            let caja = this.list.find(c=>c._id === _id);
            let cajaI = this.list.findIndex(c=>c._id === _id);
            let ret = await modal.pregunta(`Seguro de borrar la caja <b>${caja.nombre}</b>`);
            if(ret){
                await $.post({
                    url: "/cajas/save",
                    data: {
                        _action: "modify",
                        _id: caja._id,
                        nombre: caja.nombre,
                        activa: true,
                        eliminada: true
                    }
                });
                this.list.splice(cajaI, 1);
                this.listarCajas();
                G._playSound({message: "Caja eliminada"});
            }
        });
        $("#tabla-cajas tbody tr").click(async ev=>{
            ev.stopPropagation();
            let ele =  $(ev.currentTarget);
            let row = ele;
            let _id = row.attr("_id");
            let caja = this.list.find(c=>c._id === _id);
            this.cajaActual = caja;
            $("table:eq(0) tbody tr").removeClass("table-info");
            row.addClass("table-info");
            this.registros = (await $.get({url: "/cajas/get-registries/" + _id})).result;
            this.listarRegistros();
        });
    }
    listarRegistros(){
        let saldo = 0;
        let tbody = "";
        this.registros.forEach(rx=>{
            if(rx.model == "chofer") rx.monto = rx.monto * -1;//resto pago a choferes
            saldo = G.decimales(saldo + rx.monto);
            tbody += `<tr>
                <td><small>${fechas.parse2(rx.fecha, "ARG_FECHA_HORA")}</small></td>
                <td>${rx.detalle}</td>
                <td class="text-right">${rx.monto}</td>
                <td class="text-right table-info">${saldo}</td>
            </tr>`;
        });
        $("#tabla-registros tbody").html(tbody);
    }
    agregarRegistro(){
        let foo = $("#modal_agregar_registro").html();
        modal.mostrar({
            titulo: "Agregar registro",
            cuerpo: foo,
            botones: "volver"
        });

        $("#modal [name='nombre_caja']").val(this.cajaActual.nombre);

        $("#modal [name='registrar']").click(async ev=>{
            let ele = $(ev.currentTarget)
            try{
                let detalle = $("#modal [name='detalle']").val();
                let monto = G.decimales( $("#modal [name='monto']").val() );
                if(detalle.length < 3) throw "Detalle no válido";
                if(!monto) throw "Monto no válido";

                let ret = await $.post({
                    url: "/cajas/add-registry",
                    data: {
                        detalle,
                        monto,
                        cid: this.cajaActual._id,
                        model: "default",
                        viaje: 0
                    }
                })
                console.log(ret);
                this.registros.push(ret.registro);
                this.cajaActual.saldo = (this.cajaActual.saldo + monto);
                $("#tabla-cajas .table-info td:eq(1) span").html(this.cajaActual.saldo);
                this.listarRegistros();
                modal.ocultar();
            }catch(err){
                modal.addPopover({ querySelector: ele, message: err.toString() });
            }
        })
    }
}