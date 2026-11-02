import { useEffect, useRef, useState } from 'react'

import { guardarUltimoMazo, ultimoMazo } from './ajustes'
import { mazoParaJugar, type MazoEnJuego } from './mazoElegido'
import { useCartasDelMazo, useMazos } from './mazos'

/**
 * Elegir con qué mazo juegas.
 *
 * Regla 5: no se empieza una partida sin que los dos hayan elegido. No es
 * burocracia, es lo único que hace que el historial valga algo.
 */
export function ElegirMazo({
  mio,
  suyo,
  nombreDelOtro,
  elegir,
}: {
  mio: MazoEnJuego | null
  suyo: MazoEnJuego | null
  nombreDelOtro: string | null
  elegir: (mazo: MazoEnJuego | null) => void
}) {
  const { lista } = useMazos()
  const [pedido, setPedido] = useState<string | null>(null)
  /** Lo que marca el desplegable antes de darle a jugar. */
  const [marcado, setMarcado] = useState(() => ultimoMazo() ?? '')
  const cartas = useCartasDelMazo(pedido)

  // En cuanto llegan las cartas del mazo pedido, se da por elegido. Va en
  // un efecto y no en el pintado: avisar al padre mientras React está
  // pintando este componente es justo lo que no se puede hacer.
  const yaMandado = useRef<string | null>(null)
  useEffect(() => {
    if (!pedido || !cartas || yaMandado.current === pedido) return
    const mazo = lista?.find((m) => m.id === pedido)
    if (!mazo) return
    yaMandado.current = pedido
    guardarUltimoMazo(pedido)
    elegir(mazoParaJugar(mazo, cartas))
  }, [pedido, cartas, lista, elegir])

  if (mio) {
    return (
      <section className="tarjeta">
        <h2>Los mazos</h2>
        <ul className="elegidos">
          <li>
            <strong>{mio.nombre}</strong>
            <span>tú</span>
          </li>
          <li>
            {suyo ? (
              <strong>{suyo.nombre}</strong>
            ) : (
              <span className="cargando">{nombreDelOtro ?? 'Tu rival'} está eligiendo…</span>
            )}
            {suyo && <span>{nombreDelOtro ?? 'tu rival'}</span>}
          </li>
        </ul>
        <button type="button" className="boton boton--plano" onClick={() => {
            yaMandado.current = null
            setPedido(null)
            elegir(null)
          }}>
          Cambiar de mazo
        </button>
      </section>
    )
  }

  // Por orden alfabético: con catorce mazos, el orden por fecha no sirve
  // para encontrar ninguno.
  const ordenados = [...(lista ?? [])].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  )

  return (
    <section className="tarjeta">
      <h2>Elige mazo</h2>
      {lista === null && <p className="cargando">…</p>}
      {lista?.length === 0 && <p>No tienes mazos todavía.</p>}
      {/* El desplegable viene con el último mazo que jugaste puesto, y no
          se elige hasta darle al botón: al acabar una partida se juega otra
          con el mismo casi siempre, pero hay que poder cambiarlo ANTES de
          que salga la moneda (Héctor, 02/11/2026). */}
      {ordenados.length > 0 && (
        <>
          <select
            className="elegir"
            value={ordenados.some((m) => m.id === marcado) ? marcado : ''}
            disabled={pedido !== null}
            onChange={(e) => setMarcado(e.target.value)}
          >
            <option value="">Elige uno</option>
            {ordenados.map((mazo) => (
              <option key={mazo.id} value={mazo.id}>
                {mazo.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="boton boton--principal"
            disabled={!marcado || pedido !== null}
            onClick={() => setPedido(marcado)}
          >
            {pedido ? 'Un momento…' : 'Jugar con este'}
          </button>
        </>
      )}
    </section>
  )
}
