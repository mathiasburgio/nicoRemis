class Index{
    constructor(initHTML = false){
        this.list = [];
        if(initHTML) this.initHTML();
    }
    async initHTML(){
        $("[nav='inicio'] a").addClass("active")
        //this.list = (await $.get({url: "/choferes/get-list"})).list;
        G.removeCinta();
    }
}