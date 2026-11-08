/* ============================================================
   CHAPARRASTIQUE - video.js
   El video de fondo. Mientras hay emision, lo mantiene en el mismo
   segundo que el reloj; fuera de emision lo pausa.

   El video solo empieza a descargarse cuando llega la hora de
   emision (no antes), para no gastar datos de quien llega temprano.
   ============================================================ */

var Video = (function () {
    'use strict';

    var ESPERA_CORRECCION_MS = 5000;   /* minimo entre dos correcciones, para no "temblar" */

    var video = document.getElementById('fondo');
    var url = CONFIG.video.url;
    var sincronizar = CONFIG.video.sincronizar;
    var tolerancia = CONFIG.video.toleranciaSegundos;

    var cargado = false;          /* ya se le dio la direccion al video */
    var sincronizado = false;     /* ya se hizo el salto inicial al segundo correcto */
    var ultimaCorreccion = 0;
    var avisoAutoplay = false;

    function reproducir() {
        var promesa = video.play();
        if (promesa && promesa.catch) {
            promesa.catch(function (error) {
                if (!avisoAutoplay) {
                    avisoAutoplay = true;
                    console.warn('[VIDEO] el navegador bloqueo la reproduccion automatica (' + error.name +
                                 '). Se reintentara al primer clic o tecla.');
                    var reintentar = function () {
                        document.removeEventListener('click', reintentar);
                        document.removeEventListener('keydown', reintentar);
                        reproducir();
                    };
                    document.addEventListener('click', reintentar);
                    document.addEventListener('keydown', reintentar);
                }
            });
        }
    }

    function cargarFuente() {
        cargado = true;
        video.src = url;
    }

    function alLatir(lectura) {
        if (!url) { return; }

        /* Fuera de emision: pausa y se prepara para volver a sincronizar */
        if (!lectura.enVivo) {
            if (cargado && !video.paused) { video.pause(); }
            sincronizado = false;
            return;
        }

        if (!cargado) { cargarFuente(); }
        if (video.readyState < 1) { return; }   /* todavia sin datos basicos del video */

        /* Primer salto: al segundo que toca (o a cero, si no se sincroniza) */
        if (!sincronizado) {
            video.currentTime = sincronizar ? lectura.segundo : 0;
            sincronizado = true;
            ultimaCorreccion = Date.now();
            reproducir();
            return;
        }

        /* Correccion de desfase, solo cuando se esta reproduciendo con normalidad */
        if (sincronizar && !video.paused && !video.seeking) {
            var diferencia = Math.abs(video.currentTime - lectura.segundo);
            if (diferencia > tolerancia && Date.now() - ultimaCorreccion > ESPERA_CORRECCION_MS) {
                video.currentTime = lectura.segundo;
                ultimaCorreccion = Date.now();
            }
        }
    }

    function iniciar() {
        video.muted = true;
        video.playsInline = true;
        video.loop = !sincronizar;

        if (!url) {
            console.warn('[VIDEO] falta video.url en config.js: la emision se vera sin video.');
            return;
        }

        video.addEventListener('loadedmetadata', function () {
            var duracionEmision = Emision.leer().duracion;
            if (sincronizar && Math.abs(video.duration - duracionEmision) > 2) {
                console.warn('[VIDEO] el video dura ' + Math.round(video.duration) + ' s y la emision ' +
                             duracionEmision + ' s. Con sincronizar: true deberian ser iguales ' +
                             '(para probar con un fragmento corto usa sincronizar: false).');
            }
        });

        video.addEventListener('error', function () {
            var codigo = video.error ? video.error.code : '?';
            console.error('[VIDEO] no se pudo cargar "' + url + '" (codigo ' + codigo + '). Revisa la direccion.');
        });

        Emision.suscribir(alLatir);
    }

    iniciar();

}());
