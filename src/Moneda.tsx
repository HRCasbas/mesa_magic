import { useEffect, useRef, useState } from 'react'

/**
 * La moneda de quién empieza.
 *
 * Una moneda con una cara por jugador: no puede empatar y se entiende sin
 * explicarla, que es por lo que sustituyó al dado de seis caras.
 *
 * **El resultado se decide antes de girar.** La animación es solo eso, una
 * animación: así no hay forma de que lo que se ve cambie lo que sale.
 *
 * La tira cualquiera de los dos y vale la primera que llegue. Entre dos
 * amigos no hace falta más; el día que haga falta, el apaño está escrito
 * en las directrices (cada uno manda un número tapado y se destapan a la
 * vez).
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
  const [girando, setGirando] = useState(false)
  const [cara, setCara] = useState(tuNombre)
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (reloj.current) clearInterval(reloj.current)
    }
  }, [])

  function tirar() {
    if (girando) return
    const gana = Math.random() < 0.5 ? tuId : suId
    setGirando(true)
    let vueltas = 0
    reloj.current = setInterval(() => {
      vueltas += 1
      setCara(vueltas % 2 === 0 ? tuNombre : suNombre)
      if (vueltas >= 11) {
        if (reloj.current) clearInterval(reloj.current)
        setCara(gana === tuId ? tuNombre : suNombre)
        setGirando(false)
        elegir(gana)
      }
    }, 90)
  }

  return (
    <div className="moneda">
      <div className={girando ? 'moneda__cara moneda__cara--girando' : 'moneda__cara'}>
        {cara.trim().charAt(0).toUpperCase() || '?'}
      </div>
      <button type="button" className="boton boton--principal" onClick={tirar} disabled={girando}>
        {girando ? '…' : 'Tirar la moneda'}
      </button>
    </div>
  )
}
