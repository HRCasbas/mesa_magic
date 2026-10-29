import { useCallback, useEffect, useState } from 'react'

import { supabase } from './supabase'

// Los mazos, que SÍ viven en la base de datos: son lo único, junto con el
// historial, que tiene que sobrevivir a la partida.

/** Dónde está una carta dentro del mazo. Las tres son cosas distintas. */
export type Zona = 'principal' | 'banquillo' | 'posibles'

export const ZONAS: { zona: Zona; nombre: string; explicacion: string }[] = [
  { zona: 'principal', nombre: 'El mazo', explicacion: 'Con lo que juegas' },
  { zona: 'banquillo', nombre: 'Banquillo', explicacion: 'Lo que cambias entre partidas' },
  { zona: 'posibles', nombre: 'Posibles', explicacion: 'Lo que te planteas meter' },
]

export interface CartaDelMazo {
  id: string
  nombre: string
  cantidad: number
  zona: Zona
  orden: number
}

export interface Mazo {
  id: string
  nombre: string
  formato: string
  notas: string
  portadaId: string | null
  portadaNombre: string | null
  activo: boolean
}

interface MazoCrudo {
  id: string
  nombre: string
  formato: string
  notas: string
  portada_id: string | null
  portada_nombre: string | null
  activo: boolean
}

function ordenarMazo(crudo: MazoCrudo): Mazo {
  return {
    id: crudo.id,
    nombre: crudo.nombre,
    formato: crudo.formato,
    notas: crudo.notas,
    portadaId: crudo.portada_id,
    portadaNombre: crudo.portada_nombre,
    activo: crudo.activo,
  }
}

/** Tus mazos. Los de nadie más: de eso se encarga RLS en la base. */
export function useMazos() {
  const [lista, setLista] = useState<Mazo[] | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    let vigente = true
    void (async () => {
      const { data, error } = await supabase
        .from('mazos')
        .select('id, nombre, formato, notas, portada_id, portada_nombre, activo')
        .order('tocado', { ascending: false })
      if (!vigente) return
      if (error) {
        setFallo('No se han podido traer tus mazos.')
        setLista([])
        return
      }
      setFallo(null)
      setLista((data as MazoCrudo[]).map(ordenarMazo))
    })()
    return () => {
      vigente = false
    }
  }, [vuelta])

  return { lista, fallo, recargar: useCallback(() => setVuelta((v) => v + 1), []) }
}

/** Las cartas de un mazo, en orden. */
export function useCartasDelMazo(mazoId: string | null) {
  const [cartas, setCartas] = useState<CartaDelMazo[] | null>(null)

  useEffect(() => {
    if (!mazoId) return
    let vigente = true
    void (async () => {
      const { data, error } = await supabase
        .from('cartas_del_mazo')
        .select('id, nombre, cantidad, zona, orden')
        .eq('mazo', mazoId)
        .order('orden')
      if (!vigente) return
      setCartas(error ? [] : (data as CartaDelMazo[]))
    })()
    return () => {
      vigente = false
    }
  }, [mazoId])

  // Sin mazo abierto no hay cartas, y se calcula aquí en vez de borrar el
  // estado dentro del efecto: así no queda un instante con el mazo cerrado
  // y las cartas del anterior todavía puestas.
  return mazoId ? cartas : null
}
