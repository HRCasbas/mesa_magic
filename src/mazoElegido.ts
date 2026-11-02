import { useCallback, useEffect, useRef, useState } from 'react'

import type { CartaDelMazo, Mazo } from './mazos'

// El mazo con el que juega cada uno.
//
// VIAJA POR EL CANAL DE DATOS, no se lee de la base (regla 1): así el
// rival ve tu mazo aunque Supabase esté dormida, y los permisos de la base
// se quedan en lo simple, que lo tuyo es tuyo.

export interface MazoEnJuego {
  nombre: string
  formato: string
  portadaNombre: string | null
  cartas: { nombre: string; cantidad: number; zona: string }[]
}

type Mensaje =
  | { que: 'mazo'; mazo: MazoEnJuego }
  | { que: 'mazoVisto' }
  | { que: 'hola' }

/** Cada cuánto se repite el aviso mientras el otro no lo haya acusado. */
const REINTENTO = 3000

export function mazoParaJugar(mazo: Mazo, cartas: CartaDelMazo[]): MazoEnJuego {
  return {
    nombre: mazo.nombre,
    formato: mazo.formato,
    portadaNombre: mazo.portadaNombre,
    cartas: cartas.map((c) => ({ nombre: c.nombre, cantidad: c.cantidad, zona: c.zona })),
  }
}

interface Opciones {
  datosAbiertos: boolean
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}

/**
 * Qué mazo lleva cada uno.
 *
 * **SE REPITE HASTA QUE EL OTRO LO ACUSA** (Héctor, 02/11/2026: «a ambos
 * nos dice que el contrario está eligiendo mazo pero ya hemos elegido los
 * dos, a veces se queda pillado»). Antes se mandaba una sola vez, al
 * elegirlo: si ese mensaje se perdía —y se pierde, porque el canal
 * también lleva fotos de cartas y el enlace se rehace cuando la red
 * parpadea— los dos se quedaban esperando al otro para siempre, sin nada
 * que lo desatascara salvo cambiar de mazo.
 *
 * El acuse es lo que lo arregla de verdad: quien recibe un mazo contesta,
 * y quien lo manda lo repite cada pocos segundos mientras no le
 * contesten. Repetirlo no hace daño, porque recibirlo dos veces deja lo
 * mismo que recibirlo una.
 */
export function useMazoElegido({ datosAbiertos, enviarDato, alRecibirDato }: Opciones) {
  const [mio, setMio] = useState<MazoEnJuego | null>(null)
  const [suyo, setSuyo] = useState<MazoEnJuego | null>(null)
  const [peticiones, setPeticiones] = useState(0)
  /** Si el otro ha dicho que tiene el tuyo. */
  const [acusado, setAcusado] = useState(false)
  /** Lo último que se mandó, para poder repetirlo desde el reloj. */
  const ultimo = useRef<MazoEnJuego | null>(null)

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje
      if (mensaje?.que === 'mazo') {
        setSuyo(mensaje.mazo)
        // Acusar SIEMPRE, también si ya lo tenías: el que lo repite es
        // porque no se ha enterado de que llegó, y hay que callarlo.
        enviarDato({ que: 'mazoVisto' } satisfies Mensaje)
      } else if (mensaje?.que === 'mazoVisto') {
        setAcusado(true)
      } else if (mensaje?.que === 'hola') {
        setPeticiones((p) => p + 1)
      }
    })
  }, [alRecibirDato, enviarDato])

  // Mandarlo: al elegirlo, al abrirse el canal y cuando el otro lo pide.
  useEffect(() => {
    if (!datosAbiertos || !mio) return
    ultimo.current = mio
    enviarDato({ que: 'mazo', mazo: mio } satisfies Mensaje)
  }, [datosAbiertos, mio, peticiones, enviarDato])

  // Y repetirlo mientras no conteste.
  useEffect(() => {
    if (!datosAbiertos || !mio || acusado) return
    const reloj = setInterval(() => {
      if (ultimo.current) enviarDato({ que: 'mazo', mazo: ultimo.current } satisfies Mensaje)
    }, REINTENTO)
    return () => clearInterval(reloj)
  }, [datosAbiertos, mio, acusado, enviarDato])

  const elegir = useCallback((mazo: MazoEnJuego | null) => {
    // Mazo nuevo, acuse nuevo: el de antes era de otro mazo.
    setAcusado(false)
    setMio(mazo)
  }, [])

  return { mio, suyo, elegir }
}
