import { Mesa } from './mesa'

export { Mesa }

export interface Entorno {
  MESAS: DurableObjectNamespace<Mesa>
  ASSETS: Fetcher
}

/** Letras y numeros sin los que se confunden al dictarlos por telefono. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function codigoValido(codigo: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(codigo) && [...codigo].every((c) => ALFABETO.includes(c))
}

export default {
  async fetch(peticion: Request, entorno: Entorno): Promise<Response> {
    const url = new URL(peticion.url)

    // Un codigo nuevo para una mesa. Corto, porque hay que dictarlo.
    if (url.pathname === '/api/codigo') {
      const bytes = crypto.getRandomValues(new Uint8Array(4))
      const codigo = [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('')
      return Response.json({ codigo })
    }

    // Entrar en una mesa.
    //
    // El token NO viaja en la direccion: se manda en el primer mensaje, ya
    // dentro del websocket. Una direccion acaba en registros y en el
    // historial del navegador, y una sesion no tiene por que acabar ahi.
    const enLaMesa = url.pathname.match(/^\/api\/mesa\/([A-Z0-9]+)$/)
    if (enLaMesa) {
      const codigo = enLaMesa[1]
      if (!codigoValido(codigo)) {
        return new Response('Ese código de mesa no tiene buena pinta', { status: 400 })
      }
      if (peticion.headers.get('Upgrade') !== 'websocket') {
        return new Response('Aquí solo se entra por websocket', { status: 426 })
      }

      // Mismo codigo, misma mesa, esten donde esten los dos.
      const id = entorno.MESAS.idFromName(codigo)
      return entorno.MESAS.get(id).fetch(peticion)
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response('Aquí no hay nada', { status: 404 })
    }

    // Todo lo demas es la web.
    return entorno.ASSETS.fetch(peticion)
  },
}
