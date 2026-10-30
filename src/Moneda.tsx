import { useCallback, useEffect, useRef, useState } from 'react'

import { avatarDe } from './avatar'

/** Vueltas enteras antes de pararse. Suficientes para que se vea girar. */
const VUELTAS = 6

/** Lo que dura el giro. El mismo número en los dos lados. */
const GIRO = 2200

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
 * **La tirada viaja, no solo el resultado** (Héctor, 30/10/2026: «solo la
 * ve girar el que le da»). Quien pulsa manda el ganador por el canal de
 * datos y los dos giran a la vez; una moneda que solo ve uno no sirve de
 * nada, porque lo que convence al otro es verla caer.
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
  enviarDato,
  alRecibirDato,
}: {
  tuNombre: string
  suNombre: string
  tuId: string
  suId: string
  elegir: (id: string) => void
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}) {
  const [angulo, setAngulo] = useState(0)
  const [girando, setGirando] = useState(false)
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Para no arrancar dos giros si llegan dos avisos pegados. */
  const enElAire = useRef(false)

  useEffect(() => {
    return () => {
      if (reloj.current) clearTimeout(reloj.current)
    }
  }, [])

  /**
   * Girar hasta la cara del ganador.
   *
   * `mando` dice si la tirada es tuya. **Solo quien tira apunta el
   * resultado**: si lo apuntaran los dos, serían dos cambios del estado
   * compartido para decir lo mismo.
   */
  const girar = useCallback(
    (gana: string, mando: boolean) => {
      if (enElAire.current) return
      enElAire.current = true
      setGirando(true)
      // La cara de delante es la tuya; la de detrás, la suya. Como cada
      // uno tiene delante la suya, el mismo ganador sale bien en los dos.
      setAngulo(VUELTAS * 360 + (gana === tuId ? 0 : 180))
      reloj.current = setTimeout(() => {
        enElAire.current = false
        setGirando(false)
        if (mando) elegir(gana)
      }, GIRO)
    },
    [tuId, elegir],
  )

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as { que?: string; gana?: string }
      if (mensaje?.que === 'moneda' && typeof mensaje.gana === 'string') {
        girar(mensaje.gana, false)
      }
    })
  }, [alRecibirDato, girar])

  function tirar() {
    if (enElAire.current) return
    const gana = Math.random() < 0.5 ? tuId : suId
    enviarDato({ que: 'moneda', gana })
    girar(gana, true)
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
