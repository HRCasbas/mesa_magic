import { useState } from 'react'

import { MOTIVOS, type Motivo, type useFinDePartida } from './partidas'

/**
 * Terminar la partida.
 *
 * Uno lo declara y el otro lo acepta (regla 6). La aplicación no mira las
 * vidas ni nada: se limita a pasar el recado y a apuntarlo cuando los dos
 * están de acuerdo.
 */
export function FinDePartida({
  tuId,
  suId,
  tuNombre,
  suNombre,
  fin,
}: {
  tuId: string
  suId: string
  tuNombre: string
  suNombre: string
  fin: ReturnType<typeof useFinDePartida>
}) {
  const [abierto, setAbierto] = useState(false)
  const [gano, setGano] = useState(tuId)
  const [motivo, setMotivo] = useState<Motivo>('vidas')

  const comoSeLlama = (id: string) => (id === tuId ? tuNombre : suNombre)
  const nombreDelMotivo = (m: Motivo) => MOTIVOS.find((x) => x.motivo === m)?.nombre ?? m

  if (fin.recibido) {
    return (
      <section className="tarjeta fin">
        <h2>Fin de la partida</h2>
        <p className="fin__dice">
          Gana <strong>{comoSeLlama(fin.recibido.gano)}</strong>.{' '}
          {nombreDelMotivo(fin.recibido.motivo)}.
        </p>
        {fin.fallo && <p className="recado recado--mal">{fin.fallo}</p>}
        <div className="controles">
          <button
            type="button"
            className="boton boton--principal"
            onClick={() => void fin.aceptar()}
            disabled={fin.guardando}
          >
            {fin.guardando ? 'Apuntando…' : 'De acuerdo'}
          </button>
          <button type="button" className="boton boton--plano" onClick={fin.rechazar}>
            No
          </button>
        </div>
      </section>
    )
  }

  if (fin.propuesto) {
    return (
      <section className="tarjeta fin">
        <h2>Fin de la partida</h2>
        <p className="fin__dice">Esperando a que {suNombre} lo acepte…</p>
        <button type="button" className="boton boton--plano" onClick={fin.retirar}>
          Retirarlo
        </button>
      </section>
    )
  }

  if (!abierto) {
    return (
      <button type="button" className="boton boton--plano fin__abrir" onClick={() => setAbierto(true)}>
        Finalizar partida
      </button>
    )
  }

  return (
    <section className="tarjeta fin">
      <h2>¿Cómo ha quedado?</h2>
      <label className="campo">
        <span className="campo__nombre">Gana</span>
        <select value={gano} onChange={(e) => setGano(e.target.value)}>
          <option value={tuId}>{tuNombre}</option>
          <option value={suId}>{suNombre}</option>
        </select>
      </label>
      <label className="campo">
        <span className="campo__nombre">Por</span>
        <select value={motivo} onChange={(e) => setMotivo(e.target.value as Motivo)}>
          {MOTIVOS.map((m) => (
            <option key={m.motivo} value={m.motivo}>
              {m.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="controles">
        <button
          type="button"
          className="boton boton--principal"
          onClick={() => {
            fin.proponer(gano, motivo)
            setAbierto(false)
          }}
        >
          Proponer
        </button>
        <button type="button" className="boton boton--plano" onClick={() => setAbierto(false)}>
          Dejarlo
        </button>
      </div>
    </section>
  )
}
