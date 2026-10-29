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

type Trabajador = {
  recognize: (imagen: HTMLCanvasElement) => Promise<{ data: { text: string } }>
}

let trabajador: Promise<Trabajador> | null = null

/** Carga Tesseract la primera vez que hace falta, y solo una vez. */
function conseguirTrabajador(): Promise<Trabajador> {
  if (!trabajador) {
    trabajador = import('tesseract.js').then(async (tesseract) => {
      const nuevo = await tesseract.createWorker('eng')
      await nuevo.setParameters({
        tessedit_char_whitelist: LETRAS,
        // Un bloque de texto, no una sola línea: en el trozo de arriba de
        // la carta puede haber el nombre y algo más, y queremos todo para
        // ir probando.
        tessedit_pageseg_mode: '6' as never,
      })
      return nuevo as unknown as Trabajador
    })
  }
  return trabajador
}

/** Recorta la franja de arriba y la agranda, que es donde está el nombre. */
function soloElNombre(imagen: HTMLImageElement): HTMLCanvasElement | null {
  const alto = Math.max(1, Math.round(imagen.naturalHeight * FRANJA_DEL_NOMBRE))
  const ancho = imagen.naturalWidth
  if (!ancho || !alto) return null

  // Se agranda para que a Tesseract le lleguen letras grandes, pero sin
  // pasarse: una imagen enorme tarda mucho más y no lee mejor.
  const aumento = Math.min(3, Math.max(1, 1400 / ancho))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(ancho * aumento)
  lienzo.height = Math.round(alto * aumento)
  const pincel = lienzo.getContext('2d')
  if (!pincel) return null
  pincel.imageSmoothingQuality = 'high'
  pincel.drawImage(imagen, 0, 0, ancho, alto, 0, 0, lienzo.width, lienzo.height)

  // SOLO A GRISES, SIN FORZAR BLANCO Y NEGRO. Antes se partía en dos a
  // ojo (claro o oscuro) y eso se comía las letras cuando la foto venía
  // más clara o más oscura de lo previsto. Tesseract hace ese corte por su
  // cuenta y mirando la imagen, que es mejor que un número puesto a mano.
  const datos = pincel.getImageData(0, 0, lienzo.width, lienzo.height)
  const p = datos.data
  for (let i = 0; i < p.length; i += 4) {
    const gris = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
    p[i] = gris
    p[i + 1] = gris
    p[i + 2] = gris
  }
  pincel.putImageData(datos, 0, 0)
  return lienzo
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

  const franja = soloElNombre(imagen)
  if (!franja) return []

  try {
    const quien = await conseguirTrabajador()
    const { data } = await quien.recognize(franja)
    const lineas = data.text
      .split('\n')
      .map(limpiar)
      // Menos de tres letras no es el nombre de nada, y más de cuarenta
      // tampoco: eso ya es el texto de reglas.
      .filter((l) => l.length >= 3 && l.length <= 40)

    // Sin repetir, y las primeras antes: el nombre va arriba del todo.
    return [...new Set(lineas)].slice(0, 4)
  } catch {
    return []
  }
}
