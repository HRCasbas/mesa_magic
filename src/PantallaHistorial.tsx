import { MOTIVOS, borrarPartida, useHistorial, type Partida } from './partidas'

function portadaDe(nombre: string): string {
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nombre)}&format=image&version=art_crop`
}

function cuando(fecha: string): string {
  return new Date(fecha).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Victorias y derrotas de cada mazo tuyo, que es lo que de verdad se mira. */
function porMazo(lista: Partida[], tuId: string) {
  const cuenta = new Map<string, { ganadas: number; perdidas: number }>()
  for (const p of lista) {
    const soyUno = p.uno === tuId
    const miMazo = soyUno ? p.unoMazo : p.dosMazo
    const gane = p.gano === tuId
    const sitio = cuenta.get(miMazo) ?? { ganadas: 0, perdidas: 0 }
    if (gane) sitio.ganadas += 1
    else sitio.perdidas += 1
    cuenta.set(miMazo, sitio)
  }
  return [...cuenta.entries()].sort(
    (a, b) => b[1].ganadas + b[1].perdidas - (a[1].ganadas + a[1].perdidas),
  )
}

export function PantallaHistorial({ tuId, cerrar }: { tuId: string; cerrar: () => void }) {
  const { lista, recargar } = useHistorial()
  const nombreDelMotivo = (m: string) => MOTIVOS.find((x) => x.motivo === m)?.nombre ?? m

  return (
    <section className="tarjeta">
      <div className="mazo__cabecera">
        <h2 className="mazo__nombre">Historial</h2>
        <button type="button" className="boton boton--plano" onClick={cerrar}>
          Cerrar
        </button>
      </div>

      {lista === null && <p className="cargando">Trayendo las partidas…</p>}
      {lista?.length === 0 && <p>Todavía no habéis terminado ninguna partida.</p>}

      {lista && lista.length > 0 && (
        <>
          <ul className="balance">
            {porMazo(lista, tuId).map(([mazo, { ganadas, perdidas }]) => (
              <li key={mazo}>
                <span>{mazo}</span>
                <strong>
                  {ganadas}–{perdidas}
                </strong>
              </li>
            ))}
          </ul>

          <ul className="partidas">
            {lista.map((p) => {
              const soyUno = p.uno === tuId
              const miMazo = soyUno ? p.unoMazo : p.dosMazo
              const suMazo = soyUno ? p.dosMazo : p.unoMazo
              const suNombre = soyUno ? p.dosNombre : p.unoNombre
              const miPortada = soyUno ? p.unoPortada : p.dosPortada
              const gane = p.gano === tuId
              return (
                <li key={p.id} className={gane ? 'partida partida--gane' : 'partida'}>
                  <span className="partida__portada">
                    {miPortada && <img src={portadaDe(miPortada)} alt="" loading="lazy" />}
                  </span>
                  <span className="partida__texto">
                    <strong>
                      {miMazo} <span className="partida__contra">contra</span> {suMazo}
                    </strong>
                    <span className="partida__detalle">
                      {gane ? 'Ganaste' : `Ganó ${suNombre}`} · {nombreDelMotivo(p.motivo)} ·{' '}
                      {p.turnos} {p.turnos === 1 ? 'turno' : 'turnos'} · {cuando(p.jugada)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="tecla"
                    aria-label="Borrar esta partida"
                    onClick={async () => {
                      if (!window.confirm('¿Borrar esta partida del historial?')) return
                      await borrarPartida(p.id)
                      recargar()
                    }}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
