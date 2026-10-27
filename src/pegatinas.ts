import { useCallback, useEffect, useRef, useState } from 'react'

// Las pegatinas que se pegan encima del vídeo. Viajan por el canal de datos
// del enlace, igual que los contadores: ni base de datos ni Worker.
//
// REGLA 4, LA QUE NO SE NEGOCIA: la posición va en **coordenadas
// normalizadas**, de 0 a 1 sobre el fotograma, nunca en píxeles. Si fueran
// píxeles, una pegatina puesta en un PC aparecería en otro sitio en el
// móvil, y se movería sola al girar el teléfono o cambiar la ventana.

export type ClasePegatina =
  | 'mas'
  | 'menos'
  | 'ficha'
  | 'tapada'
  | 'volar'
  | 'arrolla'
  | 'mortal'
  | 'vinculo'
  | 'esta'

export interface Pegatina {
  id: string
  /** Id del jugador sobre cuya mesa está pegada. */
  mesa: string
  clase: ClasePegatina
  /** De 0 a 1 sobre el fotograma. Nunca píxeles. */
  x: number
  y: number
  /** Solo lo usan las que cuentan algo. */
  valor: number
}

export const CLASES: {
  clase: ClasePegatina
  /** Lo que pone en el botón de la paleta. */
  nombre: string
  /** Lo que pone encima del vídeo, que tiene que ser corto. */
  corta: string
  cuenta: boolean
}[] = [
  { clase: 'mas', nombre: '+1/+1', corta: '+1/+1', cuenta: true },
  { clase: 'menos', nombre: '−1/−1', corta: '−1/−1', cuenta: true },
  { clase: 'ficha', nombre: 'Ficha', corta: 'Ficha', cuenta: true },
  { clase: 'tapada', nombre: 'Tapada', corta: 'Tapada', cuenta: false },
  { clase: 'volar', nombre: 'Vuela', corta: 'Vuela', cuenta: false },
  { clase: 'arrolla', nombre: 'Arrolla', corta: 'Arrolla', cuenta: false },
  { clase: 'mortal', nombre: 'Toque mortal', corta: 'Mortal', cuenta: false },
  { clase: 'vinculo', nombre: 'Vínculo vital', corta: 'Vínculo', cuenta: false },
  { clase: 'esta', nombre: 'Esta carta', corta: 'Esta', cuenta: false },
]

/** Lo que necesita la capa de pegatinas para pintarlas y dejarlas tocar. */
export interface ManejoPegatinas {
  lista: Pegatina[]
  mover: (id: string, x: number, y: number) => void
  cambiar: (id: string, cuanto: number) => void
  borrar: (id: string) => void
  empezarArrastre: (id: string) => void
  terminarArrastre: () => void
}

interface Tablero {
  lista: Pegatina[]
  secuencia: number
}

type Mensaje =
  | { que: 'pegatinas'; lista: Pegatina[]; secuencia: number }
  | { que: 'hola' }

/** Entre 0 y 1, que es donde vive una pegatina. */
function dentro(valor: number): number {
  return Math.min(1, Math.max(0, valor))
}

interface Opciones {
  datosAbiertos: boolean
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}

