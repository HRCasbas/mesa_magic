import type { CartaDelMazo } from './mazos'
import type { Carta } from './scryfall'

/**
 * Las copias de una carta, apiladas: de cada una solo asoma la banda del
 * nombre y la última se ve entera.
 *
 * Es como está el mazo encima de la mesa, y por eso se entiende sin
 * explicarlo: se cuentan las bandas. Lo eligió Héctor el 30/10/2026
 * enseñando una foto de otra web.
 *
 * Vive aquí y no dentro de la pantalla de mazos porque **se usa en dos
 * sitios**: tus mazos y el del rival en plena partida.
 */
export function Pila({
  carta,
  imagen,
  esPortada,
  alPulsar,
  alMenu,
}: {
  carta: CartaDelMazo
  imagen: Carta | undefined
  esPortada?: boolean
  alPulsar?: () => void
  alMenu?: (evento: React.MouseEvent) => void
}) {
  const copias = Array.from({ length: Math.min(carta.cantidad, 9) })

  return (
    <button
      type="button"
      className={esPortada ? 'pila pila--portada' : 'pila'}
      title={`${carta.cantidad} × ${carta.nombre}`}
      onClick={alPulsar}
      onContextMenu={alMenu}
    >
      {copias.map((_, i) =>
        imagen?.imagen ? (
          <img
            key={i}
            className="pila__carta"
            src={imagen.imagen}
            alt={i === copias.length - 1 ? carta.nombre : ''}
            loading="lazy"
          />
        ) : (
          <span key={i} className="pila__carta pila__carta--sinfoto">
            {carta.nombre}
          </span>
        ),
      )}
      {carta.cantidad > 9 && <span className="pila__muchas">×{carta.cantidad}</span>}
    </button>
  )
}
