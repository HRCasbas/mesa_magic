import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from './supabase'

export type EstadoMesa = 'fuera' | 'conectando' | 'dentro' | 'caida'

export interface Ocupante {
  id: string
  nombre: string
}

type MensajeSaliente =
  | { tipo: 'estado'; jugadores: Ocupante[]; tuId: string }
  | { tipo: 'senal'; de: string; carga: unknown }
  | { tipo: 'eco'; marca: number }
  | { tipo: 'fuera'; motivo: string }

/** Donde vive el Worker. En local lo sirve `wrangler dev` en el mismo sitio. */
function direccionDeLaMesa(codigo: string): string {
  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocolo}//${window.location.host}/api/mesa/${codigo}`
}

/**
 * La conexión con la mesa.
 *
 * Esto NO lleva el vídeo ni los contadores: solo sirve para que los dos os
 * encontréis. En cuanto estéis encontrados (fase 3), la imagen y el panel
 * viajarán directos de un navegador al otro sin pasar por aquí.
 */
export function useMesa(nombre: string) {
  const [estado, setEstado] = useState<EstadoMesa>('fuera')
  const [codigo, setCodigo] = useState<string | null>(null)
  const [jugadores, setJugadores] = useState<Ocupante[]>([])
  const [tuId, setTuId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [retardo, setRetardo] = useState<number | null>(null)

  const conexion = useRef<WebSocket | null>(null)
  const salidaBuscada = useRef(false)

  // Quien quiere enterarse de las señales que llegan. Es un conjunto en una
  // referencia y no estado: si fuera estado, cada señal repintaría la
  // pantalla entera, y por aquí pasan muchas al montar el vídeo.
  const oyentes = useRef(new Set<(carga: unknown) => void>())

  /** Avisarme cuando llegue una señal del otro. Devuelve cómo darse de baja. */
  const alRecibirSenal = useCallback((oyente: (carga: unknown) => void) => {
    oyentes.current.add(oyente)
    return () => {
      oyentes.current.delete(oyente)
    }
  }, [])

  /** Mandarle una señal al otro. La mesa no la abre: solo la pasa. */
  const enviarSenal = useCallback((carga: unknown) => {
    const ws = conexion.current
    if (ws?.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ tipo: 'senal', carga }))
  }, [])

  const cerrar = useCallback(() => {
    salidaBuscada.current = true
    conexion.current?.close(1000, 'Salida')
    conexion.current = null
    setEstado('fuera')
    setCodigo(null)
    setJugadores([])
    setTuId(null)
    setRetardo(null)
    setMotivo(null)
  }, [])

  const entrar = useCallback(
    async (codigoPedido: string) => {
      const limpio = codigoPedido.trim().toUpperCase()
      if (!/^[A-Z0-9]{4,8}$/.test(limpio)) {
        setMotivo('Ese código no tiene buena pinta. Son cuatro letras o números.')
        setEstado('caida')
        return
      }

      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setMotivo('Tu sesión ha caducado. Vuelve a entrar.')
        setEstado('caida')
        return
      }

      salidaBuscada.current = false
      setMotivo(null)
      setRetardo(null)
      setCodigo(limpio)
      setEstado('conectando')

      const ws = new WebSocket(direccionDeLaMesa(limpio))
      conexion.current = ws

      ws.addEventListener('open', () => {
        // El token va AQUÍ y no en la dirección: una dirección acaba en
        // registros y en el historial del navegador, y una sesión no tiene
        // por qué acabar ahí.
        ws.send(JSON.stringify({ tipo: 'entrar', token, nombre }))
      })

      ws.addEventListener('message', (evento) => {
        let mensaje: MensajeSaliente
        try {
          mensaje = JSON.parse(evento.data as string)
        } catch {
          return
        }

        switch (mensaje.tipo) {
          case 'estado':
            setJugadores(mensaje.jugadores)
            setTuId(mensaje.tuId)
            setEstado('dentro')
            break
          case 'eco':
            setRetardo(Math.round(performance.now() - mensaje.marca))
            break
          case 'senal':
            for (const oyente of oyentes.current) oyente(mensaje.carga)
            break
          case 'fuera':
            setMotivo(mensaje.motivo)
            break
        }
      })

      ws.addEventListener('close', () => {
        conexion.current = null
        if (salidaBuscada.current) return
        setEstado('caida')
        setJugadores([])
      })

      ws.addEventListener('error', () => {
        if (!salidaBuscada.current) setEstado('caida')
      })
    },
    [nombre],
  )

  /** Pide un código nuevo al Worker y entra con él. */
  const crear = useCallback(async () => {
    setMotivo(null)
    setEstado('conectando')
    try {
      const respuesta = await fetch('/api/codigo')
      if (!respuesta.ok) throw new Error('mal')
      const { codigo: nuevo } = (await respuesta.json()) as { codigo: string }
      await entrar(nuevo)
    } catch {
      setMotivo('No se ha podido pedir una mesa. ¿Está el servidor levantado?')
      setEstado('caida')
    }
  }, [entrar])

  /** Mide el ida y vuelta hasta la mesa. No toca nada más. */
  const medirRetardo = useCallback(() => {
    const ws = conexion.current
    if (ws?.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ tipo: 'eco', marca: performance.now() }))
  }, [])

  // Al desmontar, cerrar: si no, queda una conexión colgando.
  useEffect(() => {
    return () => {
      salidaBuscada.current = true
      conexion.current?.close(1000, 'Salida')
    }
  }, [])

  return {
    estado,
    codigo,
    jugadores,
    tuId,
    motivo,
    retardo,
    crear,
    entrar,
    cerrar,
    medirRetardo,
    enviarSenal,
    alRecibirSenal,
  }
}
