// Leer el nombre de una carta de la foto que ha mandado el otro.
//
// LO QUE ESTO ES Y LO QUE NO. Es un **acelerador**: te ahorra teclear el
// nombre. No es una vía nueva, porque todo lo que hace ya se puede hacer a
// mano en el buscador de al lado. Por eso puede fallar sin que pase nada:
// si no acierta, escribes el nombre y listo.
//
// POR QUÉ SOBRE LA FOTO Y NO SOBRE EL VÍDEO. Con el tapete encuadrado a
// 1080p, el nombre de una carta mide unos diez píxeles de alto, y Tesseract
// necesita treinta por letra. Sobre el recorte a resolución nativa que
// manda el otro navegador, el mismo nombre mide tres o cuatro veces más.
//
// LO QUE PESA: unos 4-5 MB la primera vez (la biblioteca, el núcleo wasm y
// los datos del inglés en su versión rápida). Por eso **se carga al
// usarlo**, nunca al abrir la web.

/**
 * Cuánto se mira de arriba del recorte.
 *
 * SE MIRABA EL 16 % Y NO VALÍA (Héctor, 29/10/2026: «con definición muy
 * buena no detecta el nombre»). El fallo era **dar por hecho dónde está el
 * nombre**: eso solo se cumple si encuadras la carta clavada. Encuadrando
 * un poco ancho —que es lo normal—, ese 16 % es mesa, no nombre.
 *
 * Ahora se mira el tercio de arriba entero, se saca **todo el texto que
 * haya** y se prueban las líneas una por una contra Scryfall. Vale igual
 * si has encuadrado justo o con margen.
 */
const FRANJA_DEL_NOMBRE = 0.38

/** Letras que puede tener el nombre de una carta. Nada de símbolos raros. */
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ,.'-"

/** Lo de abajo a la izquierda: «0198/0249 U» y «IMA • EN». */
const LETRAS_DE_LAS_SENAS = '0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ '

type Trabajador = {
  recognize: (imagen: HTMLCanvasElement) => Promise<{ data: { text: string } }>
  setParameters: (ajustes: Record<string, unknown>) => Promise<unknown>
}

let trabajador: Promise<Trabajador> | null = null

/** Carga Tesseract la primera vez que hace falta, y solo una vez. */
function conseguirTrabajador(): Promise<Trabajador> {
  if (!trabajador) {
    trabajador = import('tesseract.js').then(async (tesseract) => {
      const nuevo = await tesseract.createWorker('eng')
      await nuevo.setParameters({
        // Un bloque de texto, no una sola línea: en el trozo que se mira
        // puede haber el nombre y algo más, y queremos todo para ir
        // probando. La lista de caracteres se pone antes de cada lectura,
        // porque leer un nombre y leer un número no se parecen en nada.
        tessedit_pageseg_mode: '6' as never,
      })
      return nuevo as unknown as Trabajador
    })
  }
  return trabajador
}

/**
 * Una copia con los colores del revés.
 *
 * ESTO ERA EL FALLO DE VERDAD (29/10/2026). Tesseract da por hecho **texto
 * oscuro sobre fondo claro**, y en Magic la banda del nombre es muchas
 * veces al revés: letras claras sobre una banda oscura. Con una carta así
 * no lee mal, **no lee nada**: de «Ghalta the Unstoppable», con la foto
 * perfecta, sacó «a - a SEN a».
 *
 * Las cartas pintadas de las pruebas tenían letra oscura sobre banda
 * clara, que es justo el caso que sí funcionaba. Por eso tres arreglos
 * seguidos no dieron con ello.
 */
function alReves(fuente: HTMLCanvasElement): HTMLCanvasElement {
  const vuelta = document.createElement('canvas')
  vuelta.width = fuente.width
  vuelta.height = fuente.height
  const pincel = vuelta.getContext('2d')
  if (!pincel) return fuente
  pincel.drawImage(fuente, 0, 0)
  const datos = pincel.getImageData(0, 0, vuelta.width, vuelta.height)
  const p = datos.data
  for (let i = 0; i < p.length; i += 4) {
    p[i] = 255 - p[i]
    p[i + 1] = 255 - p[i + 1]
    p[i + 2] = 255 - p[i + 2]
  }
  pincel.putImageData(datos, 0, 0)
  return vuelta
}

