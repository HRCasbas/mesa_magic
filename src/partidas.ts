import { useCallback, useEffect, useState } from 'react'

import type { MazoEnJuego } from './mazoElegido'
import { supabase } from './supabase'

// Terminar una partida y apuntarla.
//
// REGLA 6, LA QUE MANDA AQUÍ: **la aplicación nunca declara un ganador**.
// Uno lo declara y el otro lo acepta. Estar a cero vidas no es perder: hay
// cartas que lo impiden, y Magic tiene demasiadas casuísticas para que un
// programa se ponga a adivinar.
//
// Y la fila la escribe EL QUE ACEPTA, que es quien confirma que es verdad.
// Así hay un solo escritor y no salen dos filas por partida.

export type Motivo = 'vidas' | 'veneno' | 'biblioteca' | 'carta' | 'rendicion' | 'otro'

export const MOTIVOS: { motivo: Motivo; nombre: string }[] = [
  { motivo: 'vidas', nombre: 'Por vidas' },
  { motivo: 'veneno', nombre: 'Por veneno' },
  { motivo: 'biblioteca', nombre: 'Se quedó sin biblioteca' },
  { motivo: 'carta', nombre: 'Por una carta' },
  { motivo: 'rendicion', nombre: 'Se rindió' },
  { motivo: 'otro', nombre: 'Otra cosa' },
]

/** Lo que uno propone: quién ganó y por qué. */
export interface Propuesta {
  gano: string
  motivo: Motivo
}

type Mensaje =
  | { que: 'finPropuesto'; gano: string; motivo: Motivo }
  | { que: 'finRetirado' }
  | { que: 'finAceptado' }

export interface Partida {
  id: string
  jugada: string
  unoNombre: string
  dosNombre: string
  unoMazo: string
  dosMazo: string
  unoPortada: string | null
  dosPortada: string | null
  uno: string
  dos: string
  gano: string
  motivo: Motivo
  turnos: number
}

interface Fila {
  id: string
  jugada: string
  uno: string
  dos: string
  uno_nombre: string
  dos_nombre: string
  uno_mazo: string
  dos_mazo: string
  uno_portada: string | null
  dos_portada: string | null
  gano: string
  motivo: Motivo
  turnos: number
}

function ordenar(f: Fila): Partida {
  return {
    id: f.id,
    jugada: f.jugada,
    uno: f.uno,
    dos: f.dos,
    unoNombre: f.uno_nombre,
    dosNombre: f.dos_nombre,
    unoMazo: f.uno_mazo,
    dosMazo: f.dos_mazo,
    unoPortada: f.uno_portada,
    dosPortada: f.dos_portada,
    gano: f.gano,
    motivo: f.motivo,
    turnos: f.turnos,
  }
}

/** Las partidas que has jugado, la última arriba. */
export function useHistorial() {
  const [lista, setLista] = useState<Partida[] | null>(null)
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    let vigente = true
    void (async () => {
      const { data, error } = await supabase
        .from('partidas')
        .select(
          'id, jugada, uno, dos, uno_nombre, dos_nombre, uno_mazo, dos_mazo, uno_portada, dos_portada, gano, motivo, turnos',
        )
        .order('jugada', { ascending: false })
        .limit(200)
      if (!vigente) return
      setLista(error ? [] : (data as Fila[]).map(ordenar))
    })()
    return () => {
      vigente = false
    }
  }, [vuelta])

  return { lista, recargar: useCallback(() => setVuelta((v) => v + 1), []) }
}

export async function borrarPartida(id: string): Promise<boolean> {
  const { error } = await supabase.from('partidas').delete().eq('id', id)
  return !error
}

interface Opciones {
  tuId: string
  tuNombre: string
  suId: string | null
  suNombre: string
  miMazo: MazoEnJuego | null
  suMazo: MazoEnJuego | null
  turnos: number
  empezo: string
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
  /** Se llama al cerrar la partida, para volver a empezar. */
  alTerminar: () => void
}

export function useFinDePartida({
  tuId,
  tuNombre,
  suId,
  suNombre,
  miMazo,
  suMazo,
  turnos,
  empezo,
  enviarDato,
  alRecibirDato,
  alTerminar,
}: Opciones) {
  /** Lo que has propuesto tú, esperando a que lo acepte. */
  const [propuesto, setPropuesto] = useState<Propuesta | null>(null)
  /** Lo que te ha propuesto él, esperando a que lo aceptes. */
  const [recibido, setRecibido] = useState<Propuesta | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const proponer = useCallback(
    (gano: string, motivo: Motivo) => {
      setPropuesto({ gano, motivo })
      enviarDato({ que: 'finPropuesto', gano, motivo } satisfies Mensaje)
    },
    [enviarDato],
  )

  const retirar = useCallback(() => {
    setPropuesto(null)
    enviarDato({ que: 'finRetirado' } satisfies Mensaje)
  }, [enviarDato])

  /** Aceptas lo que te ha propuesto: se apunta y se cierra la partida. */
  const aceptar = useCallback(async () => {
    if (!recibido || !suId || !miMazo || !suMazo) return
    setGuardando(true)
    setFallo(null)
    const { error } = await supabase.from('partidas').insert({
      uno: tuId,
      dos: suId,
      uno_nombre: tuNombre,
      dos_nombre: suNombre,
      uno_mazo: miMazo.nombre,
      dos_mazo: suMazo.nombre,
      uno_portada: miMazo.portadaNombre,
      dos_portada: suMazo.portadaNombre,
      empezo: empezo || null,
      gano: recibido.gano,
      motivo: recibido.motivo,
      turnos,
    })
    setGuardando(false)
    if (error) {
      setFallo('No se ha podido apuntar la partida.')
      return
    }
    enviarDato({ que: 'finAceptado' } satisfies Mensaje)
    setRecibido(null)
    alTerminar()
  }, [recibido, suId, miMazo, suMazo, tuId, tuNombre, suNombre, empezo, turnos, enviarDato, alTerminar])

  const rechazar = useCallback(() => {
    setRecibido(null)
    enviarDato({ que: 'finRetirado' } satisfies Mensaje)
  }, [enviarDato])

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje
      if (mensaje?.que === 'finPropuesto') {
        setRecibido({ gano: mensaje.gano, motivo: mensaje.motivo })
      } else if (mensaje?.que === 'finRetirado') {
        setRecibido(null)
        setPropuesto(null)
      } else if (mensaje?.que === 'finAceptado') {
        // Lo apuntó él; aquí solo hay que cerrar y volver a empezar.
        setPropuesto(null)
        alTerminar()
      }
    })
  }, [alRecibirDato, alTerminar])

  return { propuesto, recibido, guardando, fallo, proponer, retirar, aceptar, rechazar }
}
