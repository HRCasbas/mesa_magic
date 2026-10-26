import { useState, type FormEvent } from 'react'

import { mensajeDeError, supabase } from './supabase'

/**
 * La puerta. Sin pasar por aqui no se ve nada de la aplicacion.
 *
 * No hay boton de «crear cuenta» a proposito: el registro esta cerrado en
 * Supabase y las dos cuentas se crean a mano. Una web abierta en internet
 * con un boton de registro es una web a la que puede entrar cualquiera, y
 * aqui se encienden camaras.
 */
export function PantallaEntrada() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function entrar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    setTrabajando(true)

    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    })

    if (fallo) {
      setError(mensajeDeError(fallo))
      setTrabajando(false)
    }
    // Si sale bien no hace falta hacer nada: la sesion cambia y la
    // aplicacion entera se entera sola.
  }

  async function recuperarClave() {
    if (!correo.trim()) {
      setError('Escribe primero tu correo y vuelve a pulsar.')
      return
    }
    setError(null)
    setTrabajando(true)

    const { error: fallo } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: window.location.origin + window.location.pathname,
    })

    setTrabajando(false)
    if (fallo) {
      setError(mensajeDeError(fallo))
    } else {
      setAviso('Te hemos mandado un correo para poner una clave nueva.')
    }
  }

  return (
    <main className="entrada">
      <div className="entrada__caja">
        <header className="entrada__cabecera">
          <h1 className="entrada__titulo">Mesa Magic</h1>
          <p className="entrada__lema">Magic: The Gathering a distancia, mesa contra mesa.</p>
        </header>

        <form onSubmit={entrar} className="entrada__forma">
          <label className="campo">
            <span className="campo__nombre">Correo</span>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              required
              disabled={trabajando}
            />
          </label>

          <label className="campo">
            <span className="campo__nombre">Clave</span>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
              disabled={trabajando}
            />
          </label>

          {error && <p className="recado recado--mal">{error}</p>}
          {aviso && <p className="recado recado--bien">{aviso}</p>}

          <button type="submit" className="boton boton--principal" disabled={trabajando}>
            {trabajando ? 'Entrando…' : 'Entrar'}
          </button>

          <button
            type="button"
            className="boton boton--plano"
            onClick={recuperarClave}
            disabled={trabajando}
          >
            He olvidado la clave
          </button>
        </form>

        <p className="entrada__pie">
          El registro está cerrado. Las cuentas se crean a mano, de una en una.
        </p>
      </div>
    </main>
  )
}
