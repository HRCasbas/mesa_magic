import { useRef, useState } from 'react'

import { IDIOMAS, guardarIdioma, idiomaElegido } from './ajustes'
import { avatarDe } from './avatar'
import { quitarAvatar, subirAvatar } from './avatares'
import { mensajeDeError } from './supabase'

/**
 * Los ajustes de la cuenta.
 *
 * Lo que se elige **una vez** y no se vuelve a tocar: la foto y el idioma
 * de las cartas. Preguntar el idioma en cada búsqueda era hacerle
 * contestar lo mismo veinte veces por partida.
 */
export function PantallaAjustes({
  cerrar,
  idUsuario,
  nombre,
  avatar,
  avatarCambiado,
}: {
  cerrar: () => void
  idUsuario: string
  nombre: string
  avatar: string | null
  avatarCambiado: () => void
}) {
  const [idioma, setIdioma] = useState(idiomaElegido)
  const [guardado, setGuardado] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fichero = useRef<HTMLInputElement>(null)

  async function elegirFoto(elegido: File | undefined) {
    if (!elegido) return
    setError(null)
    setSubiendo(true)
    try {
      await subirAvatar(idUsuario, elegido)
      avatarCambiado()
    } catch (fallo) {
      setError(mensajeDeError(fallo as { message?: string }))
    }
    setSubiendo(false)
  }

  async function quitarLaFoto() {
    setError(null)
    setSubiendo(true)
    try {
      await quitarAvatar(idUsuario)
      avatarCambiado()
    } catch (fallo) {
      setError(mensajeDeError(fallo as { message?: string }))
    }
    setSubiendo(false)
  }

  function elegir(codigo: string) {
    setIdioma(codigo)
    guardarIdioma(codigo)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <section className="tarjeta">
      <button type="button" className="boton boton--atras" onClick={cerrar}>
        ← Atrás
      </button>
      <h2>Ajustes</h2>

      {/* La foto primero: es lo que se ve en la moneda y en el menú, o
          sea lo único de aquí que mira el otro jugador. */}
      <div className="foto">
        <img className="foto__cara" src={avatarDe(nombre, avatar)} alt="" />
        <div className="foto__botones">
          <input
            ref={fichero}
            type="file"
            accept="image/*"
            className="foto__fichero"
            onChange={(e) => {
              void elegirFoto(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="boton boton--plano"
            disabled={subiendo}
            onClick={() => fichero.current?.click()}
          >
            {subiendo ? 'Subiendo…' : 'Cambiar foto'}
          </button>
          {avatar && (
            <button
              type="button"
              className="boton boton--plano"
              disabled={subiendo}
              onClick={() => void quitarLaFoto()}
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {error && <p className="recado recado--mal">{error}</p>}

      <label className="campo">
        <span className="campo__nombre">Idioma de las cartas</span>
        <select value={idioma} onChange={(e) => elegir(e.target.value)}>
          {IDIOMAS.map((i) => (
            <option key={i.codigo} value={i.codigo}>
              {i.nombre}
            </option>
          ))}
        </select>
      </label>

      {guardado && <p className="recado recado--bien">Guardado.</p>}
    </section>
  )
}
