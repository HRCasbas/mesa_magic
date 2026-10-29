import { useCallback, useEffect, useState } from 'react'

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

type Mensaje = { que: 'mazo'; mazo: MazoEnJuego } | { que: 'hola' }

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

export function useMazoElegido({ datosAbiertos, enviarDato, alRecibirDato }: Opciones) {
  const [mio, setMio] = useState<MazoEnJuego | null>(null)
  const [suyo, setSuyo] = useState<MazoEnJuego | null>(null)
  const [peticiones, setPeticiones] = useState(0)

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje
      if (mensaje?.que === 'mazo') setSuyo(mensaje.mazo)
      else if (mensaje?.que === 'hola') setPeticiones((p) => p + 1)
    })
  }, [alRecibirDato])

  useEffect(() => {
    if (!datosAbiertos || !mio) return
    enviarDato({ que: 'mazo', mazo: mio } satisfies Mensaje)
  }, [datosAbiertos, mio, peticiones, enviarDato])

  return { mio, suyo, elegir: useCallback((mazo: MazoEnJuego | null) => setMio(mazo), []) }
}
