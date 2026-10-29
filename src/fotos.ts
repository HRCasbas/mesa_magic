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
 * Lo más pequeño que puede ser un recuadro para tomárselo en serio.
 *
 * ANTES ERA UNA PULSACIÓN y se recortaba un trozo fijo alrededor del dedo.
 * No valía: Héctor lo probó el 28/10/2026 y «solo amplía una sección
 * aleatoria». Con la cámara a un metro de la mesa, acertar una carta con
 * un dedo es imposible. Ahora se arrastra un recuadro y se amplía lo que
 * hayas encuadrado, que es lo único que no falla.
 */
const RECUADRO_MINIMO = 0.02

/** Lo que cabe cómodamente en un mensaje del canal de datos. */
const TROZO = 16000

/** Si no contesta en este tiempo, se avisa en vez de dejarlo girando. */
const PACIENCIA = 10000

/** Un recuadro sobre el fotograma, de 0 a 1. Nunca en píxeles. */
export interface Recuadro {
  x: number
  y: number
  ancho: number
  alto: number
}

type Mensaje =
  | { que: 'pideFoto'; id: string; recuadro: Recuadro }
  | { que: 'trozoFoto'; id: string; i: number; cuantos: number; dato: string }
  | { que: 'sinFoto'; id: string; motivo: string }

/** Saca un recorte a resolución nativa de tu propia cámara. */
async function recortar(media: MediaStream, recuadro: Recuadro): Promise<string | null> {
  // Un elemento de vídeo suelto, solo para pintar un fotograma. El de la
  // pantalla se ve pequeño, pero eso es tamaño en pantalla: al dibujarlo en
  // un lienzo sale a su resolución de verdad.
  const tele = document.createElement('video')
  tele.srcObject = media
  tele.muted = true
  tele.playsInline = true
  // METIDO EN LA PÁGINA, AUNQUE NO SE VEA (28/10/2026). Un vídeo suelto,
  // sin colgar de la página, el navegador puede no molestarse en
  // descodificarlo: se queda en negro y la foto sale negra. Pasó de verdad,
  // con la cámara buena y la imagen perfecta. Se cuelga fuera de la
  // pantalla y se quita en cuanto se ha pintado el fotograma.
  tele.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0'
  document.body.appendChild(tele)

  try {
    await tele.play()
    // Y SE ESPERA A UN FOTOGRAMA DE VERDAD. `loadeddata` dice que hay
    // metadatos, no que haya imagen que pintar.
    await new Promise<void>((listo) => {
      let hecho = false
      const acabar = () => {
        if (hecho) return
        hecho = true
        listo()
      }
      const conFotograma = tele as HTMLVideoElement & {
        requestVideoFrameCallback?: (f: () => void) => number
      }
      if (typeof conFotograma.requestVideoFrameCallback === 'function') {
        conFotograma.requestVideoFrameCallback(acabar)
      } else {
        tele.addEventListener('loadeddata', acabar, { once: true })
      }
      // Por si el navegador no avisa nunca: mejor una foto regular que
      // ninguna.
      setTimeout(acabar, 2500)
    })
    const anchoTotal = tele.videoWidth
    const altoTotal = tele.videoHeight
    if (!anchoTotal || !altoTotal) return null

    const ancho = Math.max(16, Math.round(recuadro.ancho * anchoTotal))
    const alto = Math.max(16, Math.round(recuadro.alto * altoTotal))
    const izquierda = Math.max(0, Math.min(anchoTotal - ancho, Math.round(recuadro.x * anchoTotal)))
    const arriba = Math.max(0, Math.min(altoTotal - alto, Math.round(recuadro.y * altoTotal)))

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
    tele.pause()
    tele.srcObject = null
    tele.remove()
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
    (recuadro: Recuadro) => {
      if (recuadro.ancho < RECUADRO_MINIMO || recuadro.alto < RECUADRO_MINIMO) return
      const id = crypto.randomUUID()
      setFallo(null)
      setFoto(null)
      if (!enviarDato({ que: 'pideFoto', id, recuadro } satisfies Mensaje)) {
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
        void recortar(media, mensaje.recuadro).then((imagen) => {
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
