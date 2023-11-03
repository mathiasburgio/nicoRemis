class Imagine{
    constructor(){
        this.doms = null;
    }
    domUploader({dom, width="130px", height="130px", resizeOnChange=false, callback=null, imgDefault=""}){
        this.doms = dom;
        let foo = `<div class="border" style="width:${width}; height:${height}; position:relative; overflow:hidden">
                        <input type="file" style="position:absolute; top: -100px;">
                        <div class="row text-center cp pt-1 px-1">
                            <div class="col">
                                <button class="btn btn-primary btn-sm btn-block" name="imagine-bt-subir">📸</button>
                            </div>
                            <div class="col">
                                <button class="btn btn-danger btn-sm btn-block" name="imagine-bt-quitar">✖</button>
                            </div>
                        </div>
                        <div class="text-center p-2" style="width:${width}; height: calc(${height} - 31px);">
                            <img style="max-width:100%; max-height:100%">
                        </div>
                    </div>`;
        dom.html(foo);

        $("[name='imagine-bt-subir']").unbind("click");
        $("[name='imagine-bt-subir']").click(ev=>{
            let px = $(ev.currentTarget).parent().parent().parent();
            let inp = px.find("input");
            inp.click();
        });
        $("[name='imagine-bt-quitar']").unbind("click");
        $("[name='imagine-bt-quitar']").click(ev=>{
            let px = $(ev.currentTarget).parent().parent().parent();
            px.find("img").prop("src", imgDefault);
        });

        dom.find("[type='file']").unbind("change");
        dom.find("[type='file']").change((ev)=>{
            let inp = $(ev.currentTarget);
            let px = $(ev.currentTarget).parent();
            let f = inp[0].files;
            if(f.length === 1){
                let file = f[0];
                console.lo
                if(file.type == "image/jpeg" || file.type == "image/jpg" || file.type == "image/png" || file.type == "image/gif" || file.type == "image/webp"){
                    var reader = new FileReader();
                    reader.onload = (e)=> {
                        px.find("img").attr("src", e.target.result);
                        
                        if(file.type == "image/gif" || file.type == "image/webp"){ callback(file, px); return;}

                        if(resizeOnChange){
                            this.resize({val: file})
                            .then(ret=>{
                                if(callback){ callback(ret, px); }
                            })
                            .catch(ret=>{
                                if(callback){ callback(false, px); }
                            });
                        }else{
                            if(callback){ callback(e.target.result, px); }
                        }
                    }
                    reader.readAsDataURL(file);
                } 
            }
        });

        //pongo en todo las imagenes default
        $("[name='imagine-bt-quitar']").click();
    }
    getValues(dom){
        if(dom){
            return dom.find("img").attr("src").split("/").at(-1);
        }else{
            let ret = [];
            this.doms.each((index, ev)=>{
                ret.push( $(ev).find("img").attr("src").split("/").at(-1) );
            });
            return ret;
        }
    }
    setValues(dom, src){
        if(dom){
            dom.find("img").attr("src", src);
        }else{
            if(Array.isArray(src) == false){
                src = [src];
            }
            this.doms.each((index, ev)=>{
                if(src[index]){
                    $(ev).find("img").attr("src", src[index]);
                }
            });
        }
    }
    clearValues(){
        this.doms.each((index, ev)=>{
            $(ev).find("[name='imagine-bt-quitar']").click();
        });
    }
    setEnabled(e){
        if(this.doms != null){
            this.doms.find("button").prop("disabled", !e);
        }
    }
    resize({val, maxWidth=600, maxHeight=600, maxSize= (1024 * 1024 * 10), debug = false, retType=null}){
        return new Promise(async (resolve, reject)=>{
            try{
                let _file = null;
                let _base64 = null;
                let _input = null;
                let _type = null;
                let _ext = null;
                let _presize = -1;
                if(typeof val === "string"){//es base64
                    _file = this.base64ToFile(val);
                    _base64 = val;
                    _input = "base64";
                }else{
                    _file = val;
                    _base64 = await this.fileToBase64(val);
                    _input = "file";
                }
                _type = _file.type;
                _ext = _type.substring( _type.lastIndexOf("/") + 1);
                _presize = _file.size;

                if(_file.size > maxSize){throw "El archivo pesa más de " + (1024 * 1024 * 10) + "mb."}

                let canvas = document.createElement("canvas");
                let ctx = canvas.getContext('2d');

                let img = new Image();
                img.onload = () => {
                    if(img.width > maxWidth){
                        let aux = img.height * maxWidth / img.width;
                        canvas.height = aux;
                        canvas.width = maxWidth;
                        ctx.drawImage(img, 0, 0, maxWidth, aux);
                    }else if(img.height > maxHeight){
                        let aux = img.width * maxHeight / img.height;
                        canvas.height = maxHeight;
                        canvas.width = aux;
                        ctx.drawImage(img, 0, 0, aux, maxHeight);
                    }else{
                        canvas.height = img.height;
                        canvas.width = img.width;
                        ctx.drawImage(img, 0, 0, img.width, img.height);
                    }

                    let retBase64 = ctx.canvas.toDataURL(_type);
                    let retFile = this.base64ToFile(retBase64);
                    
                    if(debug){
                        console.log({
                            _file,
                            _base64,
                            _input,
                            _type,
                            _ext,
                            _presize,
                            _possize: retFile.size,
                            retBase64, 
                            retFile, 
                        })
                    }

                    if(retType == "file"){
                        resolve( retFile );
                    }else if(retType == "base64"){
                        resolve( retBase64 );
                    }else{
                        if(_input == "file"){
                            resolve( retFile );
                        }else{
                            resolve( retBase64 );
                        }
                    }
                }
                img.src = _base64;
            }catch(err){
                reject(err);
            }
        });
    }
    uploadFile({nombre, archivo, aux = null, url = "/upload"}){
        return new Promise(resolve=>{
            let fd = new FormData();
            fd.append(nombre, archivo);
            if(typeof aux != null){
                for(let prop in aux){
                    fd.append(prop, aux[prop]);
                }
            }
            $.post({
                url: url,
                data: fd,
                cache: false,
                contentType: false,
                processData: false,
            }).always(ret=>{
                console.log(ret);
                resolve( ret.files[0].newName );
            });
        });
    }
    base64ToFile(base64){
        try{
            let ext = base64.split(";")[0].split("/").at(-1);
            let arr = base64.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while(n--){
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], "image." + ext, {type:mime});
        }catch(err){
            console.error(err);
        }
    }
    fileToBase64(file){
        return new Promise(resolve=>{
            let reader = new FileReader();
            
            reader.onload = function () {
                resolve(reader.result);
            };

            reader.onerror = function (error) {
                console.log('Error: ', error);
                resolve(undefined);
            };
            
            reader.readAsDataURL(file);
        });
    }
    URItoDataURL(src){
        return new Promise((resolve)=>{
			let img = new Image();
			img.onload = () =>{
				let canvas = document.createElement('canvas');
				let ctx = canvas.getContext('2d');
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0);
				resolve(canvas.toDataURL(), img.width, img.height);
			}
			img.src = src;
		});
    }
}