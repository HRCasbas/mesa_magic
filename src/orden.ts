import type { CartaDelMazo } from './mazos'
import type { Carta } from './scryfall'

// Cómo se ordena un mazo para mirarlo: **por coste de maná, y las tierras
// en su propia sección al final** (Héctor, 30/10/2026). Es el orden en el
// que se piensa un mazo: lo barato arriba, lo caro abajo, y las tierras
// aparte, que ni se pagan ni se cuentan igual.
//
// Vive aquí y no dentro de una pantalla porque **se usa en dos sitios**:
// tus mazos y el del rival en plena partida. Un mazo se mira igual sea de
// quien sea.
//
// El orden guardado en la base no se toca: ese es el de la lista que se
// importó, y sirve para volver a sacarla tal cual.

const TIERRAS_BASICAS = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
  'llanura', 'isla', 'pantano', 'montaña', 'bosque',
])

/** Si una carta es tierra, con lo que se sepa de ella. */
export function esTierra(carta: CartaDelMazo, fotos: Map<string, Carta>): boolean {
  return pesoDe(carta, fotos.get(carta.nombre.toLowerCase())).tierra
}

/** El coste y si es tierra, con lo que se sepa de cada carta. */
function pesoDe(carta: CartaDelMazo, foto: Carta | undefined) {
  const porElNombre = TIERRAS_BASICAS.has(carta.nombre.trim().toLowerCase())
  // Dos redes por debajo de lo que diga Scryfall: el nombre de las
  // basicas, que no hay que preguntarselo a nadie, y la regla de que una
  // carta de coste cero SIN TIPO CONOCIDO es una tierra, porque en un
  // mazo de verdad casi siempre lo es. Esto coloca cartas en la pantalla:
  // una tierra fuera de su seccion se ve al momento.
  if (foto) {
    const sinTipo = (foto.tipo ?? '').trim() === ''
    return {
      tierra: foto.esTierra || porElNombre || (sinTipo && foto.coste === 0),
      coste: foto.coste,
    }
  }
  // Todavía no ha llegado de Scryfall. Las tierras básicas se reconocen
  // por el nombre y van a su sitio igual; el resto espera al final, para
  // que la lista no dé un salto raro cuando llegue la respuesta.
  return { tierra: porElNombre, coste: 99 }
}

export function porCoste(deLaZona: CartaDelMazo[], fotos: Map<string, Carta>): CartaDelMazo[] {
  return [...deLaZona].sort((una, otra) => {
    const a = pesoDe(una, fotos.get(una.nombre.toLowerCase()))
    const b = pesoDe(otra, fotos.get(otra.nombre.toLowerCase()))
    if (a.tierra !== b.tierra) return a.tierra ? 1 : -1
    if (a.coste !== b.coste) return a.coste - b.coste
    return una.nombre.localeCompare(otra.nombre)
  })
}
