import { useEffect, useRef, useState } from 'react'

import { avatarDe } from './avatar'

/** Vueltas enteras antes de pararse. Suficientes para que se vea girar. */
const VUELTAS = 6

/**
 * La moneda de quién empieza.
 *
 * Una cara por jugador: no puede empatar y se entiende sin explicarla, que
 * es por lo que sustituyó al dado de seis caras.
 *
 * **El resultado se decide antes de girar.** El giro es una sola
 * transición de CSS hasta el ángulo final, no un cambio de cara cada
 * pocos milisegundos: lo primero parece una moneda y lo segundo parecía
 * un cartel parpadeando, que fue lo que falló a la primera.
 *
 * La tira cualquiera de los dos y vale la primera que llegue. Entre dos
 * amigos basta; el apaño de los números tapados está escrito en las
 * directrices por si algún día hace falta.
 */
export function Moneda({
  tuNombre,
  suNombre,
  tuId,
  suId,
  elegir,
}: {
  tuNombre: string
  suNombre: string
  tuId: string
  suId: string
  elegir: (id: string) => void
}) {
  const [angulo, setAngulo] = useState(0)
  const [girando, setGirando] = useState(false)
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (reloj.current) clearTimeout(reloj.current)
    }
  }, [])

  function tirar() {
    if (girando) return
    const gana = Math.random() < 0.5 ? tuId : suId
    setGirando(true)
    // La cara de delante es la tuya; la de detrás, la suya.
    setAngulo(VUELTAS * 360 + (gana === tuId ? 0 : 180))
    reloj.current = setTimeout(() => {
      setGirando(false)
      elegir(gana)
    }, 2200)
  }

  return (
    <div className="moneda">
      <div className="moneda__aire">
        <div
          className="moneda__disco"
          style={{ transform: `rotateY(${angulo}deg)` }}
          aria-hidden="true"
        >
          <img className="moneda__lado" src={avatarDe(tuNombre)} alt="" />
          <img className="moneda__lado moneda__lado--dorso" src={avatarDe(suNombre)} alt="" />
        </div>
      </div>
      <button type="button" className="boton boton--principal" onClick={tirar} disabled={girando}>
        {girando ? '…' : 'Tirar la moneda'}
      </button>
    </div>
  )
}
