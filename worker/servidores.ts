// Los servidores que necesitan los dos navegadores para encontrarse por su
// cuenta y mandarse el video directo.
//
// Son dos cosas distintas y conviene no mezclarlas:
//
// STUN  le dice a tu navegador «desde fuera te veo con esta direccion».
//       Es gratis, es publico y con el se resuelven cerca del 80 % de los
//       casos: el video acaba yendo de tu casa a la suya y punto.
//
// TURN  es un rele para el 20 % restante: cuando el router de uno de los dos
//       no deja establecer la conexion directa (CGNAT, datos del movil,
//       cortafuegos de oficina). El video pasa por Cloudflare, que da 1.000
//       GB al mes gratis. Cuesta algo de retardo, pero sin el no conectais.
//
// LO IMPORTANTE: si no hay credenciales de TURN configuradas, esto NO falla.
// Devuelve solo STUN y la aplicacion funciona igual para la mayoria de la
// gente. El dia que se pongan las credenciales empieza a funcionar tambien
// para el resto, sin tocar una linea de codigo.

const STUN_PUBLICO = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
]

/** Cuanto duran las credenciales del rele. Un dia de sobra para una partida. */
const DURACION_SEGUNDOS = 24 * 60 * 60

export interface ServidorDeConexion {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface RespuestaServidores {
  servidores: ServidorDeConexion[]
  /** Si hay rele disponible. El panel de diagnostico lo enseña. */
  hayRele: boolean
  /** Por que no lo hay, cuando no lo hay. */
  motivo?: string
}

export async function servidoresDeConexion(entorno: {
  TURN_CLAVE_ID?: string
  TURN_TOKEN?: string
}): Promise<RespuestaServidores> {
  const base: ServidorDeConexion[] = [{ urls: STUN_PUBLICO }]

  if (!entorno.TURN_CLAVE_ID || !entorno.TURN_TOKEN) {
    return {
      servidores: base,
      hayRele: false,
      motivo: 'No hay credenciales de relé configuradas. Solo conexión directa.',
    }
  }

  try {
    const respuesta = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${entorno.TURN_CLAVE_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${entorno.TURN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: DURACION_SEGUNDOS }),
      },
    )

    if (!respuesta.ok) {
      return {
        servidores: base,
        hayRele: false,
        motivo: `Cloudflare no ha dado credenciales de relé (${respuesta.status}).`,
      }
    }

    const datos = (await respuesta.json()) as { iceServers?: ServidorDeConexion }
    if (!datos.iceServers?.urls) {
      return { servidores: base, hayRele: false, motivo: 'Respuesta de relé inesperada.' }
    }

    return { servidores: [...base, datos.iceServers], hayRele: true }
  } catch {
    // Que el rele no conteste no puede dejar sin jugar a quien no lo
    // necesita, que son la mayoria.
    return {
      servidores: base,
      hayRele: false,
      motivo: 'No se ha podido hablar con el relé. Solo conexión directa.',
    }
  }
}