/**
 * Recorta un trozo de la foto, lo agranda y lo deja listo para leer.
 *
 * Los cuatro números van de 0 a 1, como las pegatinas: así da igual a qué
 * resolución venga la foto.
 */
function recortar(
  imagen: HTMLImageElement,
  desdeX: number,
  desdeY: number,
  anchoParte: number,
  altoParte: number,
): HTMLCanvasElement | null {
  const x = Math.round(imagen.naturalWidth * desdeX)
  const y = Math.round(imagen.naturalHeight * desdeY)
  const ancho = Math.max(1, Math.round(imagen.naturalWidth * anchoParte))
  const alto = Math.max(1, Math.round(imagen.naturalHeight * altoParte))
  if (!imagen.naturalWidth || !imagen.naturalHeight) return null

  // Se agranda para que a Tesseract le lleguen letras grandes, pero sin
  // pasarse: una imagen enorme tarda mucho más y no lee mejor.
  const aumento = Math.min(4, Math.max(1, 1400 / ancho))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(ancho * aumento)
  lienzo.height = Math.round(alto * aumento)
  const pincel = lienzo.getContext('2d')
  if (!pincel) return null
  pincel.imageSmoothingQuality = 'high'
  pincel.drawImage(imagen, x, y, ancho, alto, 0, 0, lienzo.width, lienzo.height)

  // SOLO A GRISES, SIN FORZAR BLANCO Y NEGRO. Antes se partía en dos a
  // ojo (claro o oscuro) y eso se comía las letras cuando la foto venía
  // más clara o más oscura de lo previsto. Tesseract hace ese corte por su
  // cuenta y mirando la imagen, que es mejor que un número puesto a mano.
  const datos = pincel.getImageData(0, 0, lienzo.width, lienzo.height)
  const p = datos.data

  // A grises, y de paso se mira cuánto se separan el más claro y el más
  // oscuro para estirar el contraste después.
  let masOscuro = 255
  let masClaro = 0
  for (let i = 0; i < p.length; i += 4) {
    const gris = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
    p[i] = gris
    p[i + 1] = gris
    p[i + 2] = gris
    if (gris < masOscuro) masOscuro = gris
    if (gris > masClaro) masClaro = gris
  }

  // ⚠ SI NO HAY NADA, NO SE LEE NADA. Se mira ANTES de estirar el
  // contraste, porque estirar le saca relieve hasta al ruido. Encuadrando
  // un trozo liso —un hueco negro de la mesa— el lector sacaba basura
  // («EIGEN Ly») y luego se buscaba esa basura. Un trozo donde casi todos
  // los píxeles son del mismo tono no tiene texto, y punto.
  const recorrido = masClaro - masOscuro
  const medio = (masOscuro + masClaro) / 2
  let conSustancia = 0
  for (let i = 0; i < p.length; i += 4) {
    if (Math.abs(p[i] - medio) > 40) conSustancia += 1
  }
  if (recorrido < 60 || conSustancia / (p.length / 4) < 0.03) return null

  // Estirar el contraste: una foto de una carta con brillos sale apagada,
  // y esto le devuelve el blanco y el negro sin inventarse nada.
  if (recorrido > 10) {
    for (let i = 0; i < p.length; i += 4) {
      const v = ((p[i] - masOscuro) * 255) / recorrido
      p[i] = v
      p[i + 1] = v
      p[i + 2] = v
    }
  }

  pincel.putImageData(datos, 0, 0)
  return lienzo
}

/** Una línea leída que no puede ser el nombre de nada. */
function esBasura(linea: string): boolean {
  // Tiene que tener al menos una palabra de cuatro letras. «a - a SEN a»,
  // que es lo que salía con las bandas oscuras, se queda fuera por aquí.
  return !linea.split(' ').some((palabra) => palabra.length >= 4)
}

/** Una línea de las que escupe Tesseract, limpia de basura. */
function limpiar(crudo: string): string {
  return crudo
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z ,.'-]/g, '')
    .trim()
}

