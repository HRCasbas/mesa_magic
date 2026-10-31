import { useEffect, useState, type FormEvent } from 'react'

import {
  datosDelAparato,
  ejecutarComprobaciones,
  type Comprobacion,
  type Resultado,
} from './comprobaciones'
import { MenuCuenta } from './MenuCuenta'
import { PantallaAjustes } from './PantallaAjustes'
import { PantallaHistorial } from './PantallaHistorial'
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
  /** En qué sección estás. Solo se ve una cada vez. */
  const [donde, setDonde] = useState<"mesa" | "mazos" | "ajustes" | "clave" | "historial">("mesa")
  const volver = () => setDonde("mesa")

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
    /* Un mazo abierto necesita toda la pantalla: son sesenta cartas. El
       resto de secciones se leen mejor en una columna estrecha. */
    <main className={donde === 'mazos' ? 'pagina pagina--ancha' : 'pagina'}>
      <header className="cabecera">
        <div className="cabecera__titulos">
          <h1 className="cabecera__titulo">Magic Mesa</h1>
          <p className="cabecera__lema">Magic a distancia, mesa contra mesa.</p>
        </div>
        <MenuCuenta
          nombre={jugador.nombre}
          avatar={jugador.avatar}
          abrirMesa={volver}
          cambiarClave={() => setDonde("clave")}
          abrirAjustes={() => setDonde("ajustes")}
          abrirMazos={() => setDonde("mazos")}
          abrirHistorial={() => setDonde("historial")}
        />
      </header>

      {/* Cada cosa del menú es una SECCIÓN, no un trozo más pegado
          debajo: se va a ella y se vuelve. Antes se añadían al final de la
          página y había que buscarlas con la rueda del ratón. */}
      {donde === 'mazos' && <PantallaMazos idUsuario={idUsuario} cerrar={volver} />}
      {donde === 'ajustes' && (
        <PantallaAjustes
          cerrar={volver}
          idUsuario={idUsuario}
          nombre={jugador.nombre}
          avatar={jugador.avatar}
          avatarCambiado={recargarJugador}
        />
      )}
      {donde === "historial" && <PantallaHistorial tuId={idUsuario} cerrar={volver} />}
      {donde === 'clave' && (
        <PantallaClave recuperando={false} hecho={volver} cancelar={volver} />
      )}

      {donde === 'mesa' && (
        <>
          <PantallaMesa nombre={jugador.nombre} avatar={jugador.avatar} />

          {/* Plegadas: hacen falta una vez, el día que algo no va. */}
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
        </>
      )}
    </main>
  )
}
