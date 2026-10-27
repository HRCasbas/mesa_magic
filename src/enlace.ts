import { useCallback, useEffect, useRef, useState } from 'react'

// El enlace directo entre los dos navegadores: el vídeo y, por el mismo
// camino, el canal de datos por el que viajan los contadores y, más
// adelante, las pegatinas.
//
// Las dos cosas van juntas a propósito. Son la misma conexión: abrir una
// segunda para los datos sería repetir todo el trabajo de encontrarse, y
// dejaría dos caminos que pueden caerse por separado.
//
// Va cifrado siempre: WebRTC no sabe funcionar sin cifrar, no es una opción
// que se active. Y como va directo, el retardo es de décimas de segundo en
// vez de los segundos que da una emisión normal.
//
// La mesa solo sirve para que los dos navegadores se pasen las primeras
// cartas de presentación. En cuanto se encuentran, se quitan de en medio.
//
// REGLA QUE COSTÓ UN RATO: el enlace entre los dos se abre en cuanto estáis
// los dos en la mesa, ENCIENDA O NO ALGUIEN LA CÁMARA. Al principio solo se
// abría al encender la cámara, y eso dejaba a los dos colgados: el primero
// que encendía mandaba su oferta al vacío, porque el otro todavía no tenía
// nada escuchando, y luego ninguno de los dos volvía a proponer nada. Cada
// cámara se cuelga del enlace cuando su dueño la enciende, y así además se
// puede recibir la imagen del otro sin haber encendido la propia.

export type EstadoVideo = 'apagado' | 'pidiendo' | 'encendido' | 'fallo'

export interface Diagnostico {
  /** Si el vídeo va directo o está pasando por el relé. */
  camino: 'directo' | 'relé' | '—'
  conexion: RTCPeerConnectionState | '—'
  resolucion: string | null
  /** La resolución de lo que TÚ mandas. Sirve para saber si sales de casa. */
  enviada: string | null
  kbps: number | null
  fps: number | null
  /** Ida y vuelta real del vídeo, en milisegundos. */
  idaYVuelta: number | null
  hayRele: boolean
  motivoRele: string | null
}

/** Lo que viaja por la mesa para que los dos se encuentren. */
type Senal =
  | { descripcion: RTCSessionDescriptionInit }
  | { candidato: RTCIceCandidateInit | null }
  /** «Ya tengo el enlace abierto»: si tú tenías cámara, vuelve a proponer. */
  | { listo: true }

interface Opciones {
  /** El enlace se abre cuando estáis los dos en la mesa. */
  activo: boolean
  /**
   * Si los dos hacen una oferta a la vez, uno tiene que ceder. El que cede
   * es el «educado». Se decide comparando los identificadores, que es algo
   * en lo que los dos navegadores coinciden sin hablarlo.
   */
  soyEducado: boolean
  enviarSenal: (carga: unknown) => void
  alRecibirSenal: (oyente: (carga: unknown) => void) => () => void
}

const DIAGNOSTICO_VACIO: Diagnostico = {
  camino: '—',
  conexion: '—',
  resolucion: null,
  enviada: null,
  kbps: null,
  fps: null,
  idaYVuelta: null,
  hayRele: false,
  motivoRele: null,
}

/**
 * Lo que se le pide a la cámara.
 *
 * Mucha resolución y POCOS fotogramas, al revés de lo normal. Aquí lo que
 * hay que leer es texto impreso quieto encima de una mesa, no movimiento:
 * con 24 imágenes por segundo sobra, y lo que se ahorra ahí se gasta en
 * nitidez, que es lo que hace falta para distinguir una carta de otra.
 *
 * `facingMode` pide la cámara de atrás, que es la que se puede apuntar a la
 * mesa. En el móvil la de delante no sirve para nada aquí, y en un ordenador
 * esto no existe y se queda con la única que hay.
 */
const VIDEO_PEDIDO: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 24, max: 30 },
  facingMode: { ideal: 'environment' },
}

