import { useCallback, useEffect, useState } from 'react'

// Los contadores de la partida, de un navegador al otro por el canal de
// datos del enlace. NO pasan por la base de datos ni por el Worker: si
// Supabase está dormida, los números siguen funcionando igual.
//
// LA DECISIÓN QUE ORDENA TODO ESTO: cada uno lleva SUS PROPIOS números y
// ve los del otro sin poder tocarlos. Así se juega en una mesa de verdad
// («te quito tres» y lo baja él), y además quita de un plumazo el problema
// de los dos tocando el mismo número a la vez: no hay nada que resolver,
// porque de cada número manda uno solo.

// QUÉ NO LLEVA ESTO, Y POR QUÉ (Héctor, 27/10/2026): no hay contador de
// cartas en la mano ni en el cementerio. Habría que sumar y restar en cada
// robo y en cada carta que se juega, o sea en cada acción de la partida, y
// eso no lo lleva nadie al día: «sería una tortura jugar». Lo que se cuenta
// solo mirando la mesa por la cámara no hace falta apuntarlo.
//
// Tampoco hay contador de experiencia, que es cosa de Commander, y aquí se
// juega de dos.

export interface Contadores {
  vidas: number
  veneno: number
  energia: number
}

export const CONTADORES_NUEVOS: Contadores = {
  vidas: 20,
  veneno: 0,
  energia: 0,
}

/** Las fases del turno, en el orden en que van. */
export const FASES = ['Inicio', 'Principal 1', 'Combate', 'Principal 2', 'Final'] as const

/**
 * Lo que es de los dos: el turno y la fase.
 *
 * `secuencia` es el número de cambios que lleva. Al recibir uno, se acepta
 * solo si trae más cambios que el que tienes. Sin esto, dos pulsaciones a
 * la vez se devuelven el turno una a otra sin parar.
 */
export interface Compartido {
  turno: number
  fase: number
  secuencia: number
}

const COMPARTIDO_NUEVO: Compartido = { turno: 1, fase: 0, secuencia: 0 }

type Mensaje =
  | { que: 'contadores'; valores: Contadores }
  | { que: 'compartido'; turno: number; fase: number; secuencia: number }
  /** «Acabo de llegar, cuéntame cómo va». */
  | { que: 'hola' }

/** Dónde se guardan tus números por si recargas sin querer en plena partida. */
function cajon(codigo: string): string {
  return `magic:contadores:${codigo}`
}

function leerGuardados(codigo: string): Contadores {
  try {
    const crudo = localStorage.getItem(cajon(codigo))
    if (!crudo) return CONTADORES_NUEVOS
    // Se mezcla con los nuevos para que un contador añadido más adelante no
    // llegue como `undefined` desde una partida vieja.
    return { ...CONTADORES_NUEVOS, ...(JSON.parse(crudo) as Partial<Contadores>) }
  } catch {
    return CONTADORES_NUEVOS
  }
}

interface Opciones {
  /** El código de la mesa. Sirve para guardar tus números por separado. */
  codigo: string
  datosAbiertos: boolean
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}

export function useContadores({ codigo, datosAbiertos, enviarDato, alRecibirDato }: Opciones) {
  const [mios, setMios] = useState<Contadores>(() => leerGuardados(codigo))
  const [suyos, setSuyos] = useState<Contadores | null>(null)
  const [compartido, setCompartido] = useState<Compartido>(COMPARTIDO_NUEVO)
  /** Sube cuando el otro pide el estado, para volver a mandárselo. */
  const [peticiones, setPeticiones] = useState(0)

  // ---- lo que se toca ----

  const cambiar = useCallback((cual: keyof Contadores, cuanto: number) => {
    setMios((previos) => {
      const crudo = previos[cual] + cuanto
      // Las vidas pueden bajar de cero: hay cartas que lo aprovechan, y
      // además estar a cero no es perder. Los demás no tienen sentido en
      // negativo, y el veneno se para en diez, que es el tope del juego.
      const valor =
        cual === 'vidas' ? crudo : cual === 'veneno' ? Math.min(10, Math.max(0, crudo)) : Math.max(0, crudo)
      return { ...previos, [cual]: valor }
    })
  }, [])

  const reiniciarMios = useCallback(() => setMios(CONTADORES_NUEVOS), [])

  const siguienteFase = useCallback(() => {
    setCompartido((c) => {
      const siguiente = c.fase + 1
      return siguiente < FASES.length
        ? { ...c, fase: siguiente, secuencia: c.secuencia + 1 }
        : { turno: c.turno + 1, fase: 0, secuencia: c.secuencia + 1 }
    })
  }, [])

  const pasarTurno = useCallback(() => {
    setCompartido((c) => ({ turno: c.turno + 1, fase: 0, secuencia: c.secuencia + 1 }))
  }, [])

  const reiniciarTurno = useCallback(() => {
    setCompartido((c) => ({ ...COMPARTIDO_NUEVO, secuencia: c.secuencia + 1 }))
  }, [])

  // ---- lo que viaja ----

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje
      if (mensaje?.que === 'contadores') {
        setSuyos(mensaje.valores)
      } else if (mensaje?.que === 'compartido') {
        setCompartido((c) =>
          mensaje.secuencia > c.secuencia
            ? { turno: mensaje.turno, fase: mensaje.fase, secuencia: mensaje.secuencia }
            : c,
        )
      } else if (mensaje?.que === 'hola') {
        setPeticiones((p) => p + 1)
      }
    })
  }, [alRecibirDato])

  // Mandar lo tuyo cada vez que cambia, cuando se abre el canal, y cuando
  // el otro lo pide. Son los tres momentos en los que puede hacer falta.
  useEffect(() => {
    if (!datosAbiertos) return
    enviarDato({ que: 'contadores', valores: mios } satisfies Mensaje)
    enviarDato({ que: 'compartido', ...compartido } satisfies Mensaje)
  }, [datosAbiertos, mios, compartido, peticiones, enviarDato])

  // Al abrir el canal, pedirle al otro lo suyo: puede llevar media partida.
  useEffect(() => {
    if (datosAbiertos) enviarDato({ que: 'hola' } satisfies Mensaje)
  }, [datosAbiertos, enviarDato])

  // Guardar los tuyos, por si recargas sin querer en mitad de una partida.
  useEffect(() => {
    try {
      localStorage.setItem(cajon(codigo), JSON.stringify(mios))
    } catch {
      // Un navegador en modo privado puede no dejar guardar. No es grave:
      // solo significa que una recarga te pondría las vidas a veinte.
    }
  }, [codigo, mios])

  return {
    mios,
    suyos,
    compartido,
    enlazados: datosAbiertos,
    cambiar,
    reiniciarMios,
    siguienteFase,
    pasarTurno,
    reiniciarTurno,
  }
}
