import { useCallback, useEffect, useRef, useState } from 'react'

// Tocar una carta de la mesa del otro y verla de cerca.
//
// EL ORDEN IMPORTA, Y NO ES EL QUE PARECE. Lo que no deja leer una carta
// por la cámara no es el reconocimiento de texto: **son los píxeles**. Con
// el tapete entero encuadrado a 1080p, el nombre de una carta mide unos
// diez píxeles de alto. Ampliar el vídeo que te llega no sirve de nada,
// porque esa imagen ya viene comprimida y reducida.
//
// Por eso la foto se la pedimos al OTRO navegador, que sí tiene la imagen
// a resolución nativa, y le pedimos **solo el trozo** donde está la carta.
// Con eso, muchas veces ya se lee sin necesidad de nada más.

export interface Foto {
  id: string
  imagen: string
  cuando: number
}

/**
 * Cuánto se recorta alrededor del dedo.
 *
 * Una carta ocupa alrededor del 10 % del ancho del tapete encuadrado, así
 * que con un 26 % se coge la carta entera y un margen por si has tocado
 * algo descentrado. El alto sale de la proporción de una carta de Magic
 * (63 × 88 mm), no de un número inventado.
 */
const PARTE_DEL_ANCHO = 0.26
const PROPORCION_CARTA = 63 / 88

/** Lo que cabe cómodamente en un mensaje del canal de datos. */
const TROZO = 16000

/** Si no contesta en este tiempo, se avisa en vez de dejarlo girando. */
const PACIENCIA = 10000

type Mensaje =
  | { que: 'pideFoto'; id: string; x: number; y: number }
  | { que: 'trozoFoto'; id: string; i: number; cuantos: number; dato: string }
  | { que: 'sinFoto'; id: string; motivo: string }

/** Saca un recorte a resolución nativa de tu propia cámara. */
async function recortar(media: MediaStream, x: number, y: number): Promise<string | null> {
  // Un elemento de vídeo suelto, solo para pintar un fotograma. El de la
  // pantalla se ve pequeño, pero eso es tamaño en pantalla: al dibujarlo en
  // un lienzo sale a su resolución de verdad.
  const tele = document.createElement('video')
  tele.srcObject = media
  tele.muted = true
  tele.playsInline = true

  try {
    await tele.play()
    if (tele.readyState < 2) {
      await new Promise<void>((listo) => {
        tele.onloadeddata = () => listo()
        setTimeout(listo, 1500)
      })
    }
    const anchoTotal = tele.videoWidth
    const altoTotal = tele.videoHeight
    if (!anchoTotal || !altoTotal) return null

    const ancho = Math.round(anchoTotal * PARTE_DEL_ANCHO)
    const alto = Math.min(altoTotal, Math.round(ancho / PROPORCION_CARTA))
    const izquierda = Math.max(0, Math.min(anchoTotal - ancho, Math.round(x * anchoTotal - ancho / 2)))
    const arriba = Math.max(0, Math.min(altoTotal - alto, Math.round(y * altoTotal - alto / 2)))

    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const pincel = lienzo.getContext('2d')
    if (!pincel) return null
    pincel.drawImage(tele, izquierda, arriba, ancho, alto, 0, 0, ancho, alto)
    return lienzo.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  } finally {
    tele.srcObject = null
  }
}

interface Opciones {
  /** Tu cámara, que es de donde sale la foto que te piden. */
  miMedia: MediaStream | null
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}

export function useFotos({ miMedia, enviarDato, alRecibirDato }: Opciones) {
  const [foto, setFoto] = useState<Foto | null>(null)
  const [esperando, setEsperando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const miMediaRef = useRef<MediaStream | null>(miMedia)
  const trozos = useRef(new Map<string, string[]>())
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    miMediaRef.current = miMedia
  }, [miMedia])

  /** Pedirle al otro una foto de donde has tocado. */
  const pedir = useCallback(
    (x: number, y: number) => {
      const id = crypto.randomUUID()
      setFallo(null)
      setFoto(null)
      if (!enviarDato({ que: 'pideFoto', id, x, y } satisfies Mensaje)) {
        setFallo('No hay camino directo con tu rival, así que no se le puede pedir la foto.')
        return
      }
      setEsperando(true)
      if (reloj.current) clearTimeout(reloj.current)
      reloj.current = setTimeout(() => {
        setEsperando(false)
        setFallo('Tu rival no ha mandado la foto. ¿Tiene la cámara encendida?')
      }, PACIENCIA)
    },
    [enviarDato],
  )

  const cerrar = useCallback(() => {
    setFoto(null)
    setFallo(null)
  }, [])

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje

      if (mensaje?.que === 'pideFoto') {
        const media = miMediaRef.current
        if (!media || media.getVideoTracks().length === 0) {
          enviarDato({ que: 'sinFoto', id: mensaje.id, motivo: 'sin cámara' } satisfies Mensaje)
          return
        }
        void recortar(media, mensaje.x, mensaje.y).then((imagen) => {
          if (!imagen) {
            enviarDato({ que: 'sinFoto', id: mensaje.id, motivo: 'no ha salido' } satisfies Mensaje)
            return
          }
          // En trozos, porque un mensaje del canal de datos no puede ser
          // tan grande como una foto.
          const cuantos = Math.ceil(imagen.length / TROZO)
          for (let i = 0; i < cuantos; i++) {
            enviarDato({
              que: 'trozoFoto',
              id: mensaje.id,
              i,
              cuantos,
              dato: imagen.slice(i * TROZO, (i + 1) * TROZO),
            } satisfies Mensaje)
          }
        })
        return
      }

      if (mensaje?.que === 'sinFoto') {
        if (reloj.current) clearTimeout(reloj.current)
        setEsperando(false)
        setFallo(
          mensaje.motivo === 'sin cámara'
            ? 'Tu rival tiene la cámara apagada, así que no hay foto que sacar.'
            : 'No se ha podido sacar la foto.',
        )
        return
      }

      if (mensaje?.que === 'trozoFoto') {
        const juntando = trozos.current.get(mensaje.id) ?? new Array<string>(mensaje.cuantos).fill('')
        juntando[mensaje.i] = mensaje.dato
        trozos.current.set(mensaje.id, juntando)
        if (juntando.some((t) => t === '')) return

        trozos.current.delete(mensaje.id)
        if (reloj.current) clearTimeout(reloj.current)
        setEsperando(false)
        setFallo(null)
        setFoto({ id: mensaje.id, imagen: juntando.join(''), cuando: Date.now() })
      }
    })
  }, [alRecibirDato, enviarDato])

  useEffect(() => {
    return () => {
      if (reloj.current) clearTimeout(reloj.current)
    }
  }, [])

  return { foto, esperando, fallo, pedir, cerrar }
}
