import { useEffect, useState, type FormEvent } from 'react'

import {
  datosDelAparato,
  ejecutarComprobaciones,
  type Comprobacion,
  type Resultado,
} from './comprobaciones'
import type { Jugador } from './sesion'
import { mensajeDeError, supabase } from './supabase'

const SIGNOS: Record<Resultado, string> = { bien: '✓', mal: '✕', duda: '?' }

/** Las fases del proyecto. La primera sin hacer es la que toca ahora. */
const FASES = [
  { numero: 0, nombre: 'El terreno', hecha: true },
  { numero: 1, nombre: 'La puerta', hecha: true },
  { numero: 2, nombre: 'La mesa', hecha: false },
  { numero: 3, nombre: 'El vídeo', hecha: false },
  { numero: 4, nombre: 'Los contadores', hecha: false },
  { numero: 5, nombre: 'Las pegatinas', hecha: false },
  { numero: 6, nombre: 'Leer las cartas', hecha: false },
  { numero: 7, nombre: 'Los mazos', hecha: false },
  { numero: 8, nombre: 'El historial', hecha: false },
  { numero: 9, nombre: 'El remate', hecha: false },
]

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
        <p>
          Es el nombre con el que te va a ver tu rival: en el dado de quién empieza y en el
          historial de partidas. Se puede cambiar luego.
        </p>
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
  const fallos = comprobaciones?.filter((c) => c.resultado === 'mal').length ?? 0

  return (
    <main className="pagina">
      <header className="cabecera">
        <p className="cabecera__fase">Fase 1 · La puerta</p>
        <h1 className="cabecera__titulo">Mesa Magic</h1>
        <p className="cabecera__lema">Hola, {jugador.nombre}.</p>
        <button
          type="button"
          className="boton boton--plano"
          onClick={() => supabase.auth.signOut()}
        >
          Salir
        </button>
      </header>

      <section className="tarjeta">
        <h2>Estás dentro, pero esto todavía no juega</h2>
        <p>
          La puerta ya funciona: sin entrar con tu correo y tu clave, esta pantalla no existe.
          Falta la mesa, el vídeo y todo lo demás, que llega por orden.
        </p>
        <p className="aviso">
          <strong>La cámara sigue sin encenderse.</strong> Abajo solo se pregunta al navegador si
          existe alguna. Se encenderá en la fase 3, y solo con sesión y con mesa.
        </p>
      </section>

      <section className="tarjeta">
        <h2>¿Sirve este aparato?</h2>
        {comprobaciones === null ? (
          <p className="cargando">Comprobando…</p>
        ) : (
          <>
            <ul className="comprobaciones">
              {comprobaciones.map((dato) => (
                <FilaComprobacion key={dato.clave} dato={dato} />
              ))}
            </ul>
            <p className={fallos === 0 ? 'resumen resumen--bien' : 'resumen resumen--mal'}>
              {fallos === 0
                ? 'Este aparato sirve.'
                : fallos === 1
                  ? 'Hay 1 comprobación en rojo. Dímelo y la miramos.'
                  : `Hay ${fallos} comprobaciones en rojo. Dímelo y las miramos.`}
            </p>
          </>
        )}
      </section>

      <section className="tarjeta">
        <h2>El plan</h2>
        <ol className="fases">
          {FASES.map((fase) => (
            <li key={fase.numero} className={fase.hecha ? 'fase fase--hecha' : 'fase'}>
              <span className="fase__numero">{fase.numero}</span>
              <span className="fase__nombre">{fase.nombre}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="pie">
        <dl className="aparato">
          {aparato.map((dato) => (
            <div key={dato.etiqueta} className="aparato__par">
              <dt>{dato.etiqueta}</dt>
              <dd>{dato.valor}</dd>
            </div>
          ))}
        </dl>
      </footer>
    </main>
  )
}
