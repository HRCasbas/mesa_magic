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
  pegar: (clase: ClasePegatina, mesa: string) => void
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
        {CLASES.map(({ clase, nombre }) => (
          <button
            key={clase}
            type="button"
            className="boton boton--plano paleta__clase"
            onClick={() => pegar(clase, mesa)}
          >
            {nombre}
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
          Quitar las de esa mesa
        </button>
      </div>

      <p className="aviso aviso--suelto">
        Sale en medio de la imagen y se arrastra hasta la carta. Si alguien mueve la cámara,{' '}
        <strong>Mover todas</strong> recoloca el grupo entero de un arrastre.
      </p>
    </div>
  )
}
