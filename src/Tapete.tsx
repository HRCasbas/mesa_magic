import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { CapaPegatinas } from './CapaPegatinas'
import type { Recuadro } from './fotos'
import type { ManejoPegatinas, Pegatina } from './pegatinas'

/** Dónde cae la imagen de verdad dentro de la caja, en píxeles. */
interface Marco {
  izquierda: number
  arriba: number
  ancho: number
  alto: number
}

const TODA_LA_CAJA: CSSProperties = { inset: 0 }

/**
 * Una mesa vista por la cámara, con sus pegatinas encima.
 *
 * Las pegatinas van sobre **el fotograma pintado**, no sobre la caja: con
 * `object-fit: contain`, un móvil en vertical deja dos franjas negras a los
 * lados, y contarlas como imagen descoloca todo.
 */
export function Mesa({
  media,
  mia,
  pequena,
  etiqueta,
  vacia,
  pegatinas,
  manejo,
  apuntando,
  alSeleccionar,
  alPulsar,
}: {
  media: MediaStream | null
  /** Es tu cámara: va muda, o te oirías a ti mismo con retardo. */
  mia: boolean
  /** Va en la esquina, pequeña. No tiene que ver con de quién sea. */
  pequena?: boolean
  etiqueta: string
  vacia: string
  pegatinas: Pegatina[]
  manejo: ManejoPegatinas
  /** Puesto, arrastrar encima dibuja el recuadro de lo que quieres ampliar. */
  apuntando?: boolean
  alSeleccionar?: (recuadro: Recuadro) => void
  /** Pulsar la imagen pequeña la cambia por la grande. */
  alPulsar?: () => void
}) {
  const elemento = useRef<HTMLVideoElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const [marco, setMarco] = useState<Marco | null>(null)
  const [dibujando, setDibujando] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
  } | null>(null)

  useEffect(() => {
    if (elemento.current) elemento.current.srcObject = media
  }, [media])

  useEffect(() => {
    const video = elemento.current
    const fuera = caja.current
    if (!video || !fuera) return

    function recalcular() {
      if (!video || !fuera) return
      const sitio = fuera.getBoundingClientRect()
      if (!video.videoWidth || !video.videoHeight || !sitio.width || !sitio.height) {
        setMarco(null)
        return
      }
      const deLaImagen = video.videoWidth / video.videoHeight
      const deLaCaja = sitio.width / sitio.height
      const ancho = deLaImagen > deLaCaja ? sitio.width : sitio.height * deLaImagen
      const alto = deLaImagen > deLaCaja ? sitio.width / deLaImagen : sitio.height
      setMarco({
        izquierda: (sitio.width - ancho) / 2,
        arriba: (sitio.height - alto) / 2,
        ancho,
        alto,
      })
    }

    video.addEventListener('loadedmetadata', recalcular)
    video.addEventListener('resize', recalcular)
    // Al empezar a observar, el navegador avisa una primera vez solo.
    const vigilante = new ResizeObserver(recalcular)
    vigilante.observe(fuera)

    return () => {
      video.removeEventListener('loadedmetadata', recalcular)
      video.removeEventListener('resize', recalcular)
      vigilante.disconnect()
    }
  }, [media])

  /**
   * Encuadrar una carta arrastrando un recuadro.
   *
   * Antes era una pulsación y se recortaba un trozo fijo alrededor del
   * dedo. Con la cámara a un metro de la mesa eso no acierta nunca:
   * «solo amplía una sección aleatoria». Arrastrando se amplía justo lo
   * que has encuadrado.
   */
  function empezarRecuadro(evento: React.PointerEvent<HTMLDivElement>) {
    if (!apuntando || !alSeleccionar) return
    const fuera = caja.current?.getBoundingClientRect()
    if (!fuera) return
    const izquierda = marco ? marco.izquierda : 0
    const arriba = marco ? marco.arriba : 0
    const anchoMarco = marco ? marco.ancho : fuera.width
    const altoMarco = marco ? marco.alto : fuera.height
    if (!anchoMarco || !altoMarco) return
    evento.preventDefault()

    const dentro = (cx: number, cy: number) => ({
      x: Math.min(1, Math.max(0, (cx - fuera.left - izquierda) / anchoMarco)),
      y: Math.min(1, Math.max(0, (cy - fuera.top - arriba) / altoMarco)),
    })

    const empezo = dentro(evento.clientX, evento.clientY)
    setDibujando({ x1: empezo.x, y1: empezo.y, x2: empezo.x, y2: empezo.y })

    function alArrastrar(suelto: PointerEvent) {
      const ahora = dentro(suelto.clientX, suelto.clientY)
      setDibujando((previo) => (previo ? { ...previo, x2: ahora.x, y2: ahora.y } : previo))
    }

    function alSoltar(suelto: PointerEvent) {
      window.removeEventListener('pointermove', alArrastrar)
      window.removeEventListener('pointerup', alSoltar)
      const fin = dentro(suelto.clientX, suelto.clientY)
      // EL RECUADRO SE QUEDA PUESTO (Héctor, 28/10/2026). Si la carta no
      // se reconoce, al menos ves qué encuadraste, y sabes si fallaste tú
      // o falló la lectura. Desaparece al empezar el siguiente.
      setDibujando({ x1: empezo.x, y1: empezo.y, x2: fin.x, y2: fin.y })
      alSeleccionar?.({
        x: Math.min(empezo.x, fin.x),
        y: Math.min(empezo.y, fin.y),
        ancho: Math.abs(fin.x - empezo.x),
        alto: Math.abs(fin.y - empezo.y),
      })
    }

    window.addEventListener('pointermove', alArrastrar)
    window.addEventListener('pointerup', alSoltar)
  }

  const estilo: CSSProperties = marco
    ? { left: marco.izquierda, top: marco.arriba, width: marco.ancho, height: marco.alto }
    : TODA_LA_CAJA

  /** El recuadro que estás dibujando, puesto en píxeles sobre la caja. */
  function dondeVaElRecuadro(d: { x1: number; y1: number; x2: number; y2: number }): CSSProperties {
    // Sin fotograma medido todavía, la capa ocupa la caja entera y basta
    // con porcentajes.
    if (!marco) {
      return {
        left: `${Math.min(d.x1, d.x2) * 100}%`,
        top: `${Math.min(d.y1, d.y2) * 100}%`,
        width: `${Math.abs(d.x2 - d.x1) * 100}%`,
        height: `${Math.abs(d.y2 - d.y1) * 100}%`,
      }
    }
    return {
      left: marco.izquierda + Math.min(d.x1, d.x2) * marco.ancho,
      top: marco.arriba + Math.min(d.y1, d.y2) * marco.alto,
      width: Math.abs(d.x2 - d.x1) * marco.ancho,
      height: Math.abs(d.y2 - d.y1) * marco.alto,
    }
  }

  return (
    <div
      className={`mesavideo${pequena ? ' mesavideo--pip' : ''}${apuntando ? ' mesavideo--apuntando' : ''}`}
      ref={caja}
      onPointerDown={empezarRecuadro}
      onClick={alPulsar}
    >
      <video ref={elemento} autoPlay playsInline muted={mia} />
      {!media && <p className="mesavideo__vacia">{vacia}</p>}
      <CapaPegatinas lista={pegatinas} estilo={estilo} manejo={manejo} />
      {dibujando && <div className="recuadro" style={dondeVaElRecuadro(dibujando)} />}
      <span className="mesavideo__etiqueta">{etiqueta}</span>
    </div>
  )
}
