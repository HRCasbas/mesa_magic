// Comprobaciones de la fase 0.
//
// Sirven para abrir la web en un aparato nuevo (el PC, el móvil, una tableta)
// y saber de un vistazo si ese aparato va a servir para jugar, antes de haber
// escrito una línea del vídeo.
//
// IMPORTANTE: aquí no se enciende la cámara. Se le pregunta al navegador si
// hay alguna, que es otra cosa: no sale el aviso de permiso y no se graba
// nada. La cámara no se enciende hasta la fase 3, y solo con sesión y mesa.

export type Resultado = 'bien' | 'mal' | 'duda'

export interface Comprobacion {
  clave: string
  titulo: string
  resultado: Resultado
  /** Lo que se ha encontrado. */
  detalle: string
  /** Por qué esta comprobación importa, en castellano llano. */
  porQue: string
}

/** El navegador solo deja usar la cámara en HTTPS (o en localhost, al probar). */
function comprobarHttps(): Comprobacion {
  const protocolo = window.location.protocol
  const esLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const seguro = protocolo === 'https:' || esLocal

  return {
    clave: 'https',
    titulo: 'Conexión segura',
    resultado: seguro ? 'bien' : 'mal',
    detalle: esLocal ? `${protocolo}// en local` : protocolo + '//',
    porQue:
      'Sin HTTPS el navegador no deja encender la cámara, por mucho que se le pida. ' +
      'En local hace la excepción para poder probar.',
  }
}

/** WebRTC es lo que lleva el vídeo y los contadores de un navegador al otro. */
function comprobarVideoEnDirecto(): Comprobacion {
  const hayConexion = typeof RTCPeerConnection === 'function'
  const hayCanalDeDatos =
    hayConexion && typeof RTCPeerConnection.prototype.createDataChannel === 'function'

  if (!hayConexion) {
    return {
      clave: 'webrtc',
      titulo: 'Vídeo en directo',
      resultado: 'mal',
      detalle: 'Este navegador no lo soporta',
      porQue:
        'Es la pieza que lleva el vídeo de tu mesa a la del otro, sin pasar por ningún servidor.',
    }
  }

  return {
    clave: 'webrtc',
    titulo: 'Vídeo en directo',
    resultado: hayCanalDeDatos ? 'bien' : 'duda',
    detalle: hayCanalDeDatos ? 'Soportado, con canal de datos' : 'Soportado, sin canal de datos',
    porQue:
      'El vídeo va por aquí, y por el mismo camino viajan las vidas, los contadores y las ' +
      'pegatinas. Va siempre cifrado: no existe forma de usarlo sin cifrar.',
  }
}

/** Cuenta cámaras sin encenderlas ni pedir permiso. */
async function comprobarCamaras(): Promise<Comprobacion> {
  const base = {
    clave: 'camara',
    titulo: 'Cámara detectada',
    porQue:
      'Solo se mira si existe. No se enciende, no se pide permiso y no se graba nada: ' +
      'eso llega en la fase 3, y con la sesión puesta.',
  }

  if (!navigator.mediaDevices?.enumerateDevices) {
    return { ...base, resultado: 'mal', detalle: 'Este navegador no sabe mirarlo' }
  }

  try {
    const aparatos = await navigator.mediaDevices.enumerateDevices()
    const camaras = aparatos.filter((a) => a.kind === 'videoinput')

    if (camaras.length === 0) {
      return {
        ...base,
        resultado: 'duda',
        detalle: 'Ninguna a la vista',
        porQue:
          base.porQue +
          ' Puede que haya cámara y el navegador no la enseñe hasta darle permiso una vez.',
      }
    }

    return {
      ...base,
      resultado: 'bien',
      detalle: camaras.length === 1 ? '1 cámara' : `${camaras.length} cámaras`,
    }
  } catch {
    return { ...base, resultado: 'duda', detalle: 'No se ha podido preguntar' }
  }
}

/** Que el móvil no se apague a mitad de partida. */
function comprobarPantallaEncendida(): Comprobacion {
  const hay = 'wakeLock' in navigator

  return {
    clave: 'pantalla',
    titulo: 'Mantener la pantalla encendida',
    resultado: hay ? 'bien' : 'duda',
    detalle: hay ? 'Se puede pedir' : 'No se puede pedir en este navegador',
    porQue:
      'Para que el móvil no se apague solo en medio de una partida. Si no se puede, se arregla ' +
      'a mano quitando el apagado automático mientras juegas.',
  }
}

/** Para recordar la sesión y no perder la partida con un F5. */
function comprobarMemoriaDelNavegador(): Comprobacion {
  try {
    const prueba = '__mesa_magic__'
    window.localStorage.setItem(prueba, '1')
    window.localStorage.removeItem(prueba)
    return {
      clave: 'memoria',
      titulo: 'Memoria del navegador',
      resultado: 'bien',
      detalle: 'Se puede guardar',
      porQue:
        'Aquí se guardará la sesión, para no tener que entrar cada vez, y el estado de la ' +
        'partida, para que un F5 por error no se la lleve.',
    }
  } catch {
    return {
      clave: 'memoria',
      titulo: 'Memoria del navegador',
      resultado: 'mal',
      detalle: 'Bloqueada',
      porQue:
        'Suele pasar en ventanas de incógnito o con las cookies bloqueadas. Sin esto habría ' +
        'que entrar de nuevo cada vez.',
    }
  }
}

export async function ejecutarComprobaciones(): Promise<Comprobacion[]> {
  return [
    comprobarHttps(),
    comprobarVideoEnDirecto(),
    await comprobarCamaras(),
    comprobarPantallaEncendida(),
    comprobarMemoriaDelNavegador(),
  ]
}

/** Datos del aparato, para saber desde dónde se está mirando la página. */
export function datosDelAparato(): Array<{ etiqueta: string; valor: string }> {
  const pantalla = window.screen
  return [
    { etiqueta: 'Dirección', valor: window.location.host + window.location.pathname },
    { etiqueta: 'Pantalla', valor: `${pantalla.width} × ${pantalla.height}` },
    { etiqueta: 'Ventana', valor: `${window.innerWidth} × ${window.innerHeight}` },
    { etiqueta: 'Táctil', valor: navigator.maxTouchPoints > 0 ? 'sí' : 'no' },
    { etiqueta: 'Idioma', valor: navigator.language },
  ]
}
