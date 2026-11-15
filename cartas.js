/* ============================================================
   CHAPARRASTIQUE - cartas.js
   Cuando alguien entra por la vez numero X (las X se definen en
   config.js > cartas.lista), la frase central se vuelve clicable y, al
   hacer clic, se abre una ventana emergente con un mensaje en texto plano
   (un archivo .html por mensaje, como las cartas de OASIS).

   En las demas ocasiones la frase no hace nada.

   MODO REAL:   la ocasion la calcula entradas.js (veces que esa IP ha entrado).
   MODO ENSAYO: la ocasion sale de ?ocasion=10 en la direccion, de
                config.js > cartas.ensayo o del cuadro "ingreso" de arriba a la izquierda.
   ============================================================ */

var Cartas = (function () {
    'use strict';

    var elemento = document.getElementById('frase');
    var ocasion = null;     /* vez numero N que esta persona entra */
    var carta = null;       /* la carta que le toca en esta ocasion, o null */
    var cuadro = null;      /* cuadro de ensayo */

    function lista() {
        return (CONFIG.cartas && CONFIG.cartas.lista) || [];
    }

    function buscar(n) {
        var cartas = lista();
        for (var i = 0; i < cartas.length; i++) {
            if (cartas[i].ocasion === n) { return cartas[i]; }
        }
        return null;
    }

    function fijarOcasion(n) {
        ocasion = n;
        carta = buscar(n);
        elemento.classList.toggle('carta', carta !== null);
        console.info('[CARTAS] ingreso numero ' + n + (carta ? ': hay una carta (' + carta.archivo + ').' : ': sin carta.'));
        if (cuadro && String(cuadro.value) !== String(n)) { cuadro.value = n; }
    }

    function abrir() {
        if (!carta) { return; }
        var ventana = window.open(carta.archivo, 'carta', (CONFIG.cartas && CONFIG.cartas.ventana) || 'width=420,height=520');
        if (!ventana) {
            console.warn('[CARTAS] el navegador bloqueo la ventana emergente.');
        }
    }

    /* Cursor de mano (y subrayado al pasar el mouse) solo cuando hay carta */
    function inyectarEstilo() {
        var estilo = document.createElement('style');
        estilo.textContent = '#frase.carta { cursor: pointer; } #frase.carta:hover { text-decoration: underline; }';
        document.head.appendChild(estilo);
    }

    function crearCuadro(n) {
        var caja = document.createElement('div');
        caja.style.cssText =
            'position:fixed; left:10px; top:10px; z-index:10; display:flex; gap:8px; align-items:center;' +
            'font:12px monospace; color:rgba(255,255,255,0.85); background:rgba(0,0,0,0.6); padding:4px 8px;';
        var etiqueta = document.createElement('span');
        etiqueta.textContent = 'ingreso numero';
        cuadro = document.createElement('input');
        cuadro.type = 'number';
        cuadro.min = 0;
        cuadro.value = n;
        cuadro.style.width = '60px';
        cuadro.addEventListener('input', function () {
            fijarOcasion(parseInt(cuadro.value, 10) || 0);
        });
        caja.appendChild(etiqueta);
        caja.appendChild(cuadro);
        document.body.appendChild(caja);
    }

    function iniciarEnsayo() {
        var deLaDireccion = new URLSearchParams(window.location.search).get('ocasion');
        var n = (deLaDireccion !== null) ? parseInt(deLaDireccion, 10) : ((CONFIG.cartas && CONFIG.cartas.ensayo) || 0);
        if (isNaN(n)) { n = 0; }
        crearCuadro(n);
        fijarOcasion(n);
    }

    function iniciar() {
        inyectarEstilo();
        elemento.addEventListener('click', abrir);

        if (CONFIG.reloj.modo === 'ensayo') { iniciarEnsayo(); }
        else { Entradas.suscribirOcasion(fijarOcasion); }
    }

    iniciar();

    return {
        ocasion: function () { return ocasion; },
        carta: function () { return carta; }
    };

}());