/**
 * Lee el trozo de arriba de la carta y devuelve **los candidatos a
 * nombre**, el más prometedor primero.
 *
 * No devuelve uno solo a propósito: no hay forma de saber cuál de las
 * líneas es el nombre, así que se devuelven todas y quien llama las va
 * probando contra Scryfall hasta que una acierta. Scryfall es el que sabe
 * qué es una carta; esto solo sabe leer.
 */
export async function leerNombres(imagenUrl: string): Promise<string[]> {
  const imagen = new Image()
  imagen.src = imagenUrl
  try {
    await imagen.decode()
  } catch {
    return []
  }

  const franja = recortar(imagen, 0, 0, 1, FRANJA_DEL_NOMBRE)
  if (!franja) return []

  try {
    const quien = await conseguirTrabajador()
    // DOS PASADAS: tal cual y con los colores del revés. En Magic la
    // banda del nombre tanto puede ser oscura sobre claro como clara
    // sobre oscuro, y Tesseract solo sabe leer lo primero.
    await quien.setParameters({ tessedit_char_whitelist: LETRAS })
    const lineas: string[] = []
    for (const version of [franja, alReves(franja)]) {
      const { data } = await quien.recognize(version)
      for (const cruda of data.text.split('\n')) {
        const linea = limpiar(cruda)
        // Menos de tres letras no es el nombre de nada, y más de cuarenta
        // tampoco: eso ya es el texto de reglas.
        if (linea.length < 3 || linea.length > 40) continue
        if (esBasura(linea)) continue
        lineas.push(linea)
      }
    }

    // Sin repetir, y las primeras antes: el nombre va arriba del todo.
    return [...new Set(lineas)].slice(0, 6)
  } catch {
    return []
  }
}


// ---- Las señas de abajo a la izquierda ----
//
// POR QUÉ ESTO Y NO EL NOMBRE (Héctor, 31/10/2026). Leer el nombre es
// pedirle a un lector de texto lo que peor se le da: letra de fantasía,
// con filos, encima de la ilustración y con brillos. En cambio abajo a la
// izquierda toda carta moderna lleva dos líneas de letra de palo sobre
// fondo liso:
//
//     0198/0249 U
//     IMA • EN  Zoltan Boros
//
// Eso son **dígitos y mayúsculas**, que es lo único que un lector hace
// bien. Y con la edición y el número, Scryfall devuelve la carta exacta:
// no «una carta que se llama parecido», sino esa, con su ilustración y su
// edición. Encima vale igual para una carta en japonés.
//
// LO QUE NO CUBRE: las cartas anteriores a 2015 no llevan número de
// coleccionista. Para esas sigue estando la lectura del nombre, que corre
// después, y el buscador de al lado.

/** El trozo de abajo a la izquierda donde están la edición y el número. */
const SENAS_DESDE_ARRIBA = 0.88
const SENAS_DE_ANCHO = 0.55

/** Una carta identificada por su edición y su número. */
export interface Senas {
  edicion: string
  numero: string
}

/** Las ediciones son de tres a cinco letras o cifras. */
const PARECE_EDICION = /^[A-Z0-9]{2,5}$/

/** Lo que nunca es una edición, aunque lo parezca. */
const NO_ES_EDICION = new Set(['THE', 'AND', 'ILL', 'TM', 'EN', 'ES', 'FR', 'DE', 'IT', 'PT', 'JA', 'KO', 'RU', 'ZHS', 'ZHT'])

/**
 * Saca las señas de lo que ha leído el lector.
 *
 * Se devuelven **todas las combinaciones** de los números y las ediciones
 * que se hayan visto, no una sola: el lector confunde un 0 con una O más
 * de lo que parece, y quien llama las va probando contra Scryfall, que es
 * el que sabe cuál existe.
 */
