import { useCallback, useEffect, useRef, useState } from 'react'

// El vídeo, de tu navegador al suyo y sin pasar por ningún servidor nuestro.
//
// Va cifrado siempre: WebRTC no sabe funcionar sin cifrar, no es una opción
// que se active. Y como va directo, el retardo es de décimas de segundo en
// vez de los segundos que da una emisión normal.
//
// La mesa solo sirve para que los dos navegadores se pasen las primeras
// cartas de presentación. En cuanto se encuentran, se quitan de en medio.

export type EstadoVideo = 'apagado' | 'pidiendo' | 'encendido' | 'fallo'

export interface Diagnostico {
  /** Si el vídeo va directo o está pasando por el relé. */
  camino: 'directo' | 'relé' | '—'
  conexion: RTCPeerConnectionState | '—'
  resolucion: string | null
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

interface Opciones {
  /** Solo se enciende nada cuando estáis los dos en la mesa. */
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
 */
const LO_QUE_SE_PIDE: MediaStreamConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 24, max: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
}

/** Tope de calidad del vídeo que se envía. Por encima no mejora lo legible. */
const TOPE_BITS_POR_SEGUNDO = 3_000_000

export function useVideo({ activo, soyEducado, enviarSenal, alRecibirSenal }: Opciones) {
  const [estado, setEstado] = useState<EstadoVideo>('apagado')
  const [fallo, setFallo] = useState<string | null>(null)
  const [miMedia, setMiMedia] = useState<MediaStream | null>(null)
  const [suMedia, setSuMedia] = useState<MediaStream | null>(null)
  const [diagnostico, setDiagnostico] = useState<Diagnostico>(DIAGNOSTICO_VACIO)
  const [videoCortado, setVideoCortado] = useState(false)
  const [micCortado, setMicCortado] = useState(false)

  const enlace = useRef<RTCPeerConnection | null>(null)
  const miMediaRef = useRef<MediaStream | null>(null)
  const haciendoOferta = useRef(false)
  const ignorandoOferta = useRef(false)
  const bytesPrevios = useRef<{ bytes: number; momento: number } | null>(null)

  // ---- encender y apagar la cámara ----

  const encender = useCallback(async () => {
    setFallo(null)
    setEstado('pidiendo')
    try {
      const media = await navigator.mediaDevices.getUserMedia(LO_QUE_SE_PIDE)

      // Decirle al códec que esto es DETALLE y no movimiento. Sin esto, al
      // mover una carta se emborrona el texto durante medio segundo.
      for (const pista of media.getVideoTracks()) pista.contentHint = 'detail'

      miMediaRef.current = media
      setMiMedia(media)
      setEstado('encendido')
    } catch (error) {
      const nombre = (error as DOMException)?.name
      setFallo(
        nombre === 'NotAllowedError'
          ? 'No has dado permiso para la cámara. Está en el candado de la barra de direcciones.'
          : nombre === 'NotFoundError'
            ? 'No se ha encontrado ninguna cámara en este aparato.'
            : nombre === 'NotReadableError'
              ? 'La cámara está ocupada por otro programa. Cierra el que la esté usando.'
              : 'No se ha podido encender la cámara.',
      )
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

  // ---- la conexión entre los dos ----

  useEffect(() => {
    if (!activo || !miMedia) return

    let vivo = true
    let pc: RTCPeerConnection | null = null
    let bajaDeSenales: (() => void) | null = null
    let reloj: ReturnType<typeof setInterval> | null = null

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

      for (const pista of miMedia!.getTracks()) {
        const emisor = pc.addTrack(pista, miMedia!)
        if (pista.kind !== 'video') continue
        const ajustes = emisor.getParameters()
        ajustes.encodings = [{ ...(ajustes.encodings?.[0] ?? {}), maxBitrate: TOPE_BITS_POR_SEGUNDO }]
        emisor.setParameters(ajustes).catch(() => {
          // Algún navegador puede no dejarlo. No es grave: solo significa
          // que el vídeo irá a la calidad que decida él.
        })
      }

      pc.ontrack = (evento) => {
        if (vivo) setSuMedia(evento.streams[0] ?? null)
      }

      pc.onicecandidate = ({ candidate }) => {
        enviarSenal({ candidato: candidate ? candidate.toJSON() : null } satisfies Senal)
      }

      pc.onconnectionstatechange = () => {
        if (vivo && pc) setDiagnostico((d) => ({ ...d, conexion: pc!.connectionState }))
      }

      pc.onnegotiationneeded = async () => {
        if (!pc) return
        try {
          haciendoOferta.current = true
          await pc.setLocalDescription()
          enviarSenal({ descripcion: pc.localDescription!.toJSON() } satisfies Senal)
        } catch {
          // Si falla, el otro lado acabará proponiendo.
        } finally {
          haciendoOferta.current = false
        }
      }

      bajaDeSenales = alRecibirSenal(async (carga) => {
        if (!pc) return
        const senal = carga as Senal

        try {
          if ('descripcion' in senal) {
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
              enviarSenal({ descripcion: pc.localDescription!.toJSON() } satisfies Senal)
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
      })

      // ---- el panel de diagnóstico ----
      reloj = setInterval(async () => {
        if (!pc || !vivo) return
        const informe = await pc.getStats()

        let camino: Diagnostico['camino'] = '—'
        let idaYVuelta: number | null = null
        let resolucion: string | null = null
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
          setDiagnostico((d) => ({ ...d, camino, idaYVuelta, resolucion, fps, kbps }))
        }
      }, 2000)
    }

    void montar()

    return () => {
      vivo = false
      if (reloj) clearInterval(reloj)
      bajaDeSenales?.()
      pc?.close()
      enlace.current = null
      bytesPrevios.current = null
      setSuMedia(null)
      setDiagnostico((d) => ({ ...DIAGNOSTICO_VACIO, hayRele: d.hayRele, motivoRele: d.motivoRele }))
    }
  }, [activo, miMedia, soyEducado, enviarSenal, alRecibirSenal])

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
    encender,
    apagar,
    alternarVideo,
    alternarMicrofono,
  }
}
