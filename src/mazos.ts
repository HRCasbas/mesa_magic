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
export function useCartasDelMazo(mazoId: string | null, vuelta = 0) {
  // SE GUARDA DE QUÉ MAZO SON, no solo las cartas (Héctor, 30/10/2026:
  // «no coincide el nombre del mazo con el contenido»). Al abrir otro
  // mazo, el nombre cambia al momento y las cartas tardan su viaje a la
  // base: sin este dato, lo que se devolvía mientras tanto eran las del
  // mazo anterior, y quien lo miraba veía un mazo que no existe.
  const [traidas, setTraidas] = useState<{ de: string; cartas: CartaDelMazo[] } | null>(null)

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
      setTraidas({ de: mazoId, cartas: error ? [] : (data as CartaDelMazo[]) })
    })()
    return () => {
      vigente = false
    }
  }, [mazoId, vuelta])

  // Sin mazo abierto no hay cartas, y mientras llegan las del mazo que se
  // acaba de abrir tampoco: null quiere decir «todavía no se sabe», nunca
  // «las de antes».
  return mazoId && traidas?.de === mazoId ? traidas.cartas : null
}

// ---- guardar ----

/** Crea un mazo vacío y devuelve su identificador. */
export async function crearMazo(
  jugador: string,
  nombre: string,
  formato: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('mazos')
    .insert({ jugador, nombre: nombre.trim(), formato: formato.trim() || 'Casual' })
    .select('id')
    .single()
  return error ? null : (data as { id: string }).id
}

export async function guardarMazo(mazo: Mazo): Promise<boolean> {
  const { error } = await supabase
    .from('mazos')
    .update({
      nombre: mazo.nombre.trim(),
      formato: mazo.formato.trim() || 'Casual',
      notas: mazo.notas,
      portada_id: mazo.portadaId,
      portada_nombre: mazo.portadaNombre,
      activo: mazo.activo,
      tocado: new Date().toISOString(),
    })
    .eq('id', mazo.id)
  return !error
}

export async function borrarMazo(mazoId: string): Promise<boolean> {
  const { error } = await supabase.from('mazos').delete().eq('id', mazoId)
  return !error
}

/**
 * Cambia de golpe todas las cartas de un mazo.
 *
 * Se borra todo y se mete lo nuevo, en vez de ir carta por carta viendo
 * qué cambió. Es un mazo de sesenta cartas que se importa entero: la
 * comparación costaría más código y más fallos que volver a escribirlo.
 */
export async function guardarCartas(
  mazoId: string,
  cartas: { nombre: string; cantidad: number; zona: Zona; orden: number }[],
): Promise<boolean> {
  const { error: borrando } = await supabase.from('cartas_del_mazo').delete().eq('mazo', mazoId)
  if (borrando) return false
  if (cartas.length === 0) return true
  const { error } = await supabase
    .from('cartas_del_mazo')
    .insert(cartas.map((c) => ({ mazo: mazoId, ...c })))
  return !error
}
