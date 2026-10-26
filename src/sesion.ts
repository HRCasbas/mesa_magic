import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { supabase } from './supabase'

export interface Jugador {
  id: string
  nombre: string
}

export interface EstadoSesion {
  /** Mientras es true no se sabe todavia si hay sesion: no pintar nada. */
  cargando: boolean
  sesion: Session | null
  /** La ficha del jugador. null si tiene sesion pero aun no ha puesto nombre. */
  jugador: Jugador | null
}

/**
 * Lleva la sesion y la ficha del jugador.
 *
 * El `cargando` importa: al abrir la web, Supabase tarda un instante en
 * recuperar la sesion guardada. Sin ese estado, la pantalla de entrada
 * parpadearia un momento delante de alguien que ya habia entrado.
 */
export function useSesion(): EstadoSesion & { recargarJugador: () => void } {
  const [cargando, setCargando] = useState(true)
  const [sesion, setSesion] = useState<Session | null>(null)
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    let vigente = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vigente) return
      setSesion(data.session)
      setCargando(false)
    })

    const { data: escucha } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva)
      setCargando(false)
    })

    return () => {
      vigente = false
      escucha.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sesion) return

    let vigente = true
    supabase
      .from('jugadores')
      .select('id, nombre')
      .eq('id', sesion.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (vigente) setJugador(data ?? null)
      })

    return () => {
      vigente = false
    }
  }, [sesion, vuelta])

  return {
    cargando,
    sesion,
    // Sin sesion no hay jugador, se calcula aqui en vez de guardarlo: si se
    // borrara el estado dentro del efecto, React daria una vuelta de pintado
    // de mas y, peor, quedaria un instante con sesion fuera y jugador dentro.
    jugador: sesion ? jugador : null,
    recargarJugador: () => setVuelta((v) => v + 1),
  }
}
