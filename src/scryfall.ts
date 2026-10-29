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
  /** El identificador de la carta como concepto, igual en todos los idiomas. */
  oraculo: string | null
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

/**
 * Las imágenes de un mazo entero, de una vez.
 *
 * Un mazo son sesenta cartas, y pedirlas una a una serían sesenta
 * peticiones con su pausa entre medias: más de siete segundos y un abuso
 * de una API que es gratis. Scryfall tiene una entrada para pedir **hasta
 * setenta y cinco de golpe**, así que un mazo cabe en una sola petición.
 */
export async function porLote(nombres: string[]): Promise<Map<string, Carta>> {
  const encontradas = await pedirLote(nombres)

  // Las que no salen y acaban en un paréntesis, otra vez sin él. En los
  // mazos de Héctor hay un `Soul Swallower (tercera copia)`, que es una
  // nota suya: el nombre se respeta tal cual lo escribió, pero la foto es
  // la de la carta de verdad.
  const sinSuerte = nombres.filter((n) => !encontradas.has(n.toLowerCase()) && /\([^)]*\)\s*$/.test(n))
  if (sinSuerte.length > 0) {
    const desnudos = sinSuerte.map((n) => n.replace(/\s*\([^)]*\)\s*$/, '').trim())
    const segunda = await pedirLote(desnudos)
    sinSuerte.forEach((original, i) => {
      const carta = segunda.get(desnudos[i].toLowerCase())
      if (carta) encontradas.set(original.toLowerCase(), carta)
    })
  }

  return encontradas
}

async function pedirLote(nombres: string[]): Promise<Map<string, Carta>> {
  const encontradas = new Map<string, Carta>()
  for (let i = 0; i < nombres.length; i += 75) {
    const trozo = nombres.slice(i, i + 75)
    try {
      const datos = await enLaCola(async () => {
        const respuesta = await fetch(`${DIRECCION}/cards/collection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers: trozo.map((name) => ({ name })) }),
        })
        if (!respuesta.ok) return null
        return (await respuesta.json()) as { data?: Cruda[] }
      })
      for (const cruda of datos?.data ?? []) {
        const carta = ordenar(cruda)
        encontradas.set(carta.nombre.toLowerCase(), carta)
        // Las de dos caras vuelven como «Cara A // Cara B», y en el mazo
        // están escritas solo con la primera.
        const primeraCara = carta.nombre.split(' // ')[0]
        if (primeraCara !== carta.nombre) encontradas.set(primeraCara.toLowerCase(), carta)
      }
    } catch {
      // Sin imágenes se puede vivir: el mazo se ve igual, con los nombres.
    }
  }
  return encontradas
}

/** Lo que Scryfall sugiere al escribir el principio de un nombre. */
async function autocompletar(trozo: string): Promise<string[]> {
  try {
    const datos = await enLaCola(async () => {
      const r = await fetch(`${DIRECCION}/cards/autocomplete?q=${encodeURIComponent(trozo)}`)
      if (!r.ok) return null
      return (await r.json()) as { data?: string[] }
    })
    return datos?.data ?? []
  } catch {
    return []
  }
}

/**
 * Adivinar qué carta es una línea leída por el OCR.
 *
 * LA BÚSQUEDA NORMAL NO BASTA PARA ESTO: `fuzzy` perdona **un** fallo, y
 * un OCR sobre una foto de una carta comete más. Así que si falla se tira
 * de **autocompletar**, que trabaja con el principio del nombre y con
 * palabras sueltas, y perdona todo lo que venga detrás.
 *
 * Devuelve null sin quejarse: esto es una apuesta, no una búsqueda.
 */
export async function adivinar(linea: string, idioma: string): Promise<Carta | null> {
  const limpio = linea.trim()
  if (limpio.length < 3) return null

  try {
    return await enTuIdioma(await porNombre(limpio), idioma)
  } catch {
    // No era exacta. Se prueba a adivinarla.
  }

  const intentos: string[] = []
  // El principio suele leerse mejor que el final.
  if (limpio.length >= 5) intentos.push(limpio.slice(0, 8).trim())
  // Y una palabra larga suele ser la distintiva del nombre.
  const larga = limpio.split(' ').sort((a, b) => b.length - a.length)[0]
  if (larga && larga.length >= 5) intentos.push(larga)

  for (const intento of intentos) {
    const sugerencias = await autocompletar(intento)
    for (const sugerida of sugerencias.slice(0, 2)) {
      try {
        return await enTuIdioma(await porNombre(sugerida), idioma)
      } catch {
        // Esa tampoco. Siguiente.
      }
    }
  }
  return null
}

export async function buscar(escrito: string, idioma: string): Promise<Carta> {
  const limpio = escrito.trim()
  const comoNumero = PARECE_NUMERO.exec(limpio)
  const encontrada = comoNumero
    ? await porNumero(comoNumero[1], comoNumero[2], idioma)
    : await porNombre(limpio)
  return enTuIdioma(encontrada, idioma)
}

/**
 * La misma carta, impresa en el idioma que tengas puesto.
 *
 * ES LO QUE DE VERDAD HACÍA FALTA: una carta japonesa no se entiende
 * ampliándola, se entiende **traducida**. Si esa carta nunca se imprimió en
 * tu idioma, se devuelve la que hay y punto; es mejor enseñar la inglesa
 * que no enseñar nada.
 */
async function enTuIdioma(carta: Carta, idioma: string): Promise<Carta> {
  if (!idioma || carta.idioma === idioma || !carta.oraculo) return carta
  try {
    const busca = `/cards/search?q=${encodeURIComponent(`oracleid:${carta.oraculo} lang:${idioma}`)}&unique=prints`
    const respuesta = await enLaCola(async () => {
      const r = await fetch(`${DIRECCION}${busca}`)
      if (!r.ok) return null
      return (await r.json()) as { data?: Cruda[] }
    })
    const primera = respuesta?.data?.[0]
    return primera ? ordenar(primera) : carta
  } catch {
    return carta
  }
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
  oracle_id?: string
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
    oraculo: cruda.oracle_id ?? null,
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
