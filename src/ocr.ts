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

/** El nombre va arriba del todo de la carta, en esta franja. */
const FRANJA_DEL_NOMBRE = 0.16

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
        // Una sola línea de texto: es lo que es el nombre de una carta.
        tessedit_pageseg_mode: '7' as never,
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

  // Se dibuja al triple de tamaño: a Tesseract le va mucho mejor con
  // letras grandes, y agrandar no inventa detalle pero sí ayuda al
  // reconocedor.
  const aumento = 3
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho * aumento
  lienzo.height = alto * aumento
  const pincel = lienzo.getContext('2d')
  if (!pincel) return null
  pincel.imageSmoothingQuality = 'high'
  pincel.drawImage(imagen, 0, 0, ancho, alto, 0, 0, lienzo.width, lienzo.height)

  // A blanco y negro con mucho contraste: el nombre de una carta es texto
  // oscuro sobre una banda clara, y quitarle el color ayuda.
  const datos = pincel.getImageData(0, 0, lienzo.width, lienzo.height)
  const p = datos.data
  for (let i = 0; i < p.length; i += 4) {
    const gris = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
    const v = gris > 140 ? 255 : gris < 90 ? 0 : gris
    p[i] = v
    p[i + 1] = v
    p[i + 2] = v
  }
  pincel.putImageData(datos, 0, 0)
  return lienzo
}

/** Lo que Tesseract escupe, limpio de basura. */
function limpiar(crudo: string): string {
  return crudo
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z ,.'-]/g, '')
    .trim()
}

/**
 * Lee el nombre de la carta de una foto. Devuelve null si no saca nada
 * que merezca la pena intentar.
 */
export async function leerNombre(imagenUrl: string): Promise<string | null> {
  const imagen = new Image()
  imagen.src = imagenUrl
  try {
    await imagen.decode()
  } catch {
    return null
  }

  const franja = soloElNombre(imagen)
  if (!franja) return null

  try {
    const quien = await conseguirTrabajador()
    const { data } = await quien.recognize(franja)
    const nombre = limpiar(data.text)
    // Menos de tres letras no es el nombre de nada.
    return nombre.length >= 3 ? nombre : null
  } catch {
    return null
  }
}
