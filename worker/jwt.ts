// Comprobar que una sesion de Supabase es de verdad, sin preguntarle a
// Supabase y sin guardar ningun secreto.
//
// Supabase firma los tokens de este proyecto con ES256 y publica la clave
// PUBLICA de comprobacion en una direccion abierta. O sea que aqui solo hace
// falta esa clave publica: no hay nada que esconder ni que rotar, y una vez
// descargada queda en memoria. Por eso una partida en marcha no se cae si
// Supabase se duerme: el Worker ya no necesita preguntarle nada.

const DIRECCION_SUPABASE = 'https://jwumnclmdsvcdkbsvikq.supabase.co'
const DIRECCION_CLAVES = `${DIRECCION_SUPABASE}/auth/v1/.well-known/jwks.json`

/** Cuanto se guardan las claves antes de volver a pedirlas. */
const DURACION_CACHE_MS = 60 * 60 * 1000

/** Una clave tal y como la publica Supabase, con su identificador. */
type ClaveJwk = JsonWebKey & { kid: string }

let clavesEnMemoria: Map<string, CryptoKey> | null = null
let clavesPedidasEn = 0

export interface Credencial {
  /** El identificador del usuario en Supabase. */
  id: string
  correo: string | null
}

function deBase64Url(texto: string): Uint8Array {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binario = atob(relleno)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

function textoDeBase64Url(texto: string): string {
  return new TextDecoder().decode(deBase64Url(texto))
}

async function obtenerClaves(): Promise<Map<string, CryptoKey>> {
  const ahora = Date.now()
  if (clavesEnMemoria && ahora - clavesPedidasEn < DURACION_CACHE_MS) {
    return clavesEnMemoria
  }

  const respuesta = await fetch(DIRECCION_CLAVES)
  if (!respuesta.ok) {
    // Si no se pueden pedir pero ya habia unas guardadas, se siguen usando:
    // mas vale una clave de hace dos horas que dejar a la gente fuera.
    if (clavesEnMemoria) return clavesEnMemoria
    throw new Error('No se han podido obtener las claves de comprobación')
  }

  const { keys } = (await respuesta.json()) as { keys: ClaveJwk[] }
  const mapa = new Map<string, CryptoKey>()

  for (const jwk of keys) {
    try {
      const clave = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      )
      mapa.set(jwk.kid, clave)
    } catch {
      // Una clave que no se pueda importar se ignora; puede haber otras.
    }
  }

  clavesEnMemoria = mapa
  clavesPedidasEn = ahora
  return mapa
}

/**
 * Devuelve quien es, o null si el token no vale.
 *
 * No lanza excepciones a proposito: aqui un token malo no es un fallo del
 * programa, es el caso normal de alguien que no deberia entrar.
 */
export async function comprobarToken(token: string): Promise<Credencial | null> {
  const partes = token.split('.')
  if (partes.length !== 3) return null

  const [cabeceraB64, cargaB64, firmaB64] = partes

  let cabecera: { alg?: string; kid?: string }
  let carga: { sub?: string; email?: string; exp?: number; iss?: string }
  try {
    cabecera = JSON.parse(textoDeBase64Url(cabeceraB64))
    carga = JSON.parse(textoDeBase64Url(cargaB64))
  } catch {
    return null
  }

  if (cabecera.alg !== 'ES256' || !cabecera.kid) return null

  // Caducado. Se dan 30 segundos de margen por si los relojes no cuadran.
  const ahoraSegundos = Math.floor(Date.now() / 1000)
  if (!carga.exp || carga.exp + 30 < ahoraSegundos) return null

  // Que lo haya firmado NUESTRO Supabase y no otro cualquiera.
  if (carga.iss !== `${DIRECCION_SUPABASE}/auth/v1`) return null

  if (!carga.sub) return null

  const claves = await obtenerClaves()
  const clave = claves.get(cabecera.kid)
  if (!clave) return null

  const firmado = new TextEncoder().encode(`${cabeceraB64}.${cargaB64}`)
  const firma = deBase64Url(firmaB64)

  const vale = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    clave,
    firma as BufferSource,
    firmado as BufferSource,
  )

  if (!vale) return null

  return { id: carga.sub, correo: carga.email ?? null }
}