export function usePegatinas({ datosAbiertos, enviarDato, alRecibirDato }: Opciones) {
  const [tablero, setTablero] = useState<Tablero>({ lista: [], secuencia: 0 })
  const [peticiones, setPeticiones] = useState(0)
  /** Si está puesto, arrastrar una pegatina las arrastra todas. */
  const [moverTodas, setMoverTodas] = useState(false)

  /** Cuál estás arrastrando ahora mismo, para que no te la mueva el otro. */
  const arrastrando = useRef<string | null>(null)
  const ultimoEnvio = useRef(0)

  // ---- lo que se toca ----

  const pegar = useCallback((clase: ClasePegatina, mesa: string) => {
    setTablero((t) => ({
      // En medio del vídeo, que es donde se ve seguro. De ahí se arrastra.
      lista: [...t.lista, { id: crypto.randomUUID(), mesa, clase, x: 0.5, y: 0.5, valor: 1 }],
      secuencia: t.secuencia + 1,
    }))
  }, [])

  const mover = useCallback(
    (id: string, x: number, y: number) => {
      setTablero((t) => {
        const suya = t.lista.find((p) => p.id === id)
        if (!suya) return t
        const nuevaX = dentro(x)
        const nuevaY = dentro(y)

        // Mover todas de una vez es lo que arregla que alguien dé un golpe a
        // la cámara: se recoloca el grupo entero con un solo arrastre, en
        // vez de ir pegatina por pegatina.
        if (moverTodas) {
          const dx = nuevaX - suya.x
          const dy = nuevaY - suya.y
          return {
            lista: t.lista.map((p) =>
              p.mesa === suya.mesa ? { ...p, x: dentro(p.x + dx), y: dentro(p.y + dy) } : p,
            ),
            secuencia: t.secuencia + 1,
          }
        }

        return {
          lista: t.lista.map((p) => (p.id === id ? { ...p, x: nuevaX, y: nuevaY } : p)),
          secuencia: t.secuencia + 1,
        }
      })
    },
    [moverTodas],
  )

  const cambiar = useCallback((id: string, cuanto: number) => {
    setTablero((t) => ({
      lista: t.lista.map((p) =>
        p.id === id ? { ...p, valor: Math.max(1, p.valor + cuanto) } : p,
      ),
      secuencia: t.secuencia + 1,
    }))
  }, [])

  const borrar = useCallback((id: string) => {
    setTablero((t) => ({
      lista: t.lista.filter((p) => p.id !== id),
      secuencia: t.secuencia + 1,
    }))
  }, [])

  const quitarTodas = useCallback((mesa: string) => {
    setTablero((t) => ({
      lista: t.lista.filter((p) => p.mesa !== mesa),
      secuencia: t.secuencia + 1,
    }))
  }, [])

  const empezarArrastre = useCallback((id: string) => {
    arrastrando.current = id
  }, [])

  const terminarArrastre = useCallback(() => {
    arrastrando.current = null
  }, [])

  // ---- lo que viaja ----

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje
      if (mensaje?.que === 'pegatinas') {
        setTablero((t) => {
          if (mensaje.secuencia <= t.secuencia) return t
          const mia = arrastrando.current
          if (!mia) return { lista: mensaje.lista, secuencia: mensaje.secuencia }
          // Si justo estás arrastrando una, la suya no te la puede mover:
          // sería como si te quitaran el dedo de encima a media frase.
          const puesta = t.lista.find((p) => p.id === mia)
          return {
            lista: mensaje.lista.map((p) =>
              puesta && p.id === mia ? { ...p, x: puesta.x, y: puesta.y } : p,
            ),
            secuencia: mensaje.secuencia,
          }
        })
      } else if (mensaje?.que === 'hola') {
        setPeticiones((p) => p + 1)
      }
    })
  }, [alRecibirDato])

  // Mandar el tablero cuando cambia, cuando se abre el canal y cuando el
  // otro lo pide. Mientras arrastras se manda como mucho cada 60 ms: a
  // sesenta fotogramas por segundo serían sesenta mensajes, y no hace
  // ninguna falta. El `clearTimeout` se queda solo con el último.
  useEffect(() => {
    if (!datosAbiertos) return
    const espera = arrastrando.current
      ? Math.max(0, 60 - (performance.now() - ultimoEnvio.current))
      : 0
    const aviso = setTimeout(() => {
      ultimoEnvio.current = performance.now()
      enviarDato({ que: 'pegatinas', lista: tablero.lista, secuencia: tablero.secuencia })
    }, espera)
    return () => clearTimeout(aviso)
  }, [datosAbiertos, tablero, peticiones, enviarDato])

  useEffect(() => {
    if (datosAbiertos) enviarDato({ que: 'hola' } satisfies Mensaje)
  }, [datosAbiertos, enviarDato])

  const manejo: ManejoPegatinas = {
    lista: tablero.lista,
    mover,
    cambiar,
    borrar,
    empezarArrastre,
    terminarArrastre,
  }

  return { manejo, moverTodas, setMoverTodas, pegar, quitarTodas }
}
