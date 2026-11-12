/* ============================================================
   CHAPARRASTIQUE - config.js
   Todos los ajustes de la obra en un solo lugar.
   ============================================================ */

var CONFIG = {

    titulo: 'CHAPARRASTIQUE',

    /* ---------- Escenario ----------
       Tamano de la pagina en pixeles: el mismo del video. La pagina se
       amplia para llenar la ventana manteniendo la proporcion 16:9. */
    escenario: {
        ancho: 424,
        alto: 240
    },

    /* ---------- Horario de la emision ----------
       Hora de Colombia (UTC-5, sin horario de verano), igual para todo el mundo.
       De 15:53:00 a 18:09:00 hay 2 h 16 min = 8160 segundos. */
    horario: {
        inicio: '15:53:00',
        fin: '18:09:00',
        desfaseUTC: -5
    },

    /* ---------- Reloj ----------
       'ensayo' = finge que es horaEnsayo (para probar sin esperar). En esta
                  version tambien: no se envia nada a Sheety y aparece un
                  control para cambiar el numero de entradas.
       'real'   = hora verdadera y registro real de entradas. */
    reloj: {
        modo: 'ensayo',
        horaEnsayo: '15:53:00'
    },

    /* ---------- La frase fija ----------
       texto: la frase.
       ventanas: en que horas se ve (hora de Colombia).
         []  = durante toda la emision.
         [ { desde: '16:00:00', hasta: '16:30:00' }, { desde: '17:10:00', hasta: '17:20:00' } ]
             = solo dentro de esos intervalos.  

Om bhur bhuvah svah । Meditamos en el excelso resplandor del sol । para que él inspire nuestro intelecto ।।
             */

    frase: {
        texto: 'Om bhur bhuvah svah । Veneramos al Tres-Ojos, el fragante, el que nutre la prosperidad । Que nos libere de los lazos de la muerte, mas no de la inmortalidad । tal como un fruto maduro se desprende de su tallo ।।',
        ventanas: []
    },

    /* ---------- Video de fondo ----------
       url: direccion del video. Puede ser un archivo de tu carpeta
            ('video/atardecer.mp4') o una direccion completa ('https://...').
       sincronizar: true  = el video sigue al reloj (en el segundo 5 de la
                            emision, el video esta en su segundo 5). Es lo
                            correcto con el video completo.
                    false = el video arranca de cero y se repite en bucle.
                            Sirve para probar con un fragmento corto.
       toleranciaSegundos: diferencia maxima entre video y reloj antes de corregir. 
       https://archive.org/download/12.02.18VolcanChaparrastique/12.02.18%20Volca%CC%81n%20Chaparrastique%20%5Bsunset%5D.mp4
       */
    video: {
        url: 'sunsetligero.mp4',
        sincronizar: true,
        toleranciaSegundos: 2
    },

    /* ---------- Entradas ----------
       Cada vez que una persona entra a la pagina se agrega una fila a la hoja
       (via Sheety) y la pagina cuenta cuantas hay. Cada entrada suma
       pixelesPorEntrada pixeles blancos al velo, en orden de lectura (izquierda
       a derecha, arriba a abajo). Con 424 x 240 = 101.760 pixeles, la pantalla
       queda toda blanca a las 102 entradas.

       urlSheety:  direccion de la hoja en Sheety (es publica: queda en la pagina).
       raizSheety: nombre que Sheety espera al crear una fila (copialo del ejemplo
                   del panel de Sheety; para la hoja "sheet1" es 'sheet1').
       token:      solo si activas autenticacion en Sheety: 'Bearer TU_TOKEN'.
       ensayo:     entradas simuladas en modo ensayo (tambien: ?entradas=60
                   en la direccion, o el control deslizante en pantalla).
       maximoEnsayo: tope del control deslizante. */
    entradas: {
        urlSheety: 'https://api.sheety.co/ef7d42064b6ae293c639abc07948936a/basedatos/sheet1',
        raizSheety: 'sheet1',
        token: '',
        pixelesPorEntrada: 1000,
        ensayo: 0,
        maximoEnsayo: 120
    }
};
