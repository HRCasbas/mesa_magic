import { useCallback, useEffect, useRef, useState } from 'react'

import { avatarDe } from './avatar'
import { huellaDe, numeroAlAzar, quienEmpieza } from './sorteo'

/** Vueltas enteras antes de pararse. Suficientes para que se vea girar. */
const VUELTAS = 6

/** Lo que dura el giro. El mismo número en los dos lados. */
const GIRO = 2200

type Mensaje =
  /** «Ya tengo mi número, y esta es su huella». */
  | { que: 'moneda-tapado'; huella: string }
  /** «Aquí va mi número, comprueba que cuadra con la huella». */
  | { que: 'moneda-abierto'; numero: string }

/**
 * La moneda de quién empieza.
 *
 * Una cara por jugador: no puede empatar y se entiende sin explicarla, que
 * es por lo que sustituyó al dado de seis caras.
 *
 * **El giro es una sola transición de CSS** hasta el ángulo final, no un
 * cambio de cara cada pocos milisegundos: lo primero parece una moneda y
 * lo segundo parecía un cartel parpadeando, que fue lo que falló a la
 * primera.
 *
 * **La tiran los dos, aunque solo pulse uno** (Héctor, 30/10/2026: «solo
 * la ve girar el que le da»). Quien pulsa arranca el sorteo tapado de
 * `sorteo.ts`; el otro contesta solo, sin tocar nada, y los dos giran a la
 * vez hacia la misma cara. Ninguno de los dos puede amañarlo.
 *
 * **Apunta el resultado uno solo**, el del identificador menor. Si lo
 * apuntaran los dos serían dos cambios del estado compartido para decir
 * exactamente lo mismo.
 */
export function Moneda({
  tuNombre,
  suNombre,
  tuFoto,
  suFoto,
  tuId,
  suId,
  elegir,
  enviarDato,
  alRecibirDato,
}: {
  tuNombre: string
  suNombre: string
  tuFoto: string | null
  suFoto: string | null
  tuId: string
  suId: string
  elegir: (id: string) => void
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}) {
  const [angulo, setAngulo] = useState(0)
  const [girando, setGirando] = useState(false)
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Lo tuyo: tu número y la huella que ya has mandado. */
  const mio = useRef<{ numero: string; huella: string } | null>(null)
  /** Lo suyo, según va llegando. */
  const suHuella = useRef<string | null>(null)
  const suNumero = useRef<string | null>(null)
  /** Para no girar dos veces ni destapar dos veces. */
  const destapado = useRef(false)
  const enElAire = useRef(false)

  useEffect(() => {
    return () => {
      if (reloj.current) clearTimeout(reloj.current)
    }
  }, [])

  const girar = useCallback(
    (gana: string) => {
      if (enElAire.current) return
      enElAire.current = true
      setGirando(true)
      // La cara de delante es la tuya; la de detrás, la suya. Como cada
      // uno tiene delante la suya, el mismo ganador sale bien en los dos.
      setAngulo(VUELTAS * 360 + (gana === tuId ? 0 : 180))
      reloj.current = setTimeout(() => {
        setGirando(false)
        // Lo apunta el del identificador menor, y solo él.
        if (tuId < suId) elegir(gana)
      }, GIRO)
    },
    [tuId, suId, elegir],
  )

  /** Saca tu número si aún no lo tienes y manda la huella. */
  const comprometerse = useCallback(async () => {
    if (mio.current) return
    const numero = numeroAlAzar()
    const huella = await huellaDe(numero)
    mio.current = { numero, huella }
    enviarDato({ que: 'moneda-tapado', huella } satisfies Mensaje)
  }, [enviarDato])

  /** Manda tu número, pero solo cuando ya tienes la huella del otro. */
  const destapar = useCallback(() => {
    if (destapado.current || !mio.current || !suHuella.current) return
    destapado.current = true
    enviarDato({ que: 'moneda-abierto', numero: mio.current.numero } satisfies Mensaje)
  }, [enviarDato])

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje

      if (mensaje?.que === 'moneda-tapado' && typeof mensaje.huella === 'string') {
        suHuella.current = mensaje.huella
        // Si ha empezado él, hay que ponerse: sacar el tuyo y mandarlo.
        void comprometerse().then(destapar)
        return
      }

      if (mensaje?.que === 'moneda-abierto' && typeof mensaje.numero === 'string') {
        suNumero.current = mensaje.numero
        void rematar()
      }
    })

    /** Comprobar su número y, si todo cuadra, girar. */
    async function rematar() {
      const tuyo = mio.current
      const suyo = suNumero.current
      const huella = suHuella.current
      if (!tuyo || !suyo || !huella) return
      // Si la huella no cuadra, el número no es el que prometió. Se deja
      // la moneda quieta: es preferible repetir la tirada a empezar una
      // partida con una trampa dentro.
      if ((await huellaDe(suyo)) !== huella) return
      girar(quienEmpieza(tuId, suId, tuyo.numero, suyo))
    }
  }, [alRecibirDato, comprometerse, destapar, girar, tuId, suId])

  function tirar() {
    if (enElAire.current) return
    void comprometerse().then(destapar)
  }

  return (
    <div className="moneda">
      <div className="moneda__aire">
        <div
          className="moneda__disco"
          style={{ transform: `rotateY(${angulo}deg)` }}
          aria-hidden="true"
        >
          <img className="moneda__lado" src={avatarDe(tuNombre, tuFoto)} alt="" />
          <img
            className="moneda__lado moneda__lado--dorso"
            src={avatarDe(suNombre, suFoto)}
            alt=""
          />
        </div>
      </div>
      <button type="button" className="boton boton--principal" onClick={tirar} disabled={girando}>
        {girando ? '…' : 'Tirar la moneda'}
      </button>
    </div>
  )
}
