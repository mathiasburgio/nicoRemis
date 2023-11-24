class Combustible{
    constructor(initHTML = false){
        this.list = [];
        this.transporteActual = null;
        this.registros = null;
        this.tipos = ["Gasoil caro", "Gasoil barato", "Nafta cara", "Nafta barata"];
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='combustible'] a").addClass("active")
        let retTransporte = await $.get({url: "/transportes/get-list"});
        console.log(retTransporte);
        this.list = retTransporte.list;
        
        $("[name='agregar_registro']").click(ev=>{
            if(!this.transporteActual){ modal.mensaje("Para realizar esta acción debe seleccionar un transporte"); return; }
            this.agregarRegistro();
        });
        this.listarTransportes();
        
       G.removeCinta();
    }
    listarTransportes(){
        $("#tabla-registros tbody").html("");//limpio tabla registros
        this.transporteActual = null;
        this.registros = null;

        let tbody = "";
        this.list.forEach(cx=>{
            tbody += `<tr _id="${cx._id}">
                <td>${cx.nombre}</td>
            </tr>`
        })
        $("#tabla-transportes tbody").html(tbody);

        $("#tabla-transportes tbody tr").click(async ev=>{
            ev.stopPropagation();
            let ele =  $(ev.currentTarget);
            let row = ele;
            let _id = row.attr("_id");
            this.transporteActual = this.list.find(c=>c._id === _id);
            $("table:eq(0) tbody tr").removeClass("table-info");
            row.addClass("table-info");
            this.registros = (await $.get({url: "/combustible/get-list/" + _id})).list;
            this.listarRegistros();
        });
    }
    listarRegistros(){
        let tbody = "";
        this.registros.forEach(rx=>{
            tbody += `<tr>
                <td><small>${fechas.parse2(rx.fecha, "ARG_FECHA_HORA")}</small></td>
                <td class="text-right"><span class='badge badge-info'>${this.tipos[rx.tipo]}</span></td>
                <td class="text-right">${rx.litros}Lts</td>
                <td class="text-right">$${rx.monto}</td>
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

        $("#modal [name='transporte']").val(this.transporteActual.nombre);

        $("#modal [name='registrar']").click(async ev=>{
            let ele = $(ev.currentTarget);
            let cx = $("#modal [name='chofer']").val();
            let data = {
                tid: this.transporteActual._id,
                cid: null,
                tipo: Number($("#modal [name='tipo']").val()),
                litros: Number($("#modal [name='litros']").val()),
                monto: Number($("#modal [name='monto']").val()),
            };
            try{
                if(data.tipo < 0) throw "Tipo de combustible no válido.";
                if(data.litros < 0) throw "Litros no válido.";
                if(data.monto < 0) throw "Monto no válido.";


                let ret = await $.post({
                    url: "/combustible/save",
                    data: data
                })
                console.log(ret);
                this.registros.push(ret.registro);
                this.listarRegistros();
                modal.ocultar();
            }catch(err){
                modal.addPopover({ querySelector: ele, message: err.toString() });
            }
        })
    }
}