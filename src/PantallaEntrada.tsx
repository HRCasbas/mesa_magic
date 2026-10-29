import { useState, type FormEvent } from 'react'

import { valeElCodigo } from './registro'
import { FALLO_DEL_ENLACE, mensajeDeError, supabase } from './supabase'

type Puerta = 'entrar' | 'crear' | 'olvidada'

/** Lo mínimo para que una clave no sea un regalo. Supabase pide seis. */
const LARGO_MINIMO = 8

/** A dónde vuelve el correo de confirmar o de clave nueva. */
function aDondeVuelve(): string {
  return window.location.origin + window.location.pathname
}

export function PantallaEntrada() {
  const [puerta, setPuerta] = useState<Puerta>('entrar')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const [codigo, setCodigo] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  // Si vienes de un enlace que no valia, se dice nada mas abrir, sin que
  // tengas que pulsar nada: es la unica pista que tienes de por que has
  // acabado otra vez en la puerta.
  const [error, setError] = useState<string | null>(FALLO_DEL_ENLACE)
  const [aviso, setAviso] = useState<string | null>(null)

  function cambiarA(cual: Puerta) {
    setPuerta(cual)
    setError(null)
    setAviso(null)
    setClave('')
    setRepetida('')
  }

  async function entrar() {
    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    })
    if (fallo) {
      setError(mensajeDeError(fallo))
      setTrabajando(false)
    }
    // Si sale bien no hay que hacer nada: la sesión cambia y la aplicación
    // entera se entera sola.
  }

  async function crearCuenta() {
    if (!valeElCodigo(codigo)) {
      setError('Ese código de invitación no vale. Pídeselo a quien te haya invitado.')
      setTrabajando(false)
      return
    }
    if (clave.length < LARGO_MINIMO) {
      setError(`La clave tiene que tener al menos ${LARGO_MINIMO} letras o números.`)
      setTrabajando(false)
      return
    }
    if (clave !== repetida) {
      setError('Las dos claves no son iguales.')
      setTrabajando(false)
      return
    }

    const { data, error: fallo } = await supabase.auth.signUp({
      email: correo.trim(),
      password: clave,
      options: { emailRedirectTo: aDondeVuelve() },
    })
    setTrabajando(false)

    if (fallo) {
      setError(mensajeDeError(fallo))
      return
    }
    // Con la confirmación por correo puesta, Supabase no deja sesión abierta
    // hasta que se pulsa el enlace. Si la dejara, ya estaríamos dentro.
    if (!data.session) {
      // Se vuelve a la pestaña de entrar, que es donde tendrá que venir
      // después de pulsar el enlace del correo. El aviso va DESPUÉS de
      // cambiar de pestaña, porque cambiar de pestaña limpia los avisos.
      cambiarA('entrar')
      setAviso(
        'Cuenta creada. Te hemos mandado un correo para confirmarla: púlsalo y vuelve aquí a entrar.',
      )
    }
  }

  async function pedirClaveNueva() {
    const { error: fallo } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: aDondeVuelve(),
    })
    setTrabajando(false)
    if (fallo) {
      setError(mensajeDeError(fallo))
      return
    }
    // Se dice igual exista o no la cuenta: decir «ese correo no está» le
    // cuenta a cualquiera quién tiene cuenta aquí.
    setAviso('Si ese correo tiene cuenta, te acaba de llegar un mensaje para poner una clave nueva.')
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    setTrabajando(true)

    if (puerta === 'entrar') await entrar()
    else if (puerta === 'crear') await crearCuenta()
    else await pedirClaveNueva()
  }

  return (
    <main className="entrada">
      <div className="entrada__caja">
        <header className="entrada__cabecera">
          <h1 className="entrada__titulo">Mesa Magic</h1>
          <p className="entrada__lema">Magic: The Gathering a distancia, mesa contra mesa.</p>
        </header>

        <div className="entrada__pestanas">
          <button
            type="button"
            className={puerta === 'entrar' ? 'boton boton--principal' : 'boton boton--plano'}
            onClick={() => cambiarA('entrar')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={puerta === 'crear' ? 'boton boton--principal' : 'boton boton--plano'}
            onClick={() => cambiarA('crear')}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={enviar} className="entrada__forma">
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

          {puerta !== 'olvidada' && (
            <label className="campo">
              <span className="campo__nombre">Clave</span>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete={puerta === 'crear' ? 'new-password' : 'current-password'}
                required
                disabled={trabajando}
              />
            </label>
          )}

          {puerta === 'crear' && (
            <>
              <label className="campo">
                <span className="campo__nombre">Repite la clave</span>
                <input
                  type="password"
                  value={repetida}
                  onChange={(e) => setRepetida(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={trabajando}
                />
              </label>
              <label className="campo">
                <span className="campo__nombre">Código de invitación</span>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  disabled={trabajando}
                />
              </label>
            </>
          )}

          {error && <p className="recado recado--mal">{error}</p>}
          {aviso && <p className="recado recado--bien">{aviso}</p>}

          <button type="submit" className="boton boton--principal" disabled={trabajando}>
            {trabajando
              ? 'Un momento…'
              : puerta === 'entrar'
                ? 'Entrar'
                : puerta === 'crear'
                  ? 'Crear la cuenta'
                  : 'Mandarme el correo'}
          </button>

          {puerta === 'entrar' && (
            <button
              type="button"
              className="boton boton--plano"
              onClick={() => cambiarA('olvidada')}
              disabled={trabajando}
            >
              He olvidado la clave
            </button>
          )}

          {puerta === 'olvidada' && (
            <button
              type="button"
              className="boton boton--plano"
              onClick={() => cambiarA('entrar')}
              disabled={trabajando}
            >
              Volver a entrar
            </button>
          )}
        </form>

      </div>
    </main>
  )
}
