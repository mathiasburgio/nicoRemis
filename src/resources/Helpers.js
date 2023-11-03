class Helpers{
    constructor(setStyle = true){
        this.mobile = (window.screen.width < 1024);
        if(setStyle) this.setStyle();//NUBELAR/APP
        this.sonidos = {};
    }
    onlyAlphanumeric(str = "", noSpaces = false){
        str = ("" + str).toLowerCase().trim();
        str = str.replaceAll("á", "a");
        str = str.replaceAll("é", "e");
        str = str.replaceAll("í", "i");
        str = str.replaceAll("ó", "o");
        str = str.replaceAll("ú", "u");
        str = str.replaceAll("ñ", "n");
        str = str.replace(/[^a-z0-9 -]/gi, '').toLowerCase().trim();
        if(noSpaces){
            return str.replaceAll(" ", "-")
        }else{
            return str
        }
    }
    decimales(str, dec = 2){
        let separador_decimal = ",";
        let a = [];

        if(separador_decimal == "."){
            a = [".", ","];
        }else{
            a = [",", "."];
        }

        str = "" + str;
        str = str.replace(a[0], a[1]);
        if(str == ""){str = 0;}
        return  parseFloat( parseFloat(str).toFixed(dec) );
    }
    FD(obj){
        let fd = new FormData();
        for(let prop in obj){
            fd.append(prop, obj[prop]);
        }
        return fd;
    }
    getTextFromSelect($dom){
        return $dom[0].options[$dom[0].selectedIndex].text;
    }
    async timeout(ms){
        return new Promise(resolve=>{
            setTimeout(()=>{
                resolve(true);
            }, ms);
        });
    }
    stripTags(str){
        return str.replace(/(<([^>]+)>)/gi, "");
    }
    getOptions({arr, value, label}){
        let html = "";
        arr.forEach(px=>{
            if(typeof px == "object"){
                html += `<option value="${px[value]}">${px[label]}</option>`;
            }else{
                html += `<option value="${px}">${px}</option>`;
            }
        })
        return html;
    }
    tryJson(str){
        try{
            str = ("" + str);
            if(typeof str == "string" && str[0] === "{") return JSON.parse(str)
        }catch(err){
            return null
        }
    }
    uploadWithProgress({url, formData=null, progress=null, end=null}){
        let finalizado = false;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.upload.onprogress = e => {
            if (e.lengthComputable) {
                const percentComplete = parseInt((e.loaded / e.total) * 100);
                if(progress) progress(percentComplete);
                if(finalizado == false && percentComplete === 100){
                    finalizado = true;
                    if(end) end(true);
                }
            }
        };
        xhr.upload.addEventListener('load', function(e) {
            console.log(e)
        });
        xhr.send(formData);
    }
    createTable({arr, headers = [], props = []}){
        let tbody = "";
        arr.forEach(row=>{
            tbody += `<tr idd="${row.id || row._id}">`;
            let cc = 0;
            for(let prop of props){
                tbody += `<td _col="${cc}">${typeof prop == "function" ? prop(row) : row[prop]}</td>`;
                cc++;
            }
            tbody += `</tr>`;
        })
        if(headers.length == 0) return tbody;

        let thead = "";
        headers.forEach((hx, cc)=>{
            thead += `<th _col="${cc}">${hx}</th>`;
        });

        return `<table class="table table-sm">
            <thead class="thead-dark"><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
        </table>`
    
    }
    getParams(){
        let href = window.location.href;
        let str = href.split("?")[1].split("#")[0];
        let par = str.split("&");
        let obj = {};
        par.forEach(px=>{
            let pp = px.split("=");
            obj[pp[0]] = pp[1] || null;
        })
        return obj;
    }
    strToBd(str, withTags = false){
        try{
            if(str == null || !str){ str = ""; }
            if(!str){return str;}
            str = ("" + str);
            if(withTags == false){
                str = str.replace(/</g, "");
                str = str.replace(/>/g, "");
                str = str.replace(/%3c/g, "");
                str = str.replace(/%3e/g, "");
                str = str.replace(/%3C/g, "");
                str = str.replace(/%3E/g, "");
            }else{
                str = str.replace(/</g, "_3@@");
                str = str.replace(/>/g, "_4@@");
            }
            
            str = str.replace(/'/g, "_1@@");
            str = str.replace(/"/g, "_2@@");
            str = encodeURI(str);
            return str;
        }catch(err){
            return str;
        }
    }
    bdToStr(str, withTags = false){
        if(str == null || !str){ str = ""; }
        try{
            if(!str){return str;}
            str = ("" + str);
            str = decodeURI(str);
    
            str = str.replace(/_1@@/g, "'");
            str = str.replace(/_2@@/g, '"');
            if(withTags === true){
                str = str.replace(/_3@@/g, "<");
                str = str.replace(/_4@@/g, '>');
            }
        }catch(ex){
            console.log(str, ex);
        }
        return str;
    }
    porcentajeInverso(monto, porcentaje, restar = false){
        let aux = this.decimales(monto / (1 + (porcentaje / 100)));
        return restar ? aux : monto - aux;
    }

    //EXCLUSIVO NICO REMIS
    removeCinta(){
        setTimeout(()=>{
            $("#cinta").animate({
                left: "-100%"
            }, "fast", ()=> {
                $("#cinta").remove()
                $("#contenedor-cuerpo").removeClass("d-none");
            });
        },1200);
    }

    //EXCLUSIVO NUBELAR/APP
    setStyle(){
        if(localStorage.getItem("estilo") == "dark"){
            $("body").addClass("dark-mode")
        }
        if(localStorage.getItem("tabla-mayusculas") == "1"){
            $("body").addClass("table-uppercase")
        }
        if(localStorage.getItem("animaciones-modal") == "0"){
            $("#modal").removeClass("fade")
        }
    }
    checkAdmin(){
        try{
            if(_datos.usuarios[0] === _datos.email){
                $("[nav='usuarios']").removeClass("d-none")
                $("[nav='resumen']").removeClass("d-none")
                $("[nav='configuracion']").removeClass("d-none")
                return true;
            }
            return false;
        }catch(err){
            return false;
        }
    }
    getOptionsV1(ar, propText = "", propId = "id", seleccionar = false){
        let html = "";
        ar.forEach(item=>{
            if(typeof item == "object"){
                html += `<option value='${item[propId]}'>${item[propText]}</option>`;
            }else{
                html += `<option value='${item}'>${item}</option>`;
            }
        });
        if(seleccionar){html = `<option value="0" disabled selected>Seleccionar</option>` + html}
        return html;
    }
    cargarSonidos(){
        ["tap", "ray", "noti1", "noti2", "error"].forEach((nombre, ind)=>{
            let a = new Audio();
            a.src = `/resources/${nombre}.mp3`;
            a.volume = 0.6;
            this.sonidos[nombre] = a;
        });
    }
    playSonido(nombre){
        let s = Number(localStorage.getItem("sonidos-muteados"));
        if(s == 0) this.sonidos[nombre].cloneNode(true).play();
    }
    closeCortina(){
        $(".content-wrapper").css("display", "block")
        $("#cortina").animate({
            top: "-100vh"
        }, "fast", ()=>{
            $("#cortina").remove();
            
            /* $("html, body").css("overflow", "auto") */
        })
    }
    preventSubmit(e){
        e.preventDefault();
        return false;
    }
    saveFile(string, type = "text/plain;charset=utf-8", name = "file.txt") {
        let blob = new Blob([string], { type: "text/plain;charset=utf-8" });
        saveAs(blob, name);
    }
    setIcheck(container){
        container.find("[radio]").each((ind, ev)=>{
            let ele = $(ev);
            let attr = ele.attr("radio");
            //ele.find("input").attr("name", "radio-" + attr)
            ele.find("input").attr("id", "radio-" + attr)
            ele.find("label").attr("for", "radio-" + attr)
        })
        container.find("[checkbox]").each((ind, ev)=>{
            let ele = $(ev);
            let attr = ele.attr("checkbox");
            //ele.find("input").attr("name", "checkbox-" + attr)
            ele.find("input").attr("id", "checkbox-" + attr)
            ele.find("label").attr("for", "checkbox-" + attr)
        })
    }
    _playSound({message, icon="success", title="Mensaje"}){
        Swal.fire({
            icon: icon,
            title: title,
            text: message,
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 2000
        }) 
        this.playSonido("noti1"); 
    }
    getQRAfip(tx){
        let ret = "https://www.afip.gob.ar/fe/qr/?p=";
        let ret2 = {
            ver: 1,
            fecha: fechas.parse2(tx.fecha, "USA_FECHA"),
            cuit: tx.respuestaAfip?.FECAESolicitarResult?.FeCabResp?.Cuit,
            ptoVta: tx.solicitudAfip?.FeCAEReq?.FeCabReq?.PtoVta,
            tipoCmp: tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.CbteTipo,
            nroCmp: tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.CbteNro,
            importe: tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.ImpTotal,
            moneda: "PES",
            ctz: 1,
            tipoDocRec: tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.DocTipo,
            nroDocRec: tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.DocNro,
            tipoCodAut: "E",
            codAut: tx.respuestaAfip?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse[0]?.CAE
        };
        return ret + btoa(JSON.stringify(ret2));
    }
}