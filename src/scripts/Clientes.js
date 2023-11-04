class Clientes{
    constructor(initHTML = false){
        this.list = [];
        this.bandera = false;
        this.crud = null;
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='clientes'] a").addClass("active")
        let _clientes = await $.get({url: "/clientes/get-list"});
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
            ]
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
}