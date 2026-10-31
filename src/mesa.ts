import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from './supabase'

export type EstadoMesa = 'fuera' | 'conectando' | 'dentro' | 'caida'

export interface Ocupante {
  id: string
  nombre: string
  /** Su foto de perfil, si tiene. */
  avatar?: string
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
export function useMesa(nombre: string, avatar: string | null) {
  const [estado, setEstado] = useState<EstadoMesa>('fuera')
  const [codigo, setCodigo] = useState<string | null>(null)
  const [jugadores, setJugadores] = useState<Ocupante[]>([])
  const [tuId, setTuId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [retardo, setRetardo] = useState<number | null>(null)
  /** Se ha caído la conexión y se está volviendo a entrar sola. */
  const [volviendo, setVolviendo] = useState(false)

  const conexion = useRef<WebSocket | null>(null)
  const salidaBuscada = useRef(false)
  /** El código con el que volver a entrar si se cae la conexión. */
  const codigoActual = useRef<string | null>(null)
  /** Cuántas veces se ha intentado volver seguidas, para ir esperando más. */
  const intentos = useRef(0)
  const relojDeVuelta = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * Cuando la mesa te ha echado a propósito (llena, sesión caducada), no se
   * vuelve a intentar: sería pedirle lo mismo una y otra vez.
   */
  const echado = useRef(false)
  /** Para que el cierre pueda volver a llamar a `entrar`, que se define después. */
  const volverAEntrar = useRef<((codigo: string) => Promise<void>) | null>(null)

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
    codigoActual.current = null
    if (relojDeVuelta.current) clearTimeout(relojDeVuelta.current)
    setVolviendo(false)
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
      echado.current = false
      codigoActual.current = limpio
      if (relojDeVuelta.current) clearTimeout(relojDeVuelta.current)
      setMotivo(null)
      setRetardo(null)
      setCodigo(limpio)
      setVolviendo(false)
      setEstado('conectando')

      const ws = new WebSocket(direccionDeLaMesa(limpio))
      conexion.current = ws

      ws.addEventListener('open', () => {
        // El token va AQUÍ y no en la dirección: una dirección acaba en
        // registros y en el historial del navegador, y una sesión no tiene
        // por qué acabar ahí.
        ws.send(JSON.stringify({ tipo: 'entrar', token, nombre, avatar: avatar ?? undefined }))
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
            // Has entrado: la cuenta de intentos vuelve a cero, para que la
            // siguiente caída se intente enseguida y no tras quince segundos.
            intentos.current = 0
            setJugadores(mensaje.jugadores)
            setTuId(mensaje.tuId)
            setEstado('dentro')
            break
          case 'eco':
            // Los latidos van con marca negativa y no se enseñan: solo están
            // ahí para que la conexión no se quede muda.
            if (mensaje.marca >= 0) setRetardo(Math.round(performance.now() - mensaje.marca))
            break
          case 'senal':
            for (const oyente of oyentes.current) oyente(mensaje.carga)
            break
          case 'fuera':
            // Te ha echado la mesa, con su motivo. Volver a entrar sería
            // llevarse la misma respuesta.
            echado.current = true
            setVolviendo(false)
            setMotivo(mensaje.motivo)
            break
        }
      })

      ws.addEventListener('close', () => {
        conexion.current = null
        if (salidaBuscada.current) return
        setEstado('caida')
        setJugadores([])

        // SE VUELVE A ENTRAR SOLO (Héctor, 01/11/2026: «de vez en cuando se
        // me sale solo de la mesa»). Una conexión se cae por mil motivos que
        // no son culpa de nadie: el móvil cambia de antena, el wifi
        // parpadea, el router corta lo que lleva un rato callado. Antes eso
        // te devolvía a la pantalla de crear mesa en mitad de la partida, y
        // había que volver a dictar el código.
        if (echado.current || !codigoActual.current) return
        if (intentos.current >= 8) return
        const espera = Math.min(15000, 1000 * 2 ** intentos.current)
        intentos.current += 1
        setVolviendo(true)
        relojDeVuelta.current = setTimeout(() => {
          const cual = codigoActual.current
          if (cual) void volverAEntrar.current?.(cual)
        }, espera)
      })

      ws.addEventListener('error', () => {
        if (!salidaBuscada.current) setEstado('caida')
      })
    },
    [nombre, avatar],
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

  // Para que el cierre de arriba pueda volver a entrar sin pelearse con el
  // orden en que se definen las cosas.
  useEffect(() => {
    volverAEntrar.current = entrar
  }, [entrar])

  /**
   * UN LATIDO CADA POCO, O LA CONEXIÓN SE MUERE SOLA.
   *
   * Esta era la causa de verdad. Mientras no pasa nada por la mesa —y no
   * pasa nada en cuanto los dos estáis conectados, porque el vídeo va
   * directo— un websocket callado lo cierra cualquiera que haya por el
   * camino: el router de casa, la antena del móvil, un intermediario. Es
   * el caso que contaba Héctor de esperar a que el otro meta el código:
   * ahí no viaja ni un mensaje.
   *
   * Veinticinco segundos es de sobra: los cortes por silencio empiezan al
   * minuto. Y no gasta nada, son unas decenas de bytes.
   */
  useEffect(() => {
    const latido = setInterval(() => {
      const ws = conexion.current
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ tipo: 'eco', marca: -1 }))
      }
    }, 25000)
    return () => clearInterval(latido)
  }, [])

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
      if (relojDeVuelta.current) clearTimeout(relojDeVuelta.current)
      conexion.current?.close(1000, 'Salida')
    }
  }, [])

  return {
    estado,
    /** Si se ha caído la conexión pero se está volviendo a entrar sola. */
    volviendo,
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
