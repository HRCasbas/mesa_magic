// Preguntarle a Scryfall qué carta es esta.
//
// Scryfall es gratis y no pide clave. Lo que sí pide es **dejar entre 50 y
// 100 ms entre peticiones**, y eso se respeta con una cola: aquí nunca
// salen dos a la vez.
//
// (La otra cosa que pide, un `User-Agent` propio, un navegador no la puede
// cumplir: la cabecera es de las que el navegador no deja tocar. Lo que
// está en nuestra mano es el ritmo, y ese se cumple.)

const DIRECCION = 'https://api.scryfall.com'
const DESCANSO = 120

export interface Carta {
  id: string
  /** El nombre en inglés, que es el que sirve para buscar en cualquier sitio. */
  nombre: string
  /** El nombre tal y como está impreso. En una japonesa no es el mismo. */
  nombreImpreso: string | null
  imagen: string | null
  edicion: string
  edicionNombre: string
  numero: string
  idioma: string
  /** La página de Scryfall, por si quieres leerla entera. */
  pagina: string
}

/**
 * Un solo sitio para buscar (Héctor, 28/10/2026: «no quiero una sección
 * para cada cosa»).
 *
 * Si lo escrito son **tres o cuatro letras, un espacio y un número**, es un
 * número de colección: `NEO 123`. Lo demás es un nombre. No hay que elegir
 * nada: se mira lo escrito y ya.
 */
const PARECE_NUMERO = /^([A-Za-z0-9]{3,5})\s+([0-9]+[a-z★]?)$/

export async function buscar(escrito: string): Promise<Carta> {
  const limpio = escrito.trim()
  const comoNumero = PARECE_NUMERO.exec(limpio)
  if (comoNumero) return porNumero(comoNumero[1], comoNumero[2])
  return porNombre(limpio)
}

let cola: Promise<unknown> = Promise.resolve()

/** Encadena las peticiones y les deja aire entre una y otra. */
function enLaCola<T>(trabajo: () => Promise<T>): Promise<T> {
  const mio = cola.then(trabajo)
  cola = mio.then(
    () => new Promise((listo) => setTimeout(listo, DESCANSO)),
    () => new Promise((listo) => setTimeout(listo, DESCANSO)),
  )
  return mio
}

/** Lo que devuelve Scryfall, de lo que solo se usa un puñado de campos. */
interface Cruda {
  id: string
  name: string
  printed_name?: string
  lang: string
  set: string
  set_name: string
  collector_number: string
  scryfall_uri: string
  image_uris?: { normal?: string; large?: string }
  card_faces?: { image_uris?: { normal?: string; large?: string } }[]
}

function ordenar(cruda: Cruda): Carta {
  // Las cartas de dos caras no traen imagen arriba: la traen por cara.
  const deLaCara = cruda.card_faces?.[0]?.image_uris
  const imagenes = cruda.image_uris ?? deLaCara
  return {
    id: cruda.id,
    nombre: cruda.name,
    nombreImpreso: cruda.printed_name && cruda.printed_name !== cruda.name ? cruda.printed_name : null,
    imagen: imagenes?.large ?? imagenes?.normal ?? null,
    edicion: cruda.set.toUpperCase(),
    edicionNombre: cruda.set_name,
    numero: cruda.collector_number,
    idioma: cruda.lang,
    pagina: cruda.scryfall_uri,
  }
}

async function pedir(ruta: string): Promise<Cruda | null> {
  return enLaCola(async () => {
    const respuesta = await fetch(`${DIRECCION}${ruta}`)
    if (respuesta.status === 404) return null
    if (!respuesta.ok) throw new Error('mal')
    return (await respuesta.json()) as Cruda
  })
}

/**
 * Vía B: por el nombre.
 *
 * `fuzzy` perdona **un** fallo de escritura, no dos. Está medido y escrito
 * en las directrices: no prometer más de lo que aguanta.
 */
export async function porNombre(nombre: string): Promise<Carta> {
  const limpio = nombre.trim()
  if (!limpio) throw new Error('Escribe algo que buscar.')
  let cruda: Cruda | null
  try {
    cruda = await pedir(`/cards/named?fuzzy=${encodeURIComponent(limpio)}`)
  } catch {
    throw new Error('No se ha podido preguntar a Scryfall. ¿Hay internet?')
  }
  if (!cruda) {
    throw new Error(`No encuentro ninguna carta que se llame «${limpio}». Mira si falta alguna letra.`)
  }
  return ordenar(cruda)
}

/**
 * Vía A: por el número de colección. La buena.
 *
 * Es **idéntico en todos los idiomas** y es ASCII puro, así que vale para
 * una carta japonesa que no sabes ni cómo se llama. Y el resultado es
 * exacto, no aproximado.
 */
export async function porNumero(edicion: string, numero: string, idioma = ''): Promise<Carta> {
  const codigo = edicion.trim().toLowerCase()
  const cual = numero.trim().toLowerCase()
  if (!codigo || !cual) throw new Error('Hacen falta la edición y el número.')

  const base = `/cards/${encodeURIComponent(codigo)}/${encodeURIComponent(cual)}`
  let cruda: Cruda | null
  try {
    cruda = await pedir(idioma ? `${base}/${idioma}` : base)
    // Esa carta puede existir y no estar impresa en ese idioma. Antes de
    // decir que no hay nada, se mira si existe sin pedir idioma.
    if (!cruda && idioma) cruda = await pedir(base)
  } catch {
    throw new Error('No se ha podido preguntar a Scryfall. ¿Hay internet?')
  }

  if (!cruda) {
    throw new Error(
      `No encuentro la ${cual} de ${codigo.toUpperCase()}. El código de la edición son las tres o cuatro letras de abajo del todo.`,
    )
  }
  return ordenar(cruda)
}
