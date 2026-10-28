import { useState } from 'react'

import { CLASES, type ClasePegatina } from './pegatinas'

/** Las pegatinas que se pueden pegar, y sobre qué mesa. */
export function Paleta({
  mesaMia,
  mesaSuya,
  nombreDelOtro,
  moverTodas,
  alternarMoverTodas,
  pegar,
  quitarTodas,
}: {
  mesaMia: string
  mesaSuya: string | null
  nombreDelOtro: string | null
  moverTodas: boolean
  alternarMoverTodas: () => void
  pegar: (clase: ClasePegatina, mesa: string, texto?: string) => void
  quitarTodas: (mesa: string) => void
}) {
  const [enLaSuya, setEnLaSuya] = useState(false)
  const mesa = enLaSuya && mesaSuya ? mesaSuya : mesaMia

  return (
    <div className="paleta">
      {mesaSuya && (
        <div className="paleta__donde">
          <button
            type="button"
            className={enLaSuya ? 'boton boton--plano' : 'boton boton--principal'}
            onClick={() => setEnLaSuya(false)}
          >
            Mi mesa
          </button>
          <button
            type="button"
            className={enLaSuya ? 'boton boton--principal' : 'boton boton--plano'}
            onClick={() => setEnLaSuya(true)}
          >
            {nombreDelOtro ?? 'Su mesa'}
          </button>
        </div>
      )}

      <div className="paleta__clases">
        {CLASES.map(({ clase, nombre, corta, dibujo }) => (
          <button
            key={clase}
            type="button"
            className="paleta__clase"
            title={nombre}
            onClick={() => {
              if (clase !== 'libre') {
                pegar(clase, mesa)
                return
              }
              const escrito = window.prompt('¿Qué quieres que ponga?')?.trim()
              if (escrito) pegar('libre', mesa, escrito.slice(0, 24))
            }}
          >
            {dibujo ? (
              <svg className="paleta__dibujo" viewBox="0 0 24 24" aria-hidden="true">
                <path d={dibujo} />
              </svg>
            ) : (
              <span className="paleta__texto">{corta}</span>
            )}
          </button>
        ))}
      </div>

      <div className="paleta__mas">
        <button
          type="button"
          className={moverTodas ? 'boton boton--principal' : 'boton boton--plano'}
          onClick={alternarMoverTodas}
        >
          {moverTodas ? 'Moviendo todas' : 'Mover todas'}
        </button>
        <button type="button" className="boton boton--plano" onClick={() => quitarTodas(mesa)}>
          Quitar todas
        </button>
      </div>
    </div>
  )
}
