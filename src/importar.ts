import type { Zona } from './mazos'

// Leer una lista de cartas pegada tal cual.
//
// Es el formato que sacan Moxfield y Arena, que es el que usa Héctor:
// una carta por línea, `cantidad nombre`, con la edición y el número
// opcionales detrás. Se eligió entender ESE formato y no inventarse uno
// porque lo que mata esta función es que haya que teclear sesenta cartas.

export interface CartaLeida {
  nombre: string
  cantidad: number
  zona: Zona
  orden: number
}

export interface Lectura {
  cartas: CartaLeida[]
  /** Las líneas que no se han entendido, para poder decirlo. */
  perdidas: string[]
}

/**
 * La edición, cuando la hay.
 *
 * ⚠ LA TRAMPA: hay paréntesis que NO son la edición. En los mazos de
 * Héctor hay un `Soul Swallower (tercera copia)`, que es una nota suya.
 * Por eso solo cuenta como edición si son **de dos a seis letras o
 * números entre paréntesis Y van seguidos de un número**, que es lo que
 * escriben Moxfield y Arena.
 */
const EDICION_AL_FINAL = /\s+\([A-Za-z0-9]{2,6}\)\s+[A-Za-z0-9★-]+\s*$/

/** `4 Lightning Bolt`, y también `4x Lightning Bolt`. */
const LINEA_DE_CARTA = /^(\d{1,2})\s*x?\s+(.+)$/i

/** Qué zona abre una línea de encabezado, si es que abre alguna. */
function zonaDeEncabezado(linea: string): Zona | null {
  const limpia = linea.replace(/^\/\/+/, '').trim().toLowerCase()
  if (limpia.startsWith('maybe')) return 'posibles'
  if (limpia.startsWith('side') || limpia.startsWith('banquillo')) return 'banquillo'
  if (limpia.startsWith('deck') || limpia.startsWith('mazo') || limpia.startsWith('main')) {
    return 'principal'
  }
  return null
}

export function interpretarLista(texto: string): Lectura {
  const cartas: CartaLeida[] = []
  const perdidas: string[] = []
  let zona: Zona = 'principal'
  const cuantas: Record<Zona, number> = { principal: 0, banquillo: 0, posibles: 0 }

  for (const cruda of texto.split('\n')) {
    const linea = cruda.trim()
    if (!linea) continue

    const cambio = zonaDeEncabezado(linea)
    if (cambio) {
      zona = cambio
      continue
    }
    // Un comentario que no abre zona no es nada.
    if (linea.startsWith('//') || linea.startsWith('#')) continue

    const trozos = LINEA_DE_CARTA.exec(linea)
    if (!trozos) {
      perdidas.push(linea)
      continue
    }

    const cantidad = Math.min(99, Math.max(1, Number(trozos[1])))
    const nombre = trozos[2].replace(EDICION_AL_FINAL, '').trim()
    if (!nombre) {
      perdidas.push(linea)
      continue
    }

    cuantas[zona] += 1
    cartas.push({ nombre: nombre.slice(0, 200), cantidad, zona, orden: cuantas[zona] })
  }

  return { cartas, perdidas }
}

/** Cuántas cartas suman, que es lo que se mira para saber si cuadra. */
export function sumar(cartas: CartaLeida[], zona: Zona): number {
  return cartas.filter((c) => c.zona === zona).reduce((suma, c) => suma + c.cantidad, 0)
}
