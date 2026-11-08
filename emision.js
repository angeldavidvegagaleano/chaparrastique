/* ============================================================
   CHAPARRASTIQUE - emision.js
   Logica de la emision. Se construye por pasos:
     paso 2: reloj (real y de ensayo) y cambio entre "fuera" y "vivo"   <- este archivo
     paso 3: lectura del guion
     paso 4: frases en pantalla
     paso 5: video de fondo sincronizado
     paso 6: aportes del publico desde la hoja

   IDEA CENTRAL: la pagina no "reproduce" nada. En cada latido mira el
   reloj y calcula que deberia estar pasando. Asi no se desincroniza si
   la pestana duerme o si alguien llega a la mitad.
   ============================================================ */

var Emision = (function () {
    'use strict';

    var SEGUNDOS_POR_DIA = 86400;
    var INTERVALO_MS = 250;            /* cada cuanto se revisa el reloj */

    var inicioEmision = 0;             /* segundos desde medianoche, hora Colombia */
    var duracion = 0;                  /* duracion de la emision en segundos */
    var modo = 'real';                 /* 'real' o 'ensayo' */
    var horaEnsayoBase = 0;            /* hora de partida del reloj de ensayo */
    var marcaCarga = Date.now();       /* momento en que se cargo la pagina */

    var estadoActual = null;           /* 'vivo' o 'fuera' */
    var suscriptores = [];             /* funciones que reciben cada latido */
    var indicador = null;              /* etiqueta visible solo en modo ensayo */

    /* ------------------------------------------------------------
       Utilidades de hora
       ------------------------------------------------------------ */

    /* '15:53:00' -> 57180. Acepta tambien '15:53'. Devuelve null si no es valida. */
    function horaASegundos(texto) {
        var partes = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(texto).trim());
        if (!partes) { return null; }
        var h = parseInt(partes[1], 10);
        var m = parseInt(partes[2], 10);
        var s = partes[3] ? parseInt(partes[3], 10) : 0;
        if (h > 23 || m > 59 || s > 59) { return null; }
        return h * 3600 + m * 60 + s;
    }

    /* 57180 -> '15:53:00' */
    function segundosAHora(total) {
        total = Math.floor(total);
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        return dosDigitos(h) + ':' + dosDigitos(m) + ':' + dosDigitos(s);
    }

    function dosDigitos(n) {
        return (n < 10 ? '0' : '') + n;
    }

    /* Modulo que nunca devuelve negativos */
    function modulo(a, b) {
        return ((a % b) + b) % b;
    }

    /* ------------------------------------------------------------
       Los dos relojes. Ambos devuelven segundos desde medianoche,
       hora de Colombia.
       ------------------------------------------------------------ */

    /* Reloj real: toma la hora universal y le aplica el desfase de Colombia.
       No depende de la zona horaria de quien visita. */
    function ahoraReal() {
        var ms = Date.now() + CONFIG.horario.desfaseUTC * 3600 * 1000;
        return modulo(ms / 1000, SEGUNDOS_POR_DIA);
    }

    /* Reloj de ensayo: parte de una hora inventada y avanza en tiempo real. */
    function ahoraEnsayo() {
        var transcurrido = (Date.now() - marcaCarga) / 1000;
        return modulo(horaEnsayoBase + transcurrido, SEGUNDOS_POR_DIA);
    }

    /* ------------------------------------------------------------
       Lectura del reloj: aqui vive la regla central.
       segundo de emision = hora actual - hora de inicio.
       Si cae entre 0 y la duracion, estamos en vivo.
       ------------------------------------------------------------ */
    function leer() {
        var ahora = (modo === 'ensayo') ? ahoraEnsayo() : ahoraReal();
        var segundo = ahora - inicioEmision;
        var enVivo = (segundo >= 0 && segundo < duracion);
        return {
            hora: ahora,                       /* segundos desde medianoche */
            enVivo: enVivo,
            segundo: enVivo ? segundo : null,  /* segundo dentro de la emision */
            duracion: duracion
        };
    }

    /* ------------------------------------------------------------
       El latido: se ejecuta varias veces por segundo.
       ------------------------------------------------------------ */
    function latir() {
        var lectura = leer();
        var nuevoEstado = lectura.enVivo ? 'vivo' : 'fuera';

        if (nuevoEstado !== estadoActual) {
            document.body.classList.remove('fuera', 'vivo');
            document.body.classList.add(nuevoEstado);
            estadoActual = nuevoEstado;
        }

        actualizarIndicador(lectura);

        for (var i = 0; i < suscriptores.length; i++) {
            try {
                suscriptores[i](lectura);
            } catch (error) {
                console.error('[CHAPARRASTIQUE] error en un suscriptor:', error);
            }
        }
    }

    /* Los pasos siguientes se enchufan aqui: Emision.suscribir(function (lectura) { ... }) */
    function suscribir(funcion) {
        suscriptores.push(funcion);
    }

    /* ------------------------------------------------------------
       Indicador de ensayo: una etiqueta pequena abajo a la izquierda,
       solo en modo ensayo. En modo real nunca se crea.
       ------------------------------------------------------------ */
    function crearIndicador() {
        indicador = document.createElement('div');
        indicador.style.cssText =
            'position:fixed; left:10px; bottom:10px; z-index:10;' +
            'font:12px monospace; color:rgba(255,255,255,0.65);' +
            'background:rgba(0,0,0,0.5); padding:4px 8px; pointer-events:none;';
        document.body.appendChild(indicador);
    }

    function actualizarIndicador(lectura) {
        if (!indicador) { return; }
        var texto = 'ENSAYO ' + segundosAHora(lectura.hora) + ' - ';
        if (lectura.enVivo) {
            texto += 'en vivo, segundo ' + Math.floor(lectura.segundo) + ' de ' + lectura.duracion;
        } else {
            texto += 'fuera de emision';
        }
        indicador.textContent = texto;
    }

    /* ------------------------------------------------------------
       Arranque: valida la configuracion y pone todo en marcha.
       ------------------------------------------------------------ */
    function iniciar() {
        var inicio = horaASegundos(CONFIG.horario.inicio);
        var fin = horaASegundos(CONFIG.horario.fin);

        if (inicio === null || fin === null || fin <= inicio) {
            console.error('[CHAPARRASTIQUE] horario invalido en config.js: revisa inicio y fin.');
            return;
        }
        inicioEmision = inicio;
        duracion = fin - inicio;

        if (CONFIG.reloj.modo === 'ensayo') {
            modo = 'ensayo';

            /* La hora de ensayo puede venir de la direccion: ...?hora=15:52:50
               Solo funciona en modo ensayo; en modo real se ignora. */
            var deLaDireccion = new URLSearchParams(window.location.search).get('hora');
            var base = deLaDireccion ? horaASegundos(deLaDireccion) : null;
            if (deLaDireccion && base === null) {
                console.warn('[CHAPARRASTIQUE] hora de la direccion no valida (' + deLaDireccion +
                             '); se usa la de config.js.');
            }
            if (base === null) { base = horaASegundos(CONFIG.reloj.horaEnsayo); }
            if (base === null) {
                console.error('[CHAPARRASTIQUE] horaEnsayo invalida en config.js.');
                return;
            }
            horaEnsayoBase = base;
            crearIndicador();
        } else {
            if (CONFIG.reloj.modo !== 'real') {
                console.warn('[CHAPARRASTIQUE] modo de reloj desconocido (' + CONFIG.reloj.modo +
                             '); se usa el real.');
            }
            modo = 'real';
        }

        console.info('[CHAPARRASTIQUE] reloj en modo ' + modo + ', emision de ' +
                     CONFIG.horario.inicio + ' a ' + CONFIG.horario.fin +
                     ' (' + duracion + ' s).');

        latir();
        setInterval(latir, INTERVALO_MS);

        /* Al volver a la pestana, se recalcula de inmediato */
        document.addEventListener('visibilitychange', latir);
    }

    return {
        iniciar: iniciar,
        leer: leer,
        suscribir: suscribir,
        horaASegundos: horaASegundos,
        segundosAHora: segundosAHora
    };

}());

Emision.iniciar();
