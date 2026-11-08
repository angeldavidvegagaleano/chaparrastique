/* ============================================================
   CHAPARRASTIQUE - frase.js
   La frase fija. Se ve durante las ventanas de hora definidas en
   config.js (frase.ventanas), o durante toda la emision si no hay ninguna.
   ============================================================ */

var Frase = (function () {
    'use strict';

    var elemento = document.getElementById('frase');
    var ventanas = [];        /* [{ desde, hasta }] en segundos desde medianoche */
    var visible = null;

    function leerVentanas() {
        var lista = CONFIG.frase.ventanas || [];
        for (var i = 0; i < lista.length; i++) {
            var desde = Emision.horaASegundos(lista[i].desde);
            var hasta = Emision.horaASegundos(lista[i].hasta);
            if (desde === null || hasta === null || hasta <= desde) {
                console.error('[FRASE] la ventana ' + (i + 1) + ' no es valida (usa desde y hasta como ' +
                              '"HH:MM:SS", con hasta posterior a desde). Se ignora.');
            } else {
                ventanas.push({ desde: desde, hasta: hasta });
            }
        }
    }

    function dentroDeVentana(hora) {
        if (ventanas.length === 0) { return true; }
        for (var i = 0; i < ventanas.length; i++) {
            if (hora >= ventanas[i].desde && hora < ventanas[i].hasta) { return true; }
        }
        return false;
    }

    function alLatir(lectura) {
        var debeVerse = lectura.enVivo && dentroDeVentana(lectura.hora);
        if (debeVerse !== visible) {
            visible = debeVerse;
            elemento.classList.toggle('oculta', !debeVerse);
        }
        if (lectura.enVivo) {   /* de 0 a 1 a lo largo de la emisión */
            elemento.style.opacity = lectura.segundo / lectura.duracion;
        }
    }

    function iniciar() {
        if (!CONFIG.frase.texto) {
            console.warn('[FRASE] frase.texto esta vacio en config.js.');
        }
        elemento.textContent = CONFIG.frase.texto;   /* textContent: siempre como texto, nunca como codigo */
        elemento.classList.add('oculta');            /* oculta hasta el primer latido */
        leerVentanas();
        Emision.suscribir(alLatir);
    }

    iniciar();

}());
