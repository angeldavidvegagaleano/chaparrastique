/* ============================================================
   CHAPARRASTIQUE - velo.js
   La capa transparente sobre el video. Cada entrada la llena con
   pixelesPorEntrada pixeles blancos, en orden de lectura: de izquierda
   a derecha y de arriba abajo. Cuando todos los pixeles estan llenos,
   el video queda tapado.
   ============================================================ */

var Velo = (function () {
    'use strict';

    var lienzo = document.getElementById('velo');
    var contexto = lienzo.getContext('2d');
    var ancho = CONFIG.escenario.ancho;
    var alto = CONFIG.escenario.alto;

    /* Dibuja los primeros N pixeles. Se hace con dos rectangulos:
       las filas completas y el trozo de la fila que queda a medias. */
    function dibujar(totalEntradas) {
        var pixeles = Math.floor(Math.min(totalEntradas * CONFIG.entradas.pixelesPorEntrada, ancho * alto));
        var filasCompletas = Math.floor(pixeles / ancho);
        var resto = pixeles % ancho;

        contexto.clearRect(0, 0, ancho, alto);
        contexto.fillStyle = '#000';
        if (filasCompletas > 0) { contexto.fillRect(0, alto - filasCompletas, ancho, filasCompletas); }
        if (resto > 0) { contexto.fillRect(0, alto - filasCompletas - 1, resto, 1); }
    }

    function iniciar() {
        lienzo.width = ancho;    /* resolucion interna = 1 pixel del velo por pixel del video */
        lienzo.height = alto;
        Entradas.suscribir(dibujar);
    }

    iniciar();

}());
