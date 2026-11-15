/* ============================================================
   CHAPARRASTIQUE - entradas.js
   Cuenta las entradas de personas a la pagina y cuantas veces ha
   entrado cada una.

   MODO REAL
     Cuando alguien esta presente durante la emision:
       1. Se pregunta su IP a un servicio externo (config.js > cartas.servicioIP).
       2. Se agrega una fila a la hoja (Sheety) con fecha, hora y la IP
          (o una "huella" de la IP; ver config.js > cartas.guardarIPEnClaro).
       3. La respuesta trae el numero de la fila: entradas totales = fila - 1.
       4. Se pide a la hoja las filas con esa misma IP: su cantidad es la
          "ocasion", es decir, la vez numero N que esa persona entra.
     Si la pagina se recarga en la misma pestana no se registra otra entrada.
     Si no se puede conocer la IP o leer la hoja, la ocasion se cuenta solo
     para este navegador (plan B).

   MODO ENSAYO
     No envia nada. Las entradas salen de ?entradas=60, de config.js o del
     control deslizante de abajo a la derecha. La ocasion la maneja cartas.js.

   Otros archivos usan:
     Entradas.suscribir(function (total) { ... })          total de entradas
     Entradas.suscribirOcasion(function (n) { ... })       vez numero n de esta persona
   ============================================================ */

