/* ============================================================
   CHAPARRASTIQUE - entradas.js
   Cuenta las entradas de personas a la pagina.

   MODO REAL
     Al entrar, agrega una fila a la hoja (Sheety) con la fecha y la hora.
     La respuesta trae el numero de la fila; como la fila 1 son los
     encabezados, entradas = numero de fila - 1. Una sola peticion por
     entrada. Si la pagina se recarga en la misma pestana, no se registra
     otra entrada. Si Sheety falla, se usa el ultimo total conocido.

   MODO ENSAYO
     No envia nada. El numero de entradas sale de ?entradas=60, de
     config.js o del control deslizante que aparece abajo a la derecha.

   Otros archivos usan:  Entradas.suscribir(function (total) { ... })
   ============================================================ */

var Entradas = (function () {
    'use strict';

    var CLAVE_SESION = 'chaparrastique_entradas_sesion';   /* total al entrar (por pestana) */
    var CLAVE_ULTIMO = 'chaparrastique_entradas_ultimo';   /* ultimo total conocido */

    var total = 0;
    var conocido = false;
    var suscriptores = [];

    /* ---------------- calculos ---------------- */

    /* Cuantas entradas hacen falta para cubrir todo el escenario (102 con 424x240) */
    function limite() {
        var pixeles = CONFIG.escenario.ancho * CONFIG.escenario.alto;
        return Math.ceil(pixeles / CONFIG.entradas.pixelesPorEntrada);
    }

    /* Porcentaje del escenario cubierto con n entradas (0 a 100) */
    function cobertura(n) {
        var pixeles = CONFIG.escenario.ancho * CONFIG.escenario.alto;
        return Math.min(1, n * CONFIG.entradas.pixelesPorEntrada / pixeles) * 100;
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

    function cabeceras() {
        var c = { 'Content-Type': 'application/json' };
        if (CONFIG.entradas.token) { c['Authorization'] = CONFIG.entradas.token; }
        return c;
    }

    /* Plan B si la respuesta no trae el numero de fila: pedir la lista y contarla */
    function contarConLectura() {
        fetch(CONFIG.entradas.urlSheety, { headers: cabeceras() })
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

    function registrarEntrada() {
        if (!CONFIG.entradas.urlSheety) {
            console.warn('[ENTRADAS] falta entradas.urlSheety en config.js.');
            fijar(0);
            return;
        }

        /* Misma pestana (recarga): no se vuelve a registrar */
        var guardado = leerAlmacen(sessionStorage, CLAVE_SESION);
        if (guardado !== null) { fijar(guardado); return; }

        var lectura = Emision.leer();
        var registro = {
            fecha: new Date().toISOString(),
            horaColombia: Emision.segundosAHora(lectura.hora),
            enVivo: lectura.enVivo
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
                var id = fila && fila.id;
                if (typeof id === 'number' && id >= 2) { terminar(id - 1); }
                else { contarConLectura(); }
            })
            .catch(fallar);
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

        /* Solo cuenta quien está presente durante la emisión: la entrada se registra
           en el primer latido en vivo (aunque la página se haya abierto antes). */
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
        total: function () { return total; },
        limite: limite,
        cobertura: cobertura
    };

}());
