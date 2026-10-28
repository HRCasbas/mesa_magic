import { useCallback, useEffect, useState } from 'react'

import type { Carta } from './scryfall'

// Las cartas que has mirado en esta partida.
//
// LO IMPORTANTE, Y NO ES POR SIMPLIFICAR: **esta lista es tuya y no viaja**.
// Si tu rival viera qué cartas consultas, sabría cuáles no conoces y cuáles
// te preocupan, y eso es información de partida. Al canal de datos solo sale
// lo que compartes tú a propósito, una por una.

export interface Consulta {
  /** Id de la consulta, no de la carta: la misma carta se puede mirar dos veces. */
  id: string
  carta: Carta
  /** Falsa cuando te la ha pasado el otro. */
  mia: boolean
  cuando: number
}

type Mensaje = { que: 'consulta'; carta: Carta }

const CUANTAS = 40

function cajon(codigo: string): string {
  return `magic:consultas:${codigo}`
}

function leerGuardadas(codigo: string): Consulta[] {
  try {
    const crudo = localStorage.getItem(cajon(codigo))
    return crudo ? (JSON.parse(crudo) as Consulta[]) : []
  } catch {
    return []
  }
}

interface Opciones {
  codigo: string
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}

export function useConsultas({ codigo, enviarDato, alRecibirDato }: Opciones) {
  const [lista, setLista] = useState<Consulta[]>(() => leerGuardadas(codigo))

  const apuntar = useCallback((carta: Carta, mia: boolean) => {
    setLista((previas) => {
      const nueva: Consulta = { id: crypto.randomUUID(), carta, mia, cuando: Date.now() }
      // La última arriba, y sin repetir la misma carta seguida.
      const sinRepetir = previas.filter((c) => !(c.carta.id === carta.id && c.mia === mia))
      return [nueva, ...sinRepetir].slice(0, CUANTAS)
    })
  }, [])

  const quitar = useCallback((id: string) => {
    setLista((previas) => previas.filter((c) => c.id !== id))
  }, [])

  const limpiar = useCallback(() => setLista([]), [])

  /** Enseñarle una carta al otro. Siempre a mano, nunca solo. */
  const compartir = useCallback(
    (carta: Carta) => enviarDato({ que: 'consulta', carta } satisfies Mensaje),
    [enviarDato],
  )

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje
      if (mensaje?.que === 'consulta' && mensaje.carta) {
        setLista((previas) => {
          const nueva: Consulta = {
            id: crypto.randomUUID(),
            carta: mensaje.carta,
            mia: false,
            cuando: Date.now(),
          }
          return [nueva, ...previas].slice(0, CUANTAS)
        })
      }
    })
  }, [alRecibirDato])

  // Se guardan en el navegador mientras dure la partida. Guardarlas para
  // siempre sería base de datos, y se puede añadir después sin rehacer nada.
  useEffect(() => {
    try {
      localStorage.setItem(cajon(codigo), JSON.stringify(lista))
    } catch {
      // Modo privado, o sin sitio. Las consultas siguen funcionando; lo
      // único que se pierde es recuperarlas tras una recarga.
    }
  }, [codigo, lista])

  return { lista, apuntar, quitar, limpiar, compartir }
}
