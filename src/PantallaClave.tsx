import { useState, type FormEvent } from 'react'

import { mensajeDeError, supabase } from './supabase'

const LARGO_MINIMO = 8

/**
 * Poner una clave nueva.
 *
 * Sirve para dos cosas que son la misma por dentro:
 *
 * 1. **Vienes del correo de «he olvidado la clave».** El enlace te mete
 *    dentro, pero entrar no es tener clave: sin esta pantalla te quedarías
 *    como estabas, y el botón de recuperar no serviría de nada.
 * 2. **Te invitaron y nunca pusiste una.** Mismo caso: el enlace de la
 *    invitación identifica, pero no deja clave puesta. Sin esto, el día que
 *    cierres sesión te quedas fuera de tu propia cuenta.
 */
export function PantallaClave({
  recuperando,
  hecho,
  cancelar,
}: {
  /** Vienes del correo: entonces esto es lo único que se ve. */
  recuperando: boolean
  hecho: () => void
  cancelar?: () => void
}) {
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setAviso(null)

    if (clave.length < LARGO_MINIMO) {
      setError(`La clave tiene que tener al menos ${LARGO_MINIMO} letras o números.`)
      return
    }
    if (clave !== repetida) {
      setError('Las dos claves no son iguales.')
      return
    }

    setTrabajando(true)
    const { error: fallo } = await supabase.auth.updateUser({ password: clave })
    setTrabajando(false)

    if (fallo) {
      setError(mensajeDeError(fallo))
      return
    }
    setClave('')
    setRepetida('')
    setAviso('Clave guardada. Con esa entrarás a partir de ahora.')
    hecho()
  }

  const dentro = (
    <>
      <h2>{recuperando ? 'Pon tu clave nueva' : 'Cambiar la clave'}</h2>
      <form onSubmit={guardar} className="entrada__forma">
        <label className="campo">
          <span className="campo__nombre">Clave nueva</span>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="new-password"
            required
            disabled={trabajando}
          />
        </label>

        <label className="campo">
          <span className="campo__nombre">Repítela</span>
          <input
            type="password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            autoComplete="new-password"
            required
            disabled={trabajando}
          />
        </label>

        {error && <p className="recado recado--mal">{error}</p>}
        {aviso && <p className="recado recado--bien">{aviso}</p>}

        <button type="submit" className="boton boton--principal" disabled={trabajando}>
          {trabajando ? 'Guardando…' : 'Guardar la clave'}
        </button>

        {cancelar && (
          <button
            type="button"
            className="boton boton--plano"
            onClick={cancelar}
            disabled={trabajando}
          >
            Dejarlo como está
          </button>
        )}
      </form>
    </>
  )

  // Viniendo del correo, esto es lo único que hay en pantalla: no tiene
  // sentido enseñar la mesa a quien ha venido a cambiar la clave.
  if (recuperando) {
    return (
      <main className="entrada">
        <div className="entrada__caja">{dentro}</div>
      </main>
    )
  }

  return <section className="tarjeta">{dentro}</section>
}
