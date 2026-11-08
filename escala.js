/* ============================================================
   CHAPARRASTIQUE - escala.js
   Da al escenario su tamano (424 x 240) y lo amplia para llenar
   la ventana.

   - Pantallas 16:9 (1920x1080, 1366x768...): se llenan por completo.
     424x240 es 1,767 y 16:9 es 1,778; la diferencia (0,6%) es invisible,
     asi que en estas pantallas se estira ese poquito para no dejar franjas.
   - Otras proporciones: se amplia sin deformar y quedan franjas negras.
   ============================================================ */

var Escala = (function () {
    'use strict';

    var TOLERANCIA_16_9 = 0.015;   /* hasta 1,5% de diferencia se considera 16:9 */

    var escenario = document.getElementById('escenario');

    function ajustar() {
        var ancho = CONFIG.escenario.ancho;
        var alto = CONFIG.escenario.alto;
        var kx = window.innerWidth / ancho;
        var ky = window.innerHeight / alto;

        var proporcion = window.innerWidth / window.innerHeight;
        var es169 = Math.abs(proporcion / (16 / 9) - 1) <= TOLERANCIA_16_9;

        if (!es169) {                  /* sin deformar: la escala menor, con franjas */
            kx = ky = Math.min(kx, ky);
        }
        var raiz = document.documentElement.style;
        raiz.setProperty('--escala-x', kx);
        raiz.setProperty('--escala-y', ky);
    }

    function iniciar() {
        var ancho = CONFIG.escenario.ancho;
        var alto = CONFIG.escenario.alto;
        escenario.style.width = ancho + 'px';
        escenario.style.height = alto + 'px';
        escenario.style.marginLeft = (-ancho / 2) + 'px';
        escenario.style.marginTop = (-alto / 2) + 'px';

        ajustar();
        window.addEventListener('resize', ajustar);
    }

    iniciar();

    return { ajustar: ajustar };

}());
