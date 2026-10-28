import { useState } from 'react'

import { IDIOMAS, guardarIdioma, idiomaElegido } from './ajustes'

/**
 * Los ajustes de la cuenta.
 *
 * De momento solo el idioma, y está aquí a propósito: **se elige una vez**.
 * Preguntarlo en cada búsqueda era hacerle contestar lo mismo veinte veces
 * por partida.
 */
export function PantallaAjustes({ cerrar }: { cerrar: () => void }) {
  const [idioma, setIdioma] = useState(idiomaElegido)
  const [guardado, setGuardado] = useState(false)

  function elegir(codigo: string) {
    setIdioma(codigo)
    guardarIdioma(codigo)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <section className="tarjeta">
      <h2>Ajustes</h2>

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

      <p className="aviso aviso--suelto">
        Las cartas se buscan y se enseñan en ese idioma. Si una carta nunca se imprimió así, se
        enseña la que haya.
      </p>

      {guardado && <p className="recado recado--bien">Guardado.</p>}

      <button type="button" className="boton boton--plano" onClick={cerrar}>
        Cerrar
      </button>
    </section>
  )
}