export function senasDe(texto: string): Senas[] {
  const numeros: string[] = []
  const ediciones: string[] = []

  for (const cruda of texto.split('\n')) {
    const linea = cruda.replace(/\s+/g, ' ').trim()
    if (!linea) continue

    // El número de la carta, en sus dos formatos: «0198/0249» de las
    // cartas de hasta 2022, y «0527» a secas de las de ahora. De la
    // barra se queda el de delante, y los ceros de la izquierda sobran
    // para buscar.
    const conBarra = /(\d{1,4})\s*\/\s*\d{1,4}/.exec(linea)
    const sueltos = conBarra ? [conBarra[1]] : linea.match(/\d{1,4}/g) ?? []
    for (const crudo of sueltos) {
      const limpio = crudo.replace(/^0+/, '') || '0'
      if (!numeros.includes(limpio)) numeros.push(limpio)
    }

    // La edición va la primera de su línea: «IMA EN Zoltan Boros». Se
    // coge solo la primera que valga, porque si no el apellido del
    // dibujante entra también y son combinaciones de más que probar.
    for (const trozo of linea.split(' ')) {
      const palabra = trozo.replace(/[^A-Z0-9]/g, '')
      if (!PARECE_EDICION.test(palabra)) continue
      if (NO_ES_EDICION.has(palabra)) continue
      // Solo cifras es parte del número, no una edición.
      if (/^\d+$/.test(palabra)) continue
      if (!ediciones.includes(palabra)) ediciones.push(palabra)
      break
    }
  }

  const salida: Senas[] = []
  for (const edicion of ediciones) {
    for (const numero of numeros) salida.push({ edicion, numero })
  }

  // DE MÁS A MENOS PROBABLE, y no es un capricho: cada una que se prueba
  // es una pregunta a Scryfall con su pausa, así que el orden decide si la
  // carta sale al momento o después de un segundo largo. Con cartas de
  // verdad (31/10/2026) esta regla acertó a la primera en las seis.
  //
  // Una edición de tres es lo normal («IMA», «DOM», «NEO»); las de dos o
  // de cinco que salen son casi siempre mal leídas o un trozo de otra
  // cosa. Y entre dos números, el más largo gana: los cortos vienen de
  // leer un pedazo suelto.
  return salida.sort(masProbable).slice(0, 12)
}

/**
 * Cuál se prueba antes.
 *
 * Una edición de tres es lo normal («IMA», «DOM», «NEO»); las de dos o de
 * cinco que salen son casi siempre mal leídas o un trozo de otra cosa. Y
 * entre dos números, el más largo gana: los cortos vienen de leer un
 * pedazo suelto. Con cartas de verdad (31/10/2026) esta regla deja la
 * buena la primera.
 */
function masProbable(una: Senas, otra: Senas): number {
  const tresUna = una.edicion.length === 3 ? 0 : 1
  const tresOtra = otra.edicion.length === 3 ? 0 : 1
  if (tresUna !== tresOtra) return tresUna - tresOtra
  return otra.numero.length - una.numero.length
}

/**
 * Lee la esquina de abajo a la izquierda y devuelve las señas que ve.
 *
 * El más prometedor primero. Vacío si no ha sabido leer nada, que con una
 * carta vieja o una foto movida pasa, y no es grave: detrás va la lectura
 * del nombre.
 */
export async function leerSenas(imagenUrl: string): Promise<Senas[]> {
  const imagen = new Image()
  imagen.src = imagenUrl
  try {
    await imagen.decode()
  } catch {
    return []
  }

  const esquina = recortar(imagen, 0, SENAS_DESDE_ARRIBA, SENAS_DE_ANCHO, 1 - SENAS_DESDE_ARRIBA)
  if (!esquina) return []

  try {
    const quien = await conseguirTrabajador()
    await quien.setParameters({ tessedit_char_whitelist: LETRAS_DE_LAS_SENAS })

    const vistas: Senas[] = []
    // Dos pasadas, igual que con el nombre: esa esquina es letra blanca
    // sobre marco oscuro en casi todas, pero no en todas.
    for (const version of [esquina, alReves(esquina)]) {
      const { data } = await quien.recognize(version)
      for (const senas of senasDe(data.text)) {
        if (!vistas.some((v) => v.edicion === senas.edicion && v.numero === senas.numero)) {
          vistas.push(senas)
        }
      }
    }
    // SE ORDENA AL FINAL, no dentro de cada pasada: con las dos pasadas
    // acumulando una detrás de otra, la buena de la segunda quedaba
    // detrás de las mal leídas de la primera.
    return vistas.sort(masProbable)
  } catch {
    return []
  }
}
