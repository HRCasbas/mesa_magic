import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { CapaPegatinas } from './CapaPegatinas'
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
  etiqueta,
  vacia,
  pegatinas,
  manejo,
  apuntando,
  alTocar,
}: {
  media: MediaStream | null
  mia: boolean
  etiqueta: string
  vacia: string
  pegatinas: Pegatina[]
  manejo: ManejoPegatinas
  apuntando?: boolean
  alTocar?: (x: number, y: number) => void
}) {
  const elemento = useRef<HTMLVideoElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const [marco, setMarco] = useState<Marco | null>(null)

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

  function tocado(evento: React.MouseEvent<HTMLDivElement>) {
    if (!apuntando || !alTocar) return
    const fuera = caja.current?.getBoundingClientRect()
    if (!fuera) return
    const izquierda = marco ? marco.izquierda : 0
    const arriba = marco ? marco.arriba : 0
    const ancho = marco ? marco.ancho : fuera.width
    const alto = marco ? marco.alto : fuera.height
    if (!ancho || !alto) return
    const x = (evento.clientX - fuera.left - izquierda) / ancho
    const y = (evento.clientY - fuera.top - arriba) / alto
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    alTocar(x, y)
  }

  const estilo: CSSProperties = marco
    ? { left: marco.izquierda, top: marco.arriba, width: marco.ancho, height: marco.alto }
    : TODA_LA_CAJA

  return (
    <div
      className={`mesavideo${mia ? ' mesavideo--mia' : ''}${apuntando ? ' mesavideo--apuntando' : ''}`}
      ref={caja}
      onClick={tocado}
    >
      <video ref={elemento} autoPlay playsInline muted={mia} />
      {!media && <p className="mesavideo__vacia">{vacia}</p>}
      <CapaPegatinas lista={pegatinas} estilo={estilo} manejo={manejo} />
      <span className="mesavideo__etiqueta">{etiqueta}</span>
    </div>
  )
}
