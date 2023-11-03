class Resumen{
    constructor(initHTML = false){
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='resumen'] a").addClass("active")
        G.removeCinta();
    }
}