import { useEffect, useState, type FormEvent } from 'react'

import {
  datosDelAparato,
  ejecutarComprobaciones,
  type Comprobacion,
  type Resultado,
} from './comprobaciones'
import { MenuCuenta } from './MenuCuenta'
import { PantallaAjustes } from './PantallaAjustes'
import { PantallaMazos } from './PantallaMazos'
import { PantallaClave } from './PantallaClave'
import { PantallaMesa } from './PantallaMesa'
import type { Jugador } from './sesion'
import { mensajeDeError, supabase } from './supabase'

const SIGNOS: Record<Resultado, string> = { bien: '✓', mal: '✕', duda: '?' }

/** La primera vez que entras no tienes ficha todavia, y hace falta un nombre. */
function PedirNombre({ idUsuario, hecho }: { idUsuario: string; hecho: () => void }) {
  const [nombre, setNombre] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setTrabajando(true)

    const { error: fallo } = await supabase
      .from('jugadores')
      .insert({ id: idUsuario, nombre: nombre.trim() })

    setTrabajando(false)
    if (fallo) setError(mensajeDeError(fallo))
    else hecho()
  }

  return (
    <main className="pagina">
      <section className="tarjeta">
        <h2>¿Cómo te llamas?</h2>
        <form onSubmit={guardar} className="entrada__forma">
          <label className="campo">
            <span className="campo__nombre">Tu nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={40}
              required
              disabled={trabajando}
            />
          </label>
          {error && <p className="recado recado--mal">{error}</p>}
          <button type="submit" className="boton boton--principal" disabled={trabajando}>
            {trabajando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </section>
    </main>
  )
}

function FilaComprobacion({ dato }: { dato: Comprobacion }) {
  return (
    <li className={`comprobacion comprobacion--${dato.resultado}`}>
      <span className="comprobacion__signo" aria-hidden="true">
        {SIGNOS[dato.resultado]}
      </span>
      <div className="comprobacion__texto">
        <p className="comprobacion__titulo">
          {dato.titulo}
          <span className="comprobacion__detalle">{dato.detalle}</span>
        </p>
        <p className="comprobacion__porque">{dato.porQue}</p>
      </div>
    </li>
  )
}

export function PantallaDentro({
  idUsuario,
  jugador,
  recargarJugador,
}: {
  idUsuario: string
  jugador: Jugador | null
  recargarJugador: () => void
}) {
  const [comprobaciones, setComprobaciones] = useState<Comprobacion[] | null>(null)
  const [cambiandoClave, setCambiandoClave] = useState(false)
  const [enAjustes, setEnAjustes] = useState(false)
  const [enMazos, setEnMazos] = useState(false)

  useEffect(() => {
    let vigente = true
    ejecutarComprobaciones().then((lista) => {
      if (vigente) setComprobaciones(lista)
    })
    return () => {
      vigente = false
    }
  }, [])

  if (!jugador) {
    return <PedirNombre idUsuario={idUsuario} hecho={recargarJugador} />
  }

  const aparato = datosDelAparato()

  return (
    <main className="pagina">
      <header className="cabecera">
        <div className="cabecera__titulos">
          <h1 className="cabecera__titulo">Mesa Magic</h1>
          <p className="cabecera__lema">Magic a distancia, mesa contra mesa.</p>
        </div>
        <MenuCuenta
          nombre={jugador.nombre}
          cambiarClave={() => setCambiandoClave(true)}
          abrirAjustes={() => setEnAjustes(true)}
          abrirMazos={() => setEnMazos(true)}
        />
      </header>

      {enAjustes && <PantallaAjustes cerrar={() => setEnAjustes(false)} />}
      {enMazos && <PantallaMazos idUsuario={idUsuario} cerrar={() => setEnMazos(false)} />}

      {cambiandoClave && (
        <PantallaClave
          recuperando={false}
          hecho={() => setCambiandoClave(false)}
          cancelar={() => setCambiandoClave(false)}
        />
      )}

      <PantallaMesa nombre={jugador.nombre} />

      {/* Las comprobaciones del aparato van plegadas: hacen falta una vez,
          el día que algo no va, y el resto del tiempo son ruido. */}
      <details className="comprobar">
        <summary>¿Sirve este aparato?</summary>
        {comprobaciones === null ? (
          <p className="cargando">Comprobando…</p>
        ) : (
          <ul className="comprobaciones">
            {comprobaciones.map((dato) => (
              <FilaComprobacion key={dato.clave} dato={dato} />
            ))}
          </ul>
        )}
        <dl className="aparato">
          {aparato.map((dato) => (
            <div key={dato.etiqueta} className="aparato__par">
              <dt>{dato.etiqueta}</dt>
              <dd>{dato.valor}</dd>
            </div>
          ))}
        </dl>
      </details>
    </main>
  )
}