const AUDIO_PEDIDO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
}

/** Tope de calidad del vídeo que se envía. Por encima no mejora lo legible. */
const TOPE_BITS_POR_SEGUNDO = 3_000_000

/** Las cámaras de este aparato. Los nombres solo salen si ya hay permiso. */
async function camarasDelAparato(): Promise<MediaDeviceInfo[]> {
  try {
    const todos = await navigator.mediaDevices.enumerateDevices()
    return todos.filter((a) => a.kind === 'videoinput')
  } catch {
    return []
  }
}

function razonDelFallo(error: unknown): string {
  const nombre = (error as DOMException)?.name
  if (nombre === 'NotAllowedError') {
    return 'No has dado permiso para la cámara. Está en el candado de la barra de direcciones.'
  }
  if (nombre === 'NotFoundError') return 'No se ha encontrado ninguna cámara en este aparato.'
  if (nombre === 'NotReadableError') {
    return 'La cámara está ocupada por otro programa. Cierra el que la esté usando.'
  }
  return 'No se ha podido encender la cámara.'
}

export function useEnlace({ activo, soyEducado, enviarSenal, alRecibirSenal }: Opciones) {
  const [estado, setEstado] = useState<EstadoVideo>('apagado')
  const [fallo, setFallo] = useState<string | null>(null)
  const [miMedia, setMiMedia] = useState<MediaStream | null>(null)
  const [suMedia, setSuMedia] = useState<MediaStream | null>(null)
  const [diagnostico, setDiagnostico] = useState<Diagnostico>(DIAGNOSTICO_VACIO)
  const [videoCortado, setVideoCortado] = useState(false)
  const [micCortado, setMicCortado] = useState(false)
  const [variasCamaras, setVariasCamaras] = useState(false)
  const [datosAbiertos, setDatosAbiertos] = useState(false)

  const enlace = useRef<RTCPeerConnection | null>(null)
  const canal = useRef<RTCDataChannel | null>(null)
  const oyentesDeDatos = useRef(new Set<(dato: unknown) => void>())
  const miMediaRef = useRef<MediaStream | null>(null)
  /** Lo que se le ha colgado al enlace, para no colgarlo dos veces. */
  const emisores = useRef<RTCRtpSender[]>([])
  const haciendoOferta = useRef(false)
  const ignorandoOferta = useRef(false)
  const bytesPrevios = useRef<{ bytes: number; momento: number } | null>(null)

  // ---- colgar y descolgar la cámara del enlace ----

  /**
   * Pone (o quita) tus pistas en el enlace ya abierto. Esto es lo que avisa
   * al otro lado de que hay imagen nueva: WebRTC se encarga solo de
   * renegociar cuando una pista entra o sale.
   */
  const colgarPistas = useCallback((pc: RTCPeerConnection, media: MediaStream | null) => {
    if (!media) {
      for (const emisor of emisores.current) {
        try {
          pc.removeTrack(emisor)
        } catch {
          // El enlace ya estaba cerrado. No hay nada que quitar.
        }
      }
      emisores.current = []
      return
    }

    for (const pista of media.getTracks()) {
      const ya = emisores.current.find((e) => e.track?.kind === pista.kind)
      if (ya) {
        // Misma ranura, pista distinta: el otro no ve ni un parpadeo.
        void ya.replaceTrack(pista)
        continue
      }
      const emisor = pc.addTrack(pista, media)
      emisores.current.push(emisor)
      if (pista.kind !== 'video') continue
      const ajustes = emisor.getParameters()
      ajustes.encodings = [
        { ...(ajustes.encodings?.[0] ?? {}), maxBitrate: TOPE_BITS_POR_SEGUNDO },
      ]
      emisor.setParameters(ajustes).catch(() => {
        // Algún navegador puede no dejarlo. No es grave: solo significa
        // que el vídeo irá a la calidad que decida él.
      })
    }
  }, [])

  // ---- el canal de datos ----

  /**
   * Mandarle algo al otro por el camino directo. Devuelve si ha salido: si
   * el canal todavía no está abierto, no se guarda nada en cola, porque un
   * contador viejo que llega tarde es peor que no llegar.
   */
  const enviarDato = useCallback((dato: unknown) => {
    const c = canal.current
    if (c?.readyState !== 'open') return false
    c.send(JSON.stringify(dato))
    return true
  }, [])

  /** Avisarme de lo que llegue por el canal. Devuelve cómo darse de baja. */
  const alRecibirDato = useCallback((oyente: (dato: unknown) => void) => {
    oyentesDeDatos.current.add(oyente)
    return () => {
      oyentesDeDatos.current.delete(oyente)
    }
  }, [])

  // ---- encender y apagar la cámara ----

  const encender = useCallback(async () => {
    setFallo(null)
    setEstado('pidiendo')
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_PEDIDO,
        audio: AUDIO_PEDIDO,
      })

      // Decirle al códec que esto es DETALLE y no movimiento. Sin esto, al
      // mover una carta se emborrona el texto durante medio segundo.
      for (const pista of media.getVideoTracks()) pista.contentHint = 'detail'

      miMediaRef.current = media
      setMiMedia(media)
      setEstado('encendido')
      setVideoCortado(false)
      setMicCortado(false)

      // Los nombres de las cámaras solo se ven con el permiso ya dado, así
      // que hasta aquí no se sabe si este aparato tiene más de una.
      const camaras = await camarasDelAparato()
      setVariasCamaras(camaras.length > 1)
    } catch (error) {
      setFallo(razonDelFallo(error))
      setEstado('fallo')
    }
  }, [])

  const apagar = useCallback(() => {
    miMediaRef.current?.getTracks().forEach((p) => p.stop())
    miMediaRef.current = null
    setMiMedia(null)
    setEstado('apagado')
    setVideoCortado(false)
    setMicCortado(false)
  }, [])

  /** Pasar a la siguiente cámara del aparato: delante, detrás, la que haya. */
  const cambiarCamara = useCallback(async () => {
    const media = miMediaRef.current
    const vieja = media?.getVideoTracks()[0]
    if (!media || !vieja) return

    const camaras = await camarasDelAparato()
    if (camaras.length < 2) {
      setVariasCamaras(false)
      return
    }

    try {
      const puesta = vieja.getSettings().deviceId
      const donde = camaras.findIndex((c) => c.deviceId === puesta)
      const siguiente = camaras[(donde + 1) % camaras.length]

      const traida = await navigator.mediaDevices.getUserMedia({
        video: { ...VIDEO_PEDIDO, deviceId: { exact: siguiente.deviceId } },
      })
      const nueva = traida.getVideoTracks()[0]
      nueva.contentHint = 'detail'
      nueva.enabled = !videoCortado

      const juntas = new MediaStream([nueva, ...media.getAudioTracks()])
      vieja.stop()
      miMediaRef.current = juntas
      setMiMedia(juntas)
      setFallo(null)
    } catch {
      setFallo('No se ha podido cambiar de cámara. Sigue puesta la de antes.')
    }
  }, [videoCortado])

  /** Cortar la imagen sin apagar la cámara: vuelve al instante. */
  const alternarVideo = useCallback(() => {
    const media = miMediaRef.current
    if (!media) return
    const nuevo = !videoCortado
    media.getVideoTracks().forEach((p) => (p.enabled = !nuevo))
    setVideoCortado(nuevo)
  }, [videoCortado])

  const alternarMicrofono = useCallback(() => {
    const media = miMediaRef.current
    if (!media) return
    const nuevo = !micCortado
    media.getAudioTracks().forEach((p) => (p.enabled = !nuevo))
    setMicCortado(nuevo)
  }, [micCortado])

  // ---- el enlace entre los dos ----

  useEffect(() => {
    if (!activo) return

    let vivo = true
    let pc: RTCPeerConnection | null = null
    let bajaDeSenales: (() => void) | null = null
    let reloj: ReturnType<typeof setInterval> | null = null

    /**
     * Todo lo que se le ha mandado al otro, en orden.
     *
     * POR QUÉ SE GUARDA (27/10/2026). Los dos lados tardan lo suyo en abrir
     * su enlace, porque antes preguntan por los servidores y eso es una ida
     * y vuelta a la red. El que termina primero **habla solo**: su oferta y
     * sus candidatos llegan a una mesa donde todavía no hay nadie
     * escuchando, y se pierden. Y como después se queda esperando una
     * respuesta, ya no vuelve a proponer nada: los dos en la misma mesa y
     * sin verse, «como si fueran mesas diferentes con el mismo código».
     *
     * Así que se guarda lo dicho y, cuando el otro avisa de que ya escucha,
     * se le repite entero.
     */
    const mandado: Senal[] = []

    function mandar(senal: Senal) {
      mandado.push(senal)
      enviarSenal(senal)
    }

    /**
     * Proponer el enlace otra vez. Hace falta cuando el otro acaba de abrir
     * el suyo y tú ya tenías la cámara encendida: tu primera oferta se
     * perdió porque al otro lado no había nadie escuchando todavía.
     */
    async function proponer(enchufe: RTCPeerConnection) {
      if (enchufe.signalingState !== 'stable') return
      // Se propone si hay algo que ofrecer: una cámara encendida o el canal
      // de datos. Lo segundo faltaba, y era un agujero del mismo tamaño que
      // el de la fase 3: sin cámaras, el único que tiene algo que ofrecer es
      // el que abrió el canal, y si SU oferta se perdía no volvía a
      // proponer. Resultado: los contadores no llegaban al otro lado.
      const hayAlgoQueOfrecer = enchufe.getSenders().some((e) => e.track) || canal.current !== null
      if (!hayAlgoQueOfrecer) return
      try {
        haciendoOferta.current = true
        await enchufe.setLocalDescription()
        mandar({ descripcion: enchufe.localDescription!.toJSON() })
      } catch {
        // Si falla, el otro lado acabará proponiendo.
      } finally {
        haciendoOferta.current = false
      }
    }

    async function montar() {
      // Los servidores con los que buscarse. Si el relé no está configurado,
      // esto devuelve solo STUN y se sigue adelante igual.
      let servidores: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
      let hayRele = false
      let motivoRele: string | null = null
      try {
        const respuesta = await fetch('/api/servidores')
        const datos = (await respuesta.json()) as {
          servidores: RTCIceServer[]
          hayRele: boolean
          motivo?: string
        }
        servidores = datos.servidores
        hayRele = datos.hayRele
        motivoRele = datos.motivo ?? null
      } catch {
        motivoRele = 'No se ha podido preguntar por los servidores.'
      }
      if (!vivo) return

      setDiagnostico((d) => ({ ...d, hayRele, motivoRele }))

      pc = new RTCPeerConnection({ iceServers: servidores })
      enlace.current = pc
      emisores.current = []

      pc.ontrack = (evento) => {
        if (vivo) setSuMedia(evento.streams[0] ?? null)
      }

      // El canal de datos lo abre UNO SOLO de los dos. Si lo abrieran los
      // dos habría dos canales y una renegociación de más, con el choque de
      // ofertas garantizado nada más empezar. Lo abre el «maleducado», que
      // es el que no cede en los choques; el otro lo recoge al llegar.
      function usarCanal(c: RTCDataChannel) {
        canal.current = c
        c.onopen = () => {
          if (vivo) setDatosAbiertos(true)
        }
        c.onclose = () => {
          if (vivo) setDatosAbiertos(false)
        }
        c.onmessage = (evento) => {
          let dato: unknown
          try {
            dato = JSON.parse(evento.data as string)
          } catch {
            return
          }
          for (const oyente of oyentesDeDatos.current) oyente(dato)
        }
      }

      if (soyEducado) {
        pc.ondatachannel = (evento) => usarCanal(evento.channel)
      } else {
        usarCanal(pc.createDataChannel('partida', { ordered: true }))
      }

      pc.onicecandidate = ({ candidate }) => {
        mandar({ candidato: candidate ? candidate.toJSON() : null })
      }

      pc.onconnectionstatechange = () => {
        if (vivo && pc) setDiagnostico((d) => ({ ...d, conexion: pc!.connectionState }))
      }

      pc.onnegotiationneeded = async () => {
        if (!pc) return
        try {
          haciendoOferta.current = true
          await pc.setLocalDescription()
          mandar({ descripcion: pc.localDescription!.toJSON() })
        } catch {
          // Si falla, el otro lado acabará proponiendo.
        } finally {
          haciendoOferta.current = false
        }
      }

      /**
       * Atender una señal. Van de una en una y en orden, nunca a la vez:
       * un candidato que se adelante a la descripción a la que pertenece
       * se pierde, y al repetir lo mandado llegan varias de golpe.
       */
      async function atender(carga: unknown) {
        if (!pc) return
        const senal = carga as Senal

        try {
          if ('listo' in senal) {
            // El otro acaba de abrir su enlace. Si no nos ha contestado
            // nunca, es que todo lo nuestro llegó antes que él: se le
            // repite entero y en orden. Si ya hubo conversación, basta con
            // volver a proponer.
            if (!pc.currentRemoteDescription && mandado.length > 0) {
              for (const vieja of mandado) enviarSenal(vieja)
            } else {
              await proponer(pc)
            }
          } else if ('descripcion' in senal) {
            const esOferta = senal.descripcion.type === 'offer'
            const ocupado = haciendoOferta.current || pc.signalingState !== 'stable'
            const choque = esOferta && ocupado

            // Los dos han hablado a la vez. El maleducado sigue a lo suyo;
            // el educado se traga su propia oferta y acepta la del otro.
            ignorandoOferta.current = !soyEducado && choque
            if (ignorandoOferta.current) return

            await pc.setRemoteDescription(senal.descripcion)
            if (esOferta) {
              await pc.setLocalDescription()
              mandar({ descripcion: pc.localDescription!.toJSON() })
            }
          } else if (senal.candidato) {
            try {
              await pc.addIceCandidate(senal.candidato)
            } catch (error) {
              if (!ignorandoOferta.current) throw error
            }
          }
        } catch {
          // Una señal suelta que no encaja no tiene por qué tirar la
          // conexión: WebRTC reintenta por su cuenta.
        }
      }

      // La cola: cada señal espera a que termine la anterior.
      let cola: Promise<void> = Promise.resolve()
      bajaDeSenales = alRecibirSenal((carga) => {
        cola = cola.then(() => atender(carga)).catch(() => {})
      })

      // Si la cámara ya estaba encendida antes de que llegara el otro, se
      // cuelga ahora. Y se avisa de que este lado ya escucha, para que el
      // otro vuelva a proponer si le pasó lo mismo.
      colgarPistas(pc, miMediaRef.current)
      enviarSenal({ listo: true } satisfies Senal)

      // ---- el panel de diagnóstico ----
      reloj = setInterval(async () => {
        if (!pc || !vivo) return
        const informe = await pc.getStats()

        let camino: Diagnostico['camino'] = '—'
        let idaYVuelta: number | null = null
        let resolucion: string | null = null
        let enviada: string | null = null
        let fps: number | null = null
        let kbps: number | null = null

        // El navegador no trae tipo para esto, así que se describe lo poco
        // que hace falta: de qué clase es cada extremo del camino.
        type Extremo = { id: string; candidateType?: string }

        const candidatos = new Map<string, Extremo>()
        informe.forEach((d) => {
          if (d.type === 'local-candidate' || d.type === 'remote-candidate') {
            candidatos.set(d.id, d as Extremo)
          }
        })

        informe.forEach((dato) => {
          if (dato.type === 'candidate-pair' && dato.state === 'succeeded' && dato.nominated) {
            const par = dato as RTCIceCandidatePairStats
            if (typeof par.currentRoundTripTime === 'number') {
              idaYVuelta = Math.round(par.currentRoundTripTime * 1000)
            }
            const local = par.localCandidateId ? candidatos.get(par.localCandidateId) : undefined
            const remoto = par.remoteCandidateId ? candidatos.get(par.remoteCandidateId) : undefined
            camino =
              local?.candidateType === 'relay' || remoto?.candidateType === 'relay'
                ? 'relé'
                : 'directo'
          }

          if (dato.type === 'outbound-rtp' && (dato as RTCOutboundRtpStreamStats).kind === 'video') {
            const saliente = dato as RTCOutboundRtpStreamStats
            if (saliente.frameWidth && saliente.frameHeight) {
              enviada = `${saliente.frameWidth} × ${saliente.frameHeight}`
            }
          }

          if (dato.type === 'inbound-rtp' && (dato as RTCInboundRtpStreamStats).kind === 'video') {
            const entrante = dato as RTCInboundRtpStreamStats
            if (entrante.frameWidth && entrante.frameHeight) {
              resolucion = `${entrante.frameWidth} × ${entrante.frameHeight}`
            }
            if (typeof entrante.framesPerSecond === 'number') {
              fps = Math.round(entrante.framesPerSecond)
            }
            if (typeof entrante.bytesReceived === 'number') {
              const previo = bytesPrevios.current
              const ahora = performance.now()
              if (previo) {
                const segundos = (ahora - previo.momento) / 1000
                if (segundos > 0) {
                  kbps = Math.round(((entrante.bytesReceived - previo.bytes) * 8) / 1000 / segundos)
                }
              }
              bytesPrevios.current = { bytes: entrante.bytesReceived, momento: ahora }
            }
          }
        })

        if (vivo) {
          setDiagnostico((d) => ({ ...d, camino, idaYVuelta, resolucion, enviada, fps, kbps }))
        }
      }, 2000)
    }

    void montar()

    return () => {
      vivo = false
      if (reloj) clearInterval(reloj)
      bajaDeSenales?.()
      canal.current?.close()
      canal.current = null
      setDatosAbiertos(false)
      pc?.close()
      enlace.current = null
      emisores.current = []
      bytesPrevios.current = null
      setSuMedia(null)
      setDiagnostico((d) => ({ ...DIAGNOSTICO_VACIO, hayRele: d.hayRele, motivoRele: d.motivoRele }))
    }
  }, [activo, soyEducado, enviarSenal, alRecibirSenal, colgarPistas])

  // Cuando enciendes, apagas o cambias de cámara, hay que decírselo al
  // enlace si ya estaba abierto. Si todavía no lo está, lo recoge él al
  // abrirse, que para eso mira `miMediaRef`.
  useEffect(() => {
    const pc = enlace.current
    if (pc) colgarPistas(pc, miMedia)
  }, [miMedia, colgarPistas])

  // Al salir de la pantalla, apagar la cámara de verdad: el piloto no puede
  // quedarse encendido porque alguien haya cambiado de pestaña.
  useEffect(() => {
    return () => {
      miMediaRef.current?.getTracks().forEach((p) => p.stop())
      miMediaRef.current = null
    }
  }, [])

  return {
    estado,
    fallo,
    miMedia,
    suMedia,
    diagnostico,
    videoCortado,
    micCortado,
    variasCamaras,
    datosAbiertos,
    enviarDato,
    alRecibirDato,
    encender,
    apagar,
    cambiarCamara,
    alternarVideo,
    alternarMicrofono,
  }
}
