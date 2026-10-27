import { DurableObject } from 'cloudflare:workers'

import { comprobarToken } from './jwt'

// Una mesa: dos plazas y nada mas.
//
// Esto es lo unico que hace falta del lado del servidor para que los dos os
// encontreis. Una vez encontrados, el video y los contadores van DIRECTOS de
// un navegador al otro, y esta mesa se queda ahi parada sin gastar nada.
//
// Por eso es un Durable Object y no una tabla: hace falta un sitio con
// memoria donde los dos lleguen a la vez, y tiene que estar despierto SIEMPRE,
// porque este es justo el momento en que el amigo esta esperando. Cloudflare
// no se duerme; un proyecto gratis de Supabase si.

/** Lo que se guarda pegado a cada conexion abierta. */
interface Ocupante {
  id: string
  nombre: string
}

/** Lo que manda el navegador. */
type MensajeEntrante =
  | { tipo: 'entrar'; token: string; nombre: string }
  | { tipo: 'senal'; carga: unknown }
  | { tipo: 'eco'; marca: number }

/** Lo que devuelve la mesa. */
type MensajeSaliente =
  | { tipo: 'estado'; jugadores: Ocupante[]; tuId: string }
  | { tipo: 'senal'; de: string; carga: unknown }
  | { tipo: 'eco'; marca: number }
  | { tipo: 'fuera'; motivo: string }

const PLAZAS = 2

export class Mesa extends DurableObject {
  async fetch(peticion: Request): Promise<Response> {
    if (peticion.headers.get('Upgrade') !== 'websocket') {
      return new Response('Aquí solo se entra por websocket', { status: 426 })
    }

    const par = new WebSocketPair()
    const [delNavegador, nuestro] = Object.values(par)

    // Con hibernación, Cloudflare puede descargar la mesa de memoria mientras
    // nadie habla y devolverla cuando llegue un mensaje. Una partida de dos
    // horas apenas gasta.
    this.ctx.acceptWebSocket(nuestro)

    return new Response(null, { status: 101, webSocket: delNavegador })
  }

  async webSocketMessage(conexion: WebSocket, crudo: string | ArrayBuffer) {
    if (typeof crudo !== 'string') return

    let mensaje: MensajeEntrante
    try {
      mensaje = JSON.parse(crudo)
    } catch {
      return
    }

    const quien = conexion.deserializeAttachment() as Ocupante | null

    // Hasta no identificarse, lo único que se admite es identificarse.
    if (!quien) {
      if (mensaje.tipo !== 'entrar') {
        this.echar(conexion, 'Hay que identificarse primero.')
        return
      }
      await this.entrar(conexion, mensaje)
      return
    }

    switch (mensaje.tipo) {
      case 'eco':
        // Para medir el retardo de ida y vuelta sin tocar nada más.
        this.enviar(conexion, { tipo: 'eco', marca: mensaje.marca })
        break

      case 'senal':
        // El sobre que lleva la oferta de vídeo. La mesa no lo abre: lo pasa.
        this.alOtro(quien.id, { tipo: 'senal', de: quien.id, carga: mensaje.carga })
        break
    }
  }

  async webSocketClose(conexion: WebSocket) {
    this.contarEstado(conexion)
  }

  async webSocketError(conexion: WebSocket) {
    this.contarEstado(conexion)
  }

  // ---- por dentro ----

  private async entrar(conexion: WebSocket, mensaje: { token: string; nombre: string }) {
    const credencial = await comprobarToken(mensaje.token)
    if (!credencial) {
      this.echar(conexion, 'Tu sesión no vale o ha caducado. Vuelve a entrar.')
      return
    }

    const ocupantes = this.ocupantes()
    const yaEstaba = ocupantes.some((o) => o.id === credencial.id)

    if (!yaEstaba && ocupantes.length >= PLAZAS) {
      this.echar(conexion, 'Esta mesa ya está completa.')
      return
    }

    // Si vuelve el mismo jugador (se le fue la cobertura, recargó), se le
    // cierra la conexión vieja en vez de dejar dos suyas colgando.
    if (yaEstaba) {
      for (const otra of this.ctx.getWebSockets()) {
        const suyo = otra.deserializeAttachment() as Ocupante | null
        if (suyo?.id === credencial.id && otra !== conexion) {
          try {
            otra.close(1000, 'Has entrado desde otro sitio')
          } catch {
            // Si ya estaba cerrada, da igual.
          }
        }
      }
    }

    const nombre = mensaje.nombre?.trim().slice(0, 40) || 'Alguien'
    conexion.serializeAttachment({ id: credencial.id, nombre } satisfies Ocupante)

    this.avisarATodos()
  }

  /** Cierra una conexión diciendo por qué, para que el navegador lo enseñe. */
  private echar(conexion: WebSocket, motivo: string) {
    this.enviar(conexion, { tipo: 'fuera', motivo })
    try {
      conexion.close(1008, motivo)
    } catch {
      // Ya cerrada.
    }
  }

  private enviar(conexion: WebSocket, mensaje: MensajeSaliente) {
    try {
      conexion.send(JSON.stringify(mensaje))
    } catch {
      // Conexión muerta; el cierre se encargará.
    }
  }

  private ocupantes(): Ocupante[] {
    const vistos = new Map<string, Ocupante>()
    for (const conexion of this.ctx.getWebSockets()) {
      const quien = conexion.deserializeAttachment() as Ocupante | null
      if (quien) vistos.set(quien.id, quien)
    }
    return [...vistos.values()]
  }

  private alOtro(idPropio: string, mensaje: MensajeSaliente) {
    for (const conexion of this.ctx.getWebSockets()) {
      const quien = conexion.deserializeAttachment() as Ocupante | null
      if (quien && quien.id !== idPropio) this.enviar(conexion, mensaje)
    }
  }

  private avisarATodos() {
    const jugadores = this.ocupantes()
    for (const conexion of this.ctx.getWebSockets()) {
      const quien = conexion.deserializeAttachment() as Ocupante | null
      if (quien) this.enviar(conexion, { tipo: 'estado', jugadores, tuId: quien.id })
    }
  }

  /** Al cerrarse una conexión, los que quedan tienen que enterarse. */
  private contarEstado(_conexion: WebSocket) {
    this.avisarATodos()
  }
}
