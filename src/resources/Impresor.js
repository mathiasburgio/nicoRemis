class Impresor{
    constructor(){
        this.encabezados = [];
        this.tab = undefined;
        this.ticket = undefined;
        this.media = false;
        this.buffer_ticket = "";
    }
    ping_nubelar_pos_printer(host = "localhost"){
        let url = "http://" + host + ":9005/ping"
        return new Promise(resolve=>{
            $.get({
                url: url,
                cache: false,
                processData: false,
                timeout: 300
            }).then(ret=>{
                ret == "pong" ? resolve(true) : resolve(false);
            }).catch(err=>{
                resolve(false);
            });
        })
    }
    send_to_nubelar_pos_printer(obj, host = "localhost"){
        let url = "http://" + host + ":9005/print"
        return new Promise(resolve=>{
            let fd = new FormData();
            fd.append("data", JSON.stringify(obj));
            $.post({
                url: url,
                data: fd,
                cache: false,
                processData: false,
                timeout: 300
            }).then(ret=>{
                resolve(ret);
            }).catch(err=>{
                resolve(false);
            });
        })
    }
    justify(caracteres, left = "", right = ""){
        left = ("" + left);
        right = ("" + right);
        let margen_minimo = 1;//el margen minimo de caracteres entre left y right
        let max_left = caracteres - right.length - margen_minimo;
        if(left.length > max_left){
            let foo = left.split("");
            foo.length = max_left;
            left = foo.join("");
        }
        let vacio = [];
        vacio.length = caracteres - left.length - right.length;
        vacio.fill(" ");

        let ar = [...left.split(""), ...vacio, ...right.split("")];
        
        return ar.join("");
    }
    justify2(ar){
        let ret = "";
        ar.forEach(item=>{
            if(typeof item.length == "undefined" || !item.length){item.length = 8;}
            if(typeof item.empty == "undefined" || !item.empty){item.empty = " ";}
            if(typeof item.align == "undefined" || !item.align){item.align = "left";}
            if(typeof item.val == "undefined"){throw "Falta item.val en justify2"; }
            item.val = item.val.toString();
            if(item.val.length > item.length){ item.val = item.val.substring(0, item.length); }
            
            let ar2 = [];
            ar2.length = item.length - item.val.length;
            ar2.fill(item.empty);
            if(item.align == "left"){
                ret += item.val + ar2.join("");
            }else{
                ret += ar2.join("") + item.val;
            }
        });
        return ret;
    }
    wordWrap(text, maxLength) {
        const words = text.split(' ');
        let currentLineLength = 0;
        let result = '';
      
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
        
            if (currentLineLength + word.length <= maxLength) {
                result += word + ' ';
                currentLineLength += word.length + 1;
            } else {
                result += '\n' + word + ' ';
                currentLineLength = word.length + 1;
            }
        }
      
        return result.trim();
    }
    completeString(str, length=8, character = "0", leftToRight = true){
        str = ("" + str)
        if(str.length > length){str = str.substring(0,length); }
        let ar2 = [];
        ar2.length = length - str.length;
        ar2.fill(character.toString());
        return leftToRight ? str + ar2.join("") : ar2.join("") + str; 
    }
    pos_line({str = "", align="left", marginTop = 0, marginBottom= 0, bold=false, underline=false, condensed=false, expanded=false}){
        if(marginTop){
            this.buffer_ticket.push({fn: "NewLines", par: marginTop});
        }
        if(align == "left"){
            this.buffer_ticket.push({fn: "AlignLeft"});
        }else if(align == "center"){
            this.buffer_ticket.push({fn: "AlignCenter"});
        }else if(align == "right"){
            this.buffer_ticket.push({fn: "AlignRight"});
        }
 
        if(condensed){
            this.buffer_ticket.push({fn: "CondensedMode", par: 1}); 
        }else if(expanded){
            this.buffer_ticket.push({fn: "ExpandedMode", par: 1}); 
        }

        if(str){
            if(bold){
                this.buffer_ticket.push({fn: "BoldMode", str: str});
            }else if(underline){
                this.buffer_ticket.push({fn: "UnderlineMode", str: str});
            }else{
                this.buffer_ticket.push({fn: "Append", str: str});
            }
        }
        
        if(condensed){
            this.buffer_ticket.push({fn: "CondensedMode", par: 0}); 
        }else if(expanded){
            this.buffer_ticket.push({fn: "ExpandedMode", par: 0}); 
        }

        if(marginBottom){
            this.buffer_ticket.push({fn: "NewLines", par: marginBottom});
        }
    }
    async ticket_v1({tx, params, prePrint=null, template="/htmls/printables/ticket.html"}){
        
        //NO USAR
        return new Promise(resolve=>{
            $("#impresor").remove();
            $("body").append(`<iframe id="impresor" class="d-none" src="${template}"></iframe>`);
            this.tab = window.frames[0];
            this.tab.addEventListener('load', ()=>{
                this.buffer_ticket = [];
                let dom = $(this.tab.document);
               
                dom.find("[name='nombre']").html(params.nombre || "---");

                dom.find("[name='direccion'] span").html(params.direccion || "---");
                dom.find("[name='telefono'] span").html(params.telefono || "---");

                dom.find("[name='condicion_iva'] span").html(params.plan || "---");
                dom.find("[name='ingresosBrutos'] span").html(params.afip.ingresosBrutos || "---");
                dom.find("[name='fecha'] span").html(fechas.parse2(tx.fecha, "ARG_FECHA_HORA"));
                dom.find("[name='PtoVta'] span").html(tx.solicitudAfip?.FeCAEReq?.FeCabReq?.PtoVta || "---");
                dom.find("[name='cliente_nombre'] span").html(tx.cliente?.nombre || "---");
                dom.find("[name='cliente_cuit'] span").html(tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.DocNro || "---");
                
                dom.find("[name='cuit'] span").html(tx.respuestaAfip?.FECAESolicitarResult?.FeCabResp?.Cuit || "---");
                dom.find("[name='inicioDeActividades'] span").html(params.afip?.inicioDeActividades || "---");
                dom.find("[name='cajero'] span").html(tx.usuario || "---");
                dom.find("[name='CbteNro'] span").html(tx.CbteNro || tx.numeroTransaccion || "---");
                dom.find("[name='caja'] span").html(tx.caja || "---");
                dom.find("[name='razonSocial'] span").html(tx.razonSocial || "---");

                dom.find("[name='tipo_transaccion']").html(tx.tipoTransaccion.replaceAll("_", " "));

                let tbody = ``;
                tx.detalleTransaccion.forEach(px=>{
                    let precio = px.precio || px.precioInicial;
                    if(params.configuracion.discriminar_descuentos_recargos == false) precio = h.decimales(precio + (precio * tx.modificador / 100));
                    tbody += `<tr>
                        <td>${px.nombre}</td>
                        <td class="text-right">${px.cantidad}</td>
                        <td class="text-right" columna="precio">$${precio}</td>
                        <td class="text-right" columna="subtotal">$${h.decimales(px.cantidad * precio)}</td>
                    </tr>`
                });
                dom.find("tbody").html(tbody);
                
                dom.find("[name='subtotal'] span").html(tx.totalTnicial)
                if(tx.modificador < 0){
                    dom.find("[name='descuento'] span").html( "%" + Math.abs(tx.modificador) + " | $" + Math.abs(h.decimales(tx.totalInicial * tx.modificador / 100)))
                    dom.find("[name='descuento']").removeClass("d-none")
                    dom.find("[name='subtotal']").removeClass("d-none")
                }else if(tx.modificador > 0){
                    dom.find("[name='recargo'] span").html( "%" + Math.abs(tx.modificador) + " | $" + Math.abs(h.decimales(tx.totalInicial * tx.modificador / 100)))
                    dom.find("[name='recargo']").removeClass("d-none")
                    dom.find("[name='subtotal']").removeClass("d-none")
                }
                
                let IVAS = tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.Iva || null;
                if(Array.isArray(IVAS)){// && tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.CbteTipo < 3){//SOLO COMPROBANTES A
                    for(let iva of IVAS){
                        let _iva = iva.AlicIva;
                        if(Number(_iva.Id) === 6) dom.find("[name='iva_27'] span").html( _iva.Importe ).parent().removeClass("d-none")
                        if(Number(_iva.Id) === 5) dom.find("[name='iva_21'] span").html( _iva.Importe ).parent().removeClass("d-none")
                        if(Number(_iva.Id) === 4) dom.find("[name='iva_10.5'] span").html( _iva.Importe ).parent().removeClass("d-none")
                        if(Number(_iva.Id) === 8) dom.find("[name='iva_5'] span").html( _iva.Importe ).parent().removeClass("d-none")
                        if(Number(_iva.Id) === 9) dom.find("[name='iva_2.5'] span").html( _iva.Importe ).parent().removeClass("d-none")
                        if(Number(_iva.Id) === 3) dom.find("[name='iva_0'] span").html( _iva.Importe ).parent().removeClass("d-none")
                    }
                }

                dom.find("[name='total_final'] span").html("$" + tx.totalInicial)


                if(tx.respuestaAfip?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse[0]?.CAE){
                    dom.find("[name='cae'] span").html(tx.respuestaAfip?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse[0]?.CAE || "---");
                    dom.find("[name='vtocae'] span").html(tx.respuestaAfip?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse[0]?.CAEFchVto || "---");
                    let qr = h.getQRAfip(tx);
                    dom.find("#qrcode").replaceWith(`<div class="qrcode text-center" qrcode-value="${qr}" qrcode-size="128"></div>`);
                    
                }

                if(params.plan == "no_fiscal") dom.find("[fiscal]").remove();
                
                if(prePrint) prePrint(dom);

                //convierto los QR
                this.tab.convert_to_qrcode();
                //manda a imprimir
                setTimeout(()=> this.tab.print() ,200);

                resolve(true);
            });
        });
    }
    async ticket_v2({tx, params, modelo="/htmls/printables/ticket.html"}){
        if((await this.ping_nubelar_pos_printer()) == false){
            alert("Nubelar POS Printer no iniciado.");
            return false;
        }
        this.buffer_ticket = [];
        let nombre_wrap = this.wordWrap(params.nombre, 21).split("\n");
        nombre_wrap.forEach(n=>{
            this.pos_line({str: n.toUpperCase(), align: "center", bold: true, expanded: true});
        });
        this.pos_line({str: "Dirección: " + (params.direccion || "---"), marginTop: 2});
        this.pos_line({str: "Teléfono: " + (params.telefono || "---"), marginBottom: 2});

        if(tx.afip){
            this.pos_line({str: this.justify(64, "Cond. IVA: " + params.plan, "CUIT: " + params.afip.cuit), condensed: true});
            const _numero = this.justify(64, "Pto. Vta: " + this.completeString(_datos.afip.PtoVta, 5, 0, false), "Cbte. Nro: " + this.completeString(tx.CbteNro || tx.numero_transaccion, 8, 0, false));
            this.pos_line({str: _numero, condensed: true});
        }

        let _fecha_cajero = this.justify(64, "Fecha: " + fechas.parse2(new Date(), "ARG_FECHA_HORA"), "Cajero: " + params.email.substring(0,15));
        this.pos_line({str: _fecha_cajero, condensed: true});

        let _cliente = "Cliente: " + (tx.cliente ? tx.cliente.nombre : "---");
        let _caja = "Caja: " + tx.caja;
        this.pos_line({str: this.justify(64, _cliente, _caja), condensed: true});
        if(tx.afip?.DocNro) this.pos_line({str: "CUIT cliente: " + tx.afip.DocNro, condensed: true});
        if(tx.afip?.razonSocial) this.pos_line({str: "RS cliente: " + tx.afip.razonSocial, condensed: true});

        this.pos_line({str: tx.tipo_transaccion, align: "center", marginTop:2, expanded: true});
        
        let cant_productos = 0;
        //#######detalle
        if(tx.congelado == false && tx.caja == "cta_cte" && (tx.tipo_transaccion == "REMITO_X" || tx.tipo_transaccion == "DEVOLUCION_X")){
            this.pos_line(obj, {str: this.justify(64, "Producto", "Cant."), condensed: true, bold: true, marginBottom: 1});
            tx.detalle.forEach((item, i)=>{
                let n = item.nombre + (item.variacion ? " (" + item.variacion + ")" : "").replaceAll("'", "‘").replaceAll('"', "“")
                let row = this.justify(64, n, item.cantidad);
                this.pos_line(obj, {str: row, condensed: true});
                cant_productos += item.cantidad;
            });
        }else{
            let enc = this.justify2([{length: 36, val: "Producto"}, {length: 9, val: "Cantidad", align: "right"}, {length: 9, val: "Precio", align: "right"}, {length: 10, val: "Subtotal", align: "right"},])
            this.pos_line(obj, {str: enc, condensed: true, bold: true, marginBottom: 1});
            tx.detalle_transaccion.forEach((item, i)=>{
                let n = item.nombre + (item.variacion ? " (" + item.variacion + ")" : "").replaceAll("'", "‘").replaceAll('"', "“")
                let v = h.decimales(item.precio_inicial * item.cantidad);
                if(params.discriminar_descuentos_recargos) v = h.decimales((v * tx.modificador / 100) + v)
                let row = "";
                row = this.justify2([{length: 36, val: n}, {length: 9, val: item.cantidad, align: "right"}, {length: 9, val: item.precio_final, align: "right"}, {length: 10, val: v, align: "right"},])
                this.pos_line(obj, {str: row, condensed: true});
                cant_productos += item.cantidad;
            });
        }
        this.pos_line(obj, {str: "items " + h.decimales(cant_productos), align: "right", condensed: true});
        //#######detalle

        if(params.discriminar_descuentos_recargos){
            if(tx.modificador != 0){
                this.pos_line(obj, {str: "SUBTOTAL: " + tx.total_inicial, marginTop: 1, align: "right"});
            }
            if(tx.modificador < 0 ){ 
                this.pos_line(obj, {str: "Descuento: " + tx.modificador + "% | $" + h.decimales(tx.modificador * tx.total_inicial / 100), align: "right"});
            }
            if(tx.modificador > 0 ){ 
                this.pos_line(obj, {str: "Recargo: " + tx.modificador + "% | $" + h.decimales(tx.modificador * tx.total_inicial / 100), align: "right"});
            }
        }

        /* 
            NO AFIP
            if(tx.tipo_transaccion.AFIP_ID === 1 && tx.tipo_transaccion.exento != 1 && tx.tipo_transaccion.letra == "A"){
                if(tx.auxiliar["iva_27_Importe"] > 0){ this.pos_line(obj, {str: "IVA 27%: " + tx.auxiliar["iva_27_Importe"], align: "right", condensed: true}); }
                if(tx.auxiliar["iva_21_Importe"] > 0){ this.pos_line(obj, {str: "IVA 21%: " + tx.auxiliar["iva_21_Importe"], align: "right", condensed: true}); }
                if(tx.auxiliar["iva_10.5_Importe"] > 0){ this.pos_line(obj, {str: "IVA 10.5%: " + tx.auxiliar["iva_10.5_Importe"], align: "right", condensed: true}); }
                if(tx.auxiliar["iva_5_Importe"] > 0){ this.pos_line(obj, {str: "IVA 5%: " + tx.auxiliar["iva_5_Importe"], align: "right", condensed: true}); }
                if(tx.auxiliar["iva_2.5_Importe"] > 0){ this.pos_line(obj, {str: "IVA 2.5%: " + tx.auxiliar["iva_2.5_Importe"], align: "right", condensed: true}); }
                if(tx.auxiliar["iva_0_Importe"] > 0){ this.pos_line(obj, {str: "IVA 0%: " + tx.auxiliar["iva_0_Importe"], align: "right", condensed: true}); }
            } 
        */

        
        this.pos_line(obj, {str: "TOTAL $" + tx.total_final2, marginTop: 1, align: "right", expanded: true, bold: true});
        if(params.pagaCon){
            this.pos_line(obj, {str: "Paga con: $" + params.pagaCon, marginTop: 1, align: "right"});
            this.pos_line(obj, {str: "Vuelto: $" + params.vuelto, align: "right"});
        }

        /*
            //NO AFIP POR AHORA
            if(tx.tipo_transaccion.AFIP_ID){
                this.pos_line(obj, {str: this.justify(48, "CAE: " + tx.auxiliar.CAE, "CAE Vto.: " + tx.auxiliar.CAEFchVto), align: "center", marginTop: 3});
                obj.push({fn: "QrCode", str: operador.getQRAfip(tx)});
            }
        */

        this.pos_line({str: "NUBELAR.COM software de gestión comercial", align: "center", marginTop: 2, bold: true});
        
        this.buffer_ticket.push({fn: "FullPaperCut"});
        this.buffer_ticket.push({fn: "PrintDocument"});
        let ret = await this.send_to_nubelar_pos_printer(this.buffer_ticket);
        return true;
    }
    
    modal_impresor(cb){
        let foo = `<div class="list-group">
                        <button type="button" imp="simple" class="list-group-item list-group-item-primary list-group-item-action">Hoja completa</button>
                        <button type="button" imp="media" class="list-group-item list-group-item-primary list-group-item-action">Media hoja</button>
                        <button type="button" imp="doble" class="list-group-item list-group-item-primary list-group-item-action">Media hoja / duplicado</button>
                        <button type="button" imp="ticket" class="list-group-item list-group-item-primary list-group-item-action">Ticket</button>
                    </div>`;
        modal.mostrar({
            titulo: "Imprimir",
            cuerpo: foo,
            botones: "volver"
        });
        $("#modal [imp]").click(ev=>{
            modal.ocultar();
            let attr = $(ev.currentTarget).attr("imp");
            cb(attr);
        });
    }
    async imprimir_v2({tx = null, params = {}, modelo = "simple", prePrint = null, template="/views/transaccion.html"}){
        return new Promise(resolve=>{
            //console.log(tx, params);
            $("#impresor").remove();
            $("body").append(`<iframe id="impresor" class="d-none" src="${template}"></iframe>`);
            this.tab = window.frames[0];
            this.tab.addEventListener('load', ()=>{
                
                let dom = $(this.tab.document);
                
                dom.find("[name='nombre_emprendimiento']").html( params.nombre || "---" );

                if(params.razonSocial){
                    dom.find("[name='razon_social']").html( params.razonSocial );
                }else{
                    dom.find("[name='razon_social']").parent().addClass( "d-none" );
                }
                if(params.plan != "no_fiscal"){
                    dom.find("[name='condicion_iva']").html( params.plan.replace("_", " ") );
                }else{
                    dom.find("[name='condicion_iva']").parent().addClass( "d-none" );
                }
                
                dom.find("[name='direccion']").html( params.direccion || "---" );
                dom.find("[name='telefono']").html( params.telefono || "---" );

                if(tx.tipoTransaccion == "REMITO_X" || tx.tipoTransaccion == "REMITO_XX"){
                    dom.find("[name='tipo_documento']").html("REMITO X");
                    dom.find("[name='tipo_documento']").addClass("d-none");
                    dom.find("[name='letra']").html( "X" );
                    dom.find("[name='codigo_letra']").html("Cód 000");
                    dom.find("[name='no_valido_como_factura']").removeClass("d-none");
                    dom.find("[fiscal]").addClass("d-none");
                }else if(tx.tipoTransaccion == "DEVOLUCION_X"){
                    dom.find("[name='tipo_documento']").html("DEVOLUCIÓN X");
                    dom.find("[name='tipo_documento']").addClass("d-none");
                    dom.find("[name='letra']").html( "X" );
                    dom.find("[name='codigo_letra']").html("Cód 000");
                    dom.find("[name='no_valido_como_factura']").removeClass("d-none");
                    dom.find("[fiscal]").addClass("d-none");
                }else if(tx.tipoTransaccion == "FACTURA_A"){
                    dom.find("[name='tipo_documento']").html("FACTURA A");
                    dom.find("[name='letra']").html( "A" );
                    dom.find("[name='codigo_letra']").html("Cód 001");
                }else if(tx.tipoTransaccion == "FACTURA_B"){
                    dom.find("[name='tipo_documento']").html("FACTURA B");
                    dom.find("[name='letra']").html( "B" );
                    dom.find("[name='codigo_letra']").html("Cód 006");
                }else if(tx.tipoTransaccion == "FACTURA_C"){
                    dom.find("[name='tipo_documento']").html("FACTURA C");
                    dom.find("[name='letra']").html( "C" );
                    dom.find("[name='codigo_letra']").html("Cód 011");
                }else if(tx.tipoTransaccion == "NOTA_DE_CREDITO_A"){
                    dom.find("[name='tipo_documento']").html("NOTA DE CRÉDITO A");
                    dom.find("[name='letra']").html( "A" );
                    dom.find("[name='codigo_letra']").html("Cód 003");
                }else if(tx.tipoTransaccion == "NOTA_DE_CREDITO_B"){
                    dom.find("[name='tipo_documento']").html("NOTA DE CRÉDITO B");
                    dom.find("[name='letra']").html( "B" );
                    dom.find("[name='codigo_letra']").html("Cód 008");
                }else if(tx.tipoTransaccion == "NOTA_DE_CREDITO_C"){
                    dom.find("[name='tipo_documento']").html("NOTA DE CRÉDITO C");
                    dom.find("[name='letra']").html( "C" );
                    dom.find("[name='codigo_letra']").html("Cód 013");
                }

                dom.find("[name='comprobante_numero']").html(tx.CbteNro || tx.numeroTransaccion);
                dom.find("[name='fecha_de_emision']").html( fechas.parse2(tx.fecha, "ARG_FECHA_HORA") );

                if(params.plan != "no_fiscal" && tx.solicitudAfip?.FeCAEReq?.FeCabReq?.PtoVta){
                    dom.find("[name='punto_de_venta']").html( tx.solicitudAfip?.FeCAEReq?.FeCabReq?.PtoVta );
                }else{
                    dom.find("[name='punto_de_venta']").parent().addClass( "d-none" );
                }
                if(params.plan != "no_fiscal" && tx.respuestaAfip?.FECAESolicitarResult?.FeCabResp?.Cuit){
                    dom.find("[name='cuit']").html( tx.respuestaAfip?.FECAESolicitarResult?.FeCabResp?.Cuit );
                }else{
                    dom.find("[name='cuit']").parent().addClass( "d-none" );
                }

                //CLIENTE
                dom.find("[name='cliente_nombre']").html(tx.cliente?.nombre || "---");
                dom.find("[name='cliente_razon_social']").html( tx.razonSocial || "---" );
                dom.find("[name='cliente_condicion_venta']").html( tx.caja || "---" );
                dom.find("[name='cliente_cuit']").html( tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.DocNro || "---" );
                //CLIENTE <-----
                
                //DETALLE
                let tbody = ``;
                tx.detalleTransaccion.forEach(px=>{
                    let precio = px.precio || px.precioInicial;
                    if(params.configuracion.discriminar_descuentos_recargos == false) precio = h.decimales(precio + (precio * tx.modificador / 100));
                    tbody += `<tr>
                        <td>${px.nombre}</td>
                        <td class="text-right">${px.cantidad}</td>
                        <td class="text-right" columna="precio">$${precio}</td>
                        <td class="text-right" columna="subtotal">$${h.decimales(px.cantidad * precio)}</td>
                    </tr>`
                });
                dom.find("[name='wrapper']").replaceWith(`
                <div name='wrapper2' class='mb-3'>
                    <div class="border">
                        <table class='table table-sm mb-0'>
                            <thead class='thead-dark'>
                                <tr>
                                    <th>Nombre</th>
                                    <th class="text-right">Cant.</th>
                                    <th class="text-right" columna="precio">P. Unit</th>
                                    <th class="text-right" columna="subtotal">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>${tbody}</tbody>
                        </table>
                    </div>
                </div>`);
                //DETALLE <-----


                //TOTALES
                 dom.find("[name='subtotal']").html(tx.totalInicial)
                 if(tx.modificador < 0){
                    dom.find("[name='porcentaje_descuento']").html( Math.abs(tx.modificador))
                    dom.find("[name='monto_descuento']").html( Math.abs(h.decimales(tx.totalInicial * tx.modificador / 100)))
                }else if(tx.modificador > 0){
                     dom.find("[name='porcentaje_recargo']").html(tx.modificador)
                     dom.find("[name='monto_recargo']").html(h.decimales(tx.totalInicial * tx.modificador / 100))
                }
                dom.find("[name='importe_total']").html( tx.modificador != 0 ? h.decimales(tx.totalInicial + (tx.totalInicial * tx.modificador / 100)) : tx.totalInicial);
                
                let IVAS = tx.solicitudAfip?.FeCAEReq?.FeDetReq?.FECAEDetRequest?.Iva || null;
                if(Array.isArray(IVAS)){//SOLO COMPROBANTES A
                    for(let iva of IVAS){
                        let _iva = iva.AlicIva;
                        if(Number(_iva.Id) === 6) dom.find("[name='iva_27']").html( _iva.Importe ).parent().parent().removeClass("d-none")
                        if(Number(_iva.Id) === 5) dom.find("[name='iva_21']").html( _iva.Importe ).parent().parent().removeClass("d-none")
                        if(Number(_iva.Id) === 4) dom.find("[name='iva_10.5']").html( _iva.Importe ).parent().parent().removeClass("d-none")
                        if(Number(_iva.Id) === 8) dom.find("[name='iva_5']").html( _iva.Importe ).parent().parent().removeClass("d-none")
                        if(Number(_iva.Id) === 9) dom.find("[name='iva_2.5']").html( _iva.Importe ).parent().parent().removeClass("d-none")
                        if(Number(_iva.Id) === 3) dom.find("[name='iva_0']").html( _iva.Importe ).parent().parent().removeClass("d-none")
                    }
                }
                //TOTALES <------

                if(params.configuracion.discriminar_descuentos_recargos == false){
                    dom.find("[name='monto_descuento']").parent().parent().addClass("d-none")
                    dom.find("[name='monto_recargo']").parent().parent().addClass("d-none")
                }


                if(tx.respuestaAfip?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse[0]?.CAE){
                    dom.find("[name='cae']").html(tx.respuestaAfip?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse[0]?.CAE || "---");
                    dom.find("[name='vtocae']").html(tx.respuestaAfip?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse[0]?.CAEFchVto || "---");
                    let qr = h.getQRAfip(tx);
                    dom.find("#qrcode").replaceWith(`<div class="qrcode" qrcode-value="${qr}" qrcode-size="128"></div>`);
                    
                }
                
                if(tx.nota){
                    dom.find("[name='nota']").html(tx.nota);
                }else{
                    dom.find(".nota").addClass("d-none");
                }
                

                //ingreso el html dentro de la tabla
                dom.find("[name='main']").html( dom.find("main").html() );
                
                //lo hago doble si es que corresponde
                if(modelo == "doble" || modelo == "media"){
                    let body = dom.find("body").html();
                    let foo = `<div class="row">
                                    <div class="col-6 duplicado" name="duplicado">${body}</div>
                                    <div class="col-6 original" name="original">${body}</div>
                                </div>`
                    dom.find("body").html(foo);
                    dom.find("head").append(`<link rel="stylesheet" href="/styles/impresor_doble.css">`);
                    if(modelo == "media") dom.find("[name='duplicado']").html("");
                    if(1 === 1 || tx.afip.CbteTipo < 3){
                        dom.find("footer").css("height", "130px")
                    }
                }

                //si viene sin transaccion completo en main lo que corresponde
                if(prePrint) prePrint(dom);
                
                if(tx.tipoTransaccion == "REMITO_X" || tx.tipoTransaccion == "REMITO_XX") this.setFooterChico();

                //convierto los QR
                this.tab.convert_to_qrcode();
                //manda a imprimir
                setTimeout(()=> this.tab.print() ,200);

                resolve(true);
            });
        });
    }
    async imprimir({template="/views/templates/blank.html", prePrint=null}){
        return new Promise(resolve=>{
            $("#impresor").remove();
            $("body").append(`<iframe id="impresor" class="d-none" src="${template}"></iframe>`);
            this.tab = window.frames[0];
            this.tab.addEventListener('load', ()=>{
                
                let dom = $(this.tab.document);
                if(prePrint) prePrint(dom);
                setTimeout(()=> this.tab.print() ,200);
            });
        });
    }
    setFooterChico(){
        let dom = $(this.tab.document);
        dom.find("body").addClass("footer-chico");
        dom.find("footer>.row").remove();
        dom.find("footer .d-none").removeClass("d-none");
    }
    setBackgrounds(body){
        body.find(".bg-light, .bg-light td, .bg-light th").attr("style", "background: #eee !important");
        body.find(".bg-danger, .bg-danger td, .bg-danger th").attr("style", "background: #dc3545 !important");
        body.find(".bg-info, .bg-info td, .bg-info th").attr("style", "background: #17a2b8 !important");
        body.find(".bg-primary, .bg-primary td, .bg-primary th").attr("style", "background: #007bff !important");
        body.find(".bg-secondary, .bg-secondary td, .bg-secondary th").attr("style", "background: #6c757d !important");
        body.find(".bg-dark, .bg-dark td, .bg-dark th").attr("style", "background: #343a40 !important");
        body.find(".bg-warning, .bg-warning td, .bg-warning th").attr("style", "background: #ffc107 !important");
    }
}
