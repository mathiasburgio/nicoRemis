class Resumen{
    constructor(initHTML = false){
        this.viajes = [];
        this.registrosCajas = [];
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='resumen'] a").addClass("active")
        let objAhora = fechas.parse({val: new Date()})

        this.transportes = (await $.get({ url: "/transportes/get-list" })).list;
        this.choferes = (await $.get({ url: "/choferes/get-list" })).list;
        this.cajas = (await $.get({ url: "/cajas/get-list?as=array" })).list;
        
        $("[name='mes']").val(objAhora.anio + "-" + objAhora.mes);
        $("[name='mes']").change(async ev=>{
            let v = $(ev.currentTarget).val();
            if(!v) return;
            const anio = v.split("-")[0];
            const mes = v.split("-")[1];

            let dias = fechas.days_in_month(anio, mes);
            let optDias = `<option value='0' selected>Mes completo</option>`;
            for(let i = 1; i <= dias; i++){
                optDias += `<option value='${i}'>Día ${i}</option>`;
            }
            $("[name='dia']").html(optDias);

            this.viajes = (await $.get({ url: "/viajes/get-month/" + anio + "/" + mes })).result;
            this.registrosCajas =  (await $.get({ url: "/cajas/get-month/" + anio + "/" + mes })).result;
            console.log(this.viajes, this.registrosCajas);
            this.listarMes();
        }).change()


        $("[name='dia']").change(ev=>{
            this.listarMes();
        });

        $("[name='imprimir']").click(async ev=>{
            let response = await $.post({
                url: "/exportar-documento",
                data: {
                    contenido: $("#grilla").html()
                }
            })
            let response2 = await $.post({
                url: "/imprimir",
                data: {
                    parametros: "?imprimir=true&cerrar=true"
                }
            })
        })

        G.removeCinta();
    }
    listarMes(){
        const fecha = $("[name='mes']").val();
        const dia = Number( $("[name='dia']").val() );
        const anio = fecha.split("-")[0];
        const mes = fecha.split("-")[1];

        let linea1 = (prop, val) =>{
            return `<div class='my-1 pl-3'>
                <b>${prop}</b> <span>${val}</span>
            </div>`;
        }
        let titulo = (str) =>{
            return `<div class="titulo mt-3">${str}</div>`;
        }
        let titulo2 = (str) =>{
            return `<div class='my-1 pl-2 mt-3 h6 text-uppercase text-underline'>
                <b style="border-bottom: solid 2px #666">${str}</b>
            </div>`;
        }
        
        let previaje = JSON.parse(JSON.stringify(this.viajes));
        let precajas = JSON.parse(JSON.stringify(this.registrosCajas));
        if(dia != 0){
            previaje = previaje.filter(v=>{
                let ofx = fechas.parse({val: v.fechaPartida});
                return (Number(ofx.dia) === dia);
            })

            precajas = precajas.filter(v=>{
                let ofx = fechas.parse({val: v.fecha});
                return (Number(ofx.dia) === dia);
            })
        }


        let html = "";
        html += "<div class='text-center h3'>" + fechas.MONTH_NAME[Number(mes) -1] + " de " + anio + ( dia != 0 ? " (día " + dia + ")" : "" ) + "</div>";
        html += `<small>Impreso el ${fechas.parse2(new Date(), "ARG_FECHA_HORA")}</small>`;
        html += titulo("Viajes TOTALES");
        html += linea1("Agendados: ", previaje.length);
        html += linea1("Concretados: ", previaje.filter(v=>v.estado == 3).length);
        html += linea1("Cancelados: ", previaje.filter(v=>v.estado == 4).length);
        html += linea1("Km. recorridos: ", previaje.reduce((acc, v)=> acc + (v.estado == 3 ? v.kilometrosRecorrer : 0), 0));
        html += linea1("Ingresos brutos (cobrados): ", previaje.reduce((acc, v)=> acc + (v.cobrado ? v.valorViaje : 0), 0));

        html += titulo("Transportes");
        this.transportes.forEach(tx=>{
            let _viajes = previaje.filter(v=>v.transporte == tx._id);
            if(_viajes.length > 0){
                html += titulo2(tx.nombre);
                html += linea1("Agendados: ", _viajes.length);
                html += linea1("Concretados: ", _viajes.filter(v=>v.estado == 3).length);
                html += linea1("Cancelados: ", _viajes.filter(v=>v.estado == 4).length);
                html += linea1("Km. recorridos: ", _viajes.reduce((acc, v)=> acc + (v.estado == 3 ? v.kilometrosRecorrer : 0), 0));
                html += linea1("Ingresos brutos (cobrados): ", _viajes.reduce((acc, v)=> acc + (v.cobrado ? v.valorViaje : 0), 0));
            }
        });

        html += titulo("Choferes");
        this.choferes.forEach(tx=>{
            let _viajes = previaje.filter(v=>v.chofer == tx._id);
            if(_viajes.length > 0){
                html += titulo2(tx.nombre);
                html += linea1("Agendados: ", _viajes.length);
                html += linea1("Concretados: ", _viajes.filter(v=>v.estado == 3).length);
                html += linea1("Cancelados: ", _viajes.filter(v=>v.estado == 4).length);
                html += linea1("Km. recorridos: ", _viajes.reduce((acc, v)=> acc + (v.estado == 3 ? v.kilometrosRecorrer : 0), 0));
                html += linea1("Ingresos brutos (cobrados NICOLAS REMIS): ", _viajes.reduce((acc, v)=> acc + (v.cobrado ? v.valorViaje : 0), 0));
                html += linea1("Ganancia chofer bruta: ", _viajes.reduce((acc, v)=> acc + v.comisionChofer, 0));
            }
        });

        html += titulo("Cajas");
        this.cajas.forEach(cx=>{
            let _registroCaja = precajas.filter(v=>v.caja == cx._id);
            if(_registroCaja.length > 0){
                html += titulo2(cx.nombre);
                html += linea1("Movimientos: ", _registroCaja.length);
                html += linea1("Ingresos: ",  _registroCaja.reduce((acc, v)=> acc + (v.monto > 0 ? v.monto : 0), 0));
                html += linea1("Egresos: ",  _registroCaja.reduce((acc, v)=> acc + (v.monto < 0 ? v.monto : 0), 0));
            }
        });

        $("#grilla").html(html);
    }
}