import { useRef, type CSSProperties, type PointerEvent as EventoPuntero } from 'react'

import { CLASES, type ManejoPegatinas, type Pegatina } from './pegatinas'

const CORTAS = new Map(CLASES.map((c) => [c.clase, c.corta]))
const CUENTAN = new Map(CLASES.map((c) => [c.clase, c.cuenta]))

function Pegada({
  dato,
  marco,
  manejo,
}: {
  dato: Pegatina
  /** La caja del fotograma, para pasar de píxeles a 0-1 y al revés. */
  marco: React.RefObject<HTMLDivElement | null>
  manejo: ManejoPegatinas
}) {
  /**
   * El arrastre se escucha en la VENTANA, no en la pegatina.
   *
   * Lo primero que se probó fue `setPointerCapture`, que es lo que suena
   * más correcto, y no movía nada. Escuchando en la ventana el arrastre
   * sigue aunque el dedo se salga de la pegatina —que es lo normal al
   * mover deprisa—, aunque pase por encima de otra, y aunque React
   * repinte en medio.
   */
  function alBajar(evento: EventoPuntero<HTMLDivElement>) {
    evento.preventDefault()
    const caja = marco.current?.getBoundingClientRect()
    if (!caja || caja.width === 0 || caja.height === 0) return
    manejo.empezarArrastre(dato.id)

    function alArrastrar(suelto: PointerEvent) {
      if (!caja) return
      manejo.mover(dato.id, (suelto.clientX - caja.left) / caja.width, (suelto.clientY - caja.top) / caja.height)
    }

    function alSoltar() {
      window.removeEventListener('pointermove', alArrastrar)
      window.removeEventListener('pointerup', alSoltar)
      window.removeEventListener('pointercancel', alSoltar)
      manejo.terminarArrastre()
    }

    window.addEventListener('pointermove', alArrastrar)
    window.addEventListener('pointerup', alSoltar)
    window.addEventListener('pointercancel', alSoltar)
  }

  // Los botoncitos no pueden empezar un arrastre: si no, tocar el «+» en el
  // móvil movería la pegatina en vez de subir el número.
  function soloElBoton(evento: EventoPuntero<HTMLButtonElement>) {
    evento.stopPropagation()
  }

  return (
    <div
      className={`pegada pegada--${dato.clase}`}
      style={{ left: `${dato.x * 100}%`, top: `${dato.y * 100}%` }}
      onPointerDown={alBajar}
    >
      <span className="pegada__que">{CORTAS.get(dato.clase)}</span>

      {CUENTAN.get(dato.clase) && (
        <>
          <button
            type="button"
            className="pegada__tecla"
            onPointerDown={soloElBoton}
            onClick={() => manejo.cambiar(dato.id, -1)}
            aria-label="Uno menos"
          >
            −
          </button>
          <strong className="pegada__valor">{dato.valor}</strong>
          <button
            type="button"
            className="pegada__tecla"
            onPointerDown={soloElBoton}
            onClick={() => manejo.cambiar(dato.id, 1)}
            aria-label="Uno más"
          >
            +
          </button>
        </>
      )}

      <button
        type="button"
        className="pegada__tecla pegada__tecla--quitar"
        onPointerDown={soloElBoton}
        onClick={() => manejo.borrar(dato.id)}
        aria-label="Quitar esta pegatina"
      >
        ×
      </button>
    </div>
  )
}

/**
 * La capa de pegatinas de una mesa.
 *
 * Va colocada encima del fotograma de verdad, no de la caja del vídeo. Es
 * la diferencia entre que una pegatina caiga donde la pusiste o varios
 * centímetros más allá: un móvil en vertical deja dos franjas negras a los
 * lados, y contarlas como parte de la imagen descoloca todo.
 */
export function CapaPegatinas({
  lista,
  estilo,
  manejo,
}: {
  lista: Pegatina[]
  estilo: CSSProperties
  manejo: ManejoPegatinas
}) {
  const marco = useRef<HTMLDivElement>(null)

  return (
    <div className="capa" style={estilo} ref={marco}>
      {lista.map((dato) => (
        <Pegada key={dato.id} dato={dato} marco={marco} manejo={manejo} />
      ))}
    </div>
  )
}
