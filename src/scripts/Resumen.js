class Resumen{
    constructor(initHTML = false){
        this.viajes = [];
        this.registrosCajas = [];
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='resumen'] a").addClass("active")
        let objAhora = fechas.parse({val: new Date()})
        
        $("[name='mes']").val(objAhora.anio + "-" + objAhora.mes);
        $("[name='mes']").change(async ev=>{
            let v = $(ev.currentTarget).val();
            if(!v) return;
            const anio = v.split("-")[0];
            const mes = v.split("-")[1];
            this.viajes = (await $.get({ url: "/viajes/get-month/" + anio + "/" + mes })).result;
            this.registrosCajas =  (await $.get({ url: "/cajas/get-month/" + anio + "/" + mes })).result;
            console.log(this.viajes, this.registrosCajas);
        });
        G.removeCinta();
    }
}