var Entradas = (function () {
    'use strict';

    var CLAVE_SESION = 'chaparrastique_entradas_sesion';        /* total al entrar (por pestana) */
    var CLAVE_ULTIMO = 'chaparrastique_entradas_ultimo';        /* ultimo total conocido */
    var CLAVE_OCASION = 'chaparrastique_ocasion_sesion';        /* ocasion de esta persona (por pestana) */
    var CLAVE_OCASION_LOCAL = 'chaparrastique_ocasion_local';   /* contador de este navegador (plan B) */

    var total = 0;
    var conocido = false;
    var suscriptores = [];

    var ocasion = null;
    var oyentesOcasion = [];

    /* ---------------- calculos del velo ----------------
       Acepta las dos formas de config.js: pixelesPorEntrada o porcentajePorEntrada. */

    function pixelesTotales() {
        return CONFIG.escenario.ancho * CONFIG.escenario.alto;
    }

    /* Cuantas entradas hacen falta para cubrir todo el escenario */
    function limite() {
        var c = CONFIG.entradas;
        if (c.porcentajePorEntrada) { return Math.ceil(100 / c.porcentajePorEntrada); }
        return Math.ceil(pixelesTotales() / c.pixelesPorEntrada);
    }

    /* Porcentaje del escenario cubierto con n entradas (0 a 100) */
    function cobertura(n) {
        var c = CONFIG.entradas;
        if (c.porcentajePorEntrada) { return Math.min(100, n * c.porcentajePorEntrada); }
        return Math.min(1, n * c.pixelesPorEntrada / pixelesTotales()) * 100;
    }

    /* ---------------- estado y suscriptores ---------------- */

    function fijar(nuevoTotal) {
        total = nuevoTotal;
        conocido = true;
        for (var i = 0; i < suscriptores.length; i++) { suscriptores[i](total); }
    }

    function suscribir(funcion) {
        suscriptores.push(funcion);
        if (conocido) { funcion(total); }
    }

    function fijarOcasion(n) {
        ocasion = n;
        for (var i = 0; i < oyentesOcasion.length; i++) { oyentesOcasion[i](n); }
    }

    function suscribirOcasion(funcion) {
        oyentesOcasion.push(funcion);
        if (ocasion !== null) { funcion(ocasion); }
    }

    /* ---------------- ajustes de config.js (con valores por defecto) ---------------- */

    function ajuste(nombre, porDefecto) {
        var c = CONFIG.cartas;
        return (c && c[nombre] !== undefined) ? c[nombre] : porDefecto;
    }

    /* ---------------- almacenamiento del navegador ---------------- */

    function leerAlmacen(almacen, clave) {
        try {
            var valor = parseInt(almacen.getItem(clave), 10);
            return isNaN(valor) ? null : valor;
        } catch (error) { return null; }
    }

    function escribirAlmacen(almacen, clave, valor) {
        try { almacen.setItem(clave, String(valor)); } catch (error) { /* sin almacenamiento: se sigue igual */ }
    }

    /* ---------------- cabeceras de Sheety ---------------- */

    function cabeceras() {
        var c = { 'Content-Type': 'application/json' };
        if (CONFIG.entradas.token) { c['Authorization'] = CONFIG.entradas.token; }
        return c;
    }

    /* Para leer no hace falta Content-Type (asi el navegador no hace una consulta previa) */
    function cabecerasLectura() {
        var c = {};
        if (CONFIG.entradas.token) { c['Authorization'] = CONFIG.entradas.token; }
        return c;
    }

    /* ---------------- IP ---------------- */

    /* Pregunta la IP al servicio externo. Si falla o tarda mas de 4 segundos,
       se sigue sin IP (y la ocasion se cuenta solo en este navegador). */
    function obtenerIP(alTerminar) {
        var respondido = false;
        function responder(ip) {
            if (!respondido) { respondido = true; alTerminar(ip); }
        }
        setTimeout(function () { responder(null); }, 4000);

        fetch(ajuste('servicioIP', 'https://api.ipify.org?format=json'))
            .then(function (respuesta) {
                if (!respuesta.ok) { throw new Error('el servicio de IP respondio ' + respuesta.status); }
                return respuesta.json();
            })
            .then(function (datos) { responder(datos && datos.ip ? String(datos.ip) : null); })
            .catch(function (error) {
                console.warn('[ENTRADAS] no se pudo conocer la IP:', error && error.message ? error.message : error);
                responder(null);
            });
    }

    /* Huella corta de un texto (cyrb53). No es cifrado: solo evita que la IP
       se lea a simple vista en la hoja. */
    function huella(texto) {
        var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (var i = 0; i < texto.length; i++) {
            var c = texto.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 2654435761);
            h2 = Math.imul(h2 ^ c, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    /* Lo que se guarda en la columna "ip": la IP en claro o su huella (con una "h"
       delante para que Google Sheets nunca la confunda con un numero). */
    function identificador(ip) {
        if (ajuste('guardarIPEnClaro', false)) { return ip; }
        return 'h' + huella(ajuste('sal', 'chaparrastique') + '|' + ip);
    }

    /* ---------------- modo real ---------------- */

    function terminar(nuevoTotal) {
        escribirAlmacen(sessionStorage, CLAVE_SESION, nuevoTotal);
        escribirAlmacen(localStorage, CLAVE_ULTIMO, nuevoTotal);
        fijar(nuevoTotal);
    }

    function fallar(error) {
        var ultimo = leerAlmacen(localStorage, CLAVE_ULTIMO);
        console.error('[ENTRADAS] no se pudo registrar la entrada:', error && error.message ? error.message : error);
        console.warn('[ENTRADAS] se usa el ultimo total conocido: ' + (ultimo === null ? 0 : ultimo));
        fijar(ultimo === null ? 0 : ultimo);
    }

    /* Plan B si la respuesta no trae el numero de fila: pedir la lista y contarla */
    function contarConLectura() {
        fetch(CONFIG.entradas.urlSheety, { headers: cabecerasLectura() })
            .then(function (respuesta) {
                if (!respuesta.ok) { throw new Error('Sheety respondio ' + respuesta.status); }
                return respuesta.json();
            })
            .then(function (datos) {
                for (var clave in datos) {
                    if (Array.isArray(datos[clave])) { terminar(datos[clave].length); return; }
                }
                throw new Error('la respuesta de Sheety no trae una lista de filas');
            })
            .catch(fallar);
    }

    /* Cuantas filas de la hoja tienen esta IP (filtro de Sheety: ?filter[ip]=valor) */
    function contarEntradasDe(id, alTerminar) {
        fetch(CONFIG.entradas.urlSheety + '?filter[ip]=' + encodeURIComponent(id), { headers: cabecerasLectura() })
            .then(function (respuesta) {
                if (!respuesta.ok) { throw new Error('Sheety respondio ' + respuesta.status); }
                return respuesta.json();
            })
            .then(function (datos) {
                for (var clave in datos) {
                    if (Array.isArray(datos[clave])) { alTerminar(datos[clave].length); return; }
                }
                alTerminar(null);
            })
            .catch(function (error) {
                console.warn('[ENTRADAS] no se pudo contar las entradas de esta IP:', error && error.message ? error.message : error);
                alTerminar(null);
            });
    }

    function terminarOcasion(n) {
        escribirAlmacen(sessionStorage, CLAVE_OCASION, n);
        fijarOcasion(n);
    }

    /* Plan B: cuenta solo las entradas de este navegador */
    function ocasionLocal() {
        var n = (leerAlmacen(localStorage, CLAVE_OCASION_LOCAL) || 0) + 1;
        escribirAlmacen(localStorage, CLAVE_OCASION_LOCAL, n);
        terminarOcasion(n);
    }

    function calcularOcasion(id) {
        if (!id) { ocasionLocal(); return; }
        contarEntradasDe(id, function (n) {
            if (n === null) {
                console.warn('[ENTRADAS] se cuenta la ocasion solo en este navegador.');
                ocasionLocal();
            } else {
                terminarOcasion(Math.max(1, n));   /* como minimo, esta entrada */
            }
        });
    }

    function enviarEntrada(id) {
        var lectura = Emision.leer();
        var registro = {
            fecha: new Date().toISOString(),
            horaColombia: Emision.segundosAHora(lectura.hora),
            enVivo: lectura.enVivo,
            ip: id
        };
        var cuerpo = {};
        cuerpo[CONFIG.entradas.raizSheety] = registro;

        fetch(CONFIG.entradas.urlSheety, {
            method: 'POST',
            headers: cabeceras(),
            body: JSON.stringify(cuerpo)
        })
            .then(function (respuesta) {
                if (!respuesta.ok) { throw new Error('Sheety respondio ' + respuesta.status); }
                return respuesta.json();
            })
            .then(function (datos) {
                var fila = datos && datos[CONFIG.entradas.raizSheety];
                var numeroDeFila = fila && fila.id;
                if (typeof numeroDeFila === 'number' && numeroDeFila >= 2) { terminar(numeroDeFila - 1); }
                else { contarConLectura(); }
                calcularOcasion(id);
            })
            .catch(fallar);
    }

    function registrarEntrada() {
        if (!CONFIG.entradas.urlSheety) {
            console.warn('[ENTRADAS] falta entradas.urlSheety en config.js.');
            fijar(0);
            return;
        }

        /* Misma pestana (recarga): no se vuelve a registrar */
        var guardado = leerAlmacen(sessionStorage, CLAVE_SESION);
        if (guardado !== null) {
            fijar(guardado);
            var ocasionGuardada = leerAlmacen(sessionStorage, CLAVE_OCASION);
            if (ocasionGuardada !== null) { fijarOcasion(ocasionGuardada); }
            return;
        }

        obtenerIP(function (ip) {
            enviarEntrada(ip ? identificador(ip) : '');
        });
    }

    /* ---------------- modo ensayo ---------------- */

    function crearControl(maximo) {
        var caja = document.createElement('div');
        caja.style.cssText =
            'position:fixed; right:10px; bottom:10px; z-index:10; display:flex; gap:8px;' +
            'align-items:center; font:12px monospace; color:rgba(255,255,255,0.85);' +
            'background:rgba(0,0,0,0.6); padding:4px 8px;';

        var texto = document.createElement('span');
        var control = document.createElement('input');
        control.type = 'range';
        control.min = 0;
        control.max = maximo;
        control.step = 1;
        control.value = total;
        control.style.width = '180px';

        function mostrar() {
            texto.textContent = 'entradas ' + total + ' / ' + maximo + '  velo ' + Math.round(cobertura(total)) + '%';
        }
        control.addEventListener('input', function () {
            fijar(parseInt(control.value, 10));
            mostrar();
        });

        caja.appendChild(texto);
        caja.appendChild(control);
        document.body.appendChild(caja);
        mostrar();
    }

    function iniciarEnsayo() {
        var maximo = CONFIG.entradas.maximoEnsayo;
        var deLaDireccion = new URLSearchParams(window.location.search).get('entradas');
        var n = (deLaDireccion !== null) ? parseInt(deLaDireccion, 10) : CONFIG.entradas.ensayo;
        if (isNaN(n)) {
            console.warn('[ENTRADAS] el valor de ?entradas= no es un numero; se usa el de config.js.');
            n = CONFIG.entradas.ensayo;
        }
        n = Math.max(0, Math.min(maximo, n));
        fijar(n);
        crearControl(maximo);
        console.info('[ENTRADAS] ensayo: ' + n + ' entradas (' + Math.round(cobertura(n)) +
                     '% del velo). Con ' + limite() + ' o mas, el video queda cubierto.');
    }

    /* ---------------- arranque ---------------- */

    function iniciar() {
        if (CONFIG.reloj.modo === 'ensayo') { iniciarEnsayo(); return; }

        /* Solo cuenta quien esta presente durante la emision: la entrada se registra
           en el primer latido en vivo (aunque la pagina se haya abierto antes). */
        var pendiente = true;
        Emision.suscribir(function (lectura) {
            if (pendiente && lectura.enVivo) {
                pendiente = false;
                registrarEntrada();
            }
        });
    }

    iniciar();

    return {
        suscribir: suscribir,
        suscribirOcasion: suscribirOcasion,
        total: function () { return total; },
        ocasion: function () { return ocasion; },
        limite: limite,
        cobertura: cobertura
    };

}());
