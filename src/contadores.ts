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

/**
 * Lo que es de los dos: quién empieza y qué turno se juega.
 *
 * LAS FASES SE QUITARON (Héctor, 30/10/2026: «no lo vamos a usar»). En
 * una mesa de verdad las fases se cantan en voz alta y se ven; llevarlas
 * en pantalla era un botón más que tocar en cada turno para no enterarse
 * de nada nuevo.
 *
 * CÓMO SE CUENTAN LOS TURNOS (Héctor, 27/10/2026). En Magic un turno es de
 * UNO, no de los dos: turno 1 de A, turno 1 de B, turno 2 de A… Así que
 * aquí se guarda **un solo número**, `turnoEnJuego`, que cuenta los turnos
 * de los dos seguidos: 1, 2, 3, 4… De ahí sale todo lo demás sin guardar
 * nada más:
 *
 * - de quién es: del que empieza si es impar, del otro si es par;
 * - qué número es para él: `turnoEnJuego` partido por dos, redondeando
 *   hacia arriba;
 * - cuántos turnos lleva la partida: `turnoEnJuego - 1` enteros.
 *
 * Un solo número, y ninguna forma de que las dos cuentas se descuadren.
 *
 * `secuencia` es el número de cambios que lleva. Al recibir uno, se acepta
 * solo si trae más cambios que el que tienes. Sin esto, dos pulsaciones a
 * la vez se devuelven el turno una a otra sin parar.
 */
export interface Compartido {
  /** Id del jugador que empezó. Vacío mientras no se haya decidido. */
  empieza: string
  /** El turno que se está jugando, contando los de los dos: 1, 2, 3… */
  turnoEnJuego: number
  secuencia: number
}

const COMPARTIDO_NUEVO: Compartido = { empieza: '', turnoEnJuego: 1, secuencia: 0 }

/** De quién es el turno que se juega ahora. */
export function deQuienEsElTurno(c: Compartido, tuId: string, suId: string): string {
  const esDelQueEmpieza = (c.turnoEnJuego - 1) % 2 === 0
  if (esDelQueEmpieza) return c.empieza
  // El otro es el que no empezó, mirado desde cualquiera de los dos lados.
  return c.empieza === tuId ? suId : tuId
}

/** Qué número de turno es para quien lo juega. */
export function numeroDeTurno(c: Compartido): number {
  return Math.ceil(c.turnoEnJuego / 2)
}

/** Turnos enteros ya jugados. Es lo que irá al historial en la fase 8. */
export function turnosJugados(c: Compartido): number {
  return Math.max(0, c.turnoEnJuego - 1)
}

type Mensaje =
  | { que: 'contadores'; valores: Contadores }
  | { que: 'compartido'; empieza: string; turnoEnJuego: number; secuencia: number }
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
  tuId: string
  /** Null mientras estés solo en la mesa. */
  suId: string | null
  datosAbiertos: boolean
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}

export function useContadores({
  codigo,
  tuId,
  suId,
  datosAbiertos,
  enviarDato,
  alRecibirDato,
}: Opciones) {
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

  /**
   * El turno solo lo mueve quien lo está jugando (Héctor, 27/10/2026).
   *
   * Se comprueba aquí dentro y no solo apagando el botón: así vale igual
   * para la barra espaciadora, y se mira contra el estado del momento, no
   * contra el que hubiera cuando se pintó la pantalla.
   */
  function esSuyoElTurno(c: Compartido): boolean {
    if (!c.empieza || !suId) return false
    return deQuienEsElTurno(c, tuId, suId) === tuId
  }

  const pasarTurno = useCallback(() => {
    setCompartido((c) =>
      esSuyoElTurno(c)
        ? { ...c, turnoEnJuego: c.turnoEnJuego + 1, secuencia: c.secuencia + 1 }
        : c,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuId, suId])

  /** Para el espacio pulsado sin querer, que es fácil. */
  const turnoAtras = useCallback(() => {
    setCompartido((c) => ({
      ...c,
      turnoEnJuego: Math.max(1, c.turnoEnJuego - 1),

      secuencia: c.secuencia + 1,
    }))
  }, [])

  const elegirQuienEmpieza = useCallback((id: string) => {
    setCompartido((c) => ({ empieza: id, turnoEnJuego: 1, secuencia: c.secuencia + 1 }))
  }, [])

  const partidaNueva = useCallback(() => {
    setCompartido((c) => ({ ...COMPARTIDO_NUEVO, secuencia: c.secuencia + 1 }))
  }, [])

  // El espacio pasa turno. Es la tecla que más se usa en una partida, y
  // así no hay que soltar las cartas para buscar el botón con el ratón.
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.code !== 'Space' || evento.repeat) return
      // Dentro de un campo de texto el espacio es un espacio, y punto.
      const donde = document.activeElement
      if (donde instanceof HTMLInputElement || donde instanceof HTMLTextAreaElement) return
      // En cambio sobre un botón sí se le quita: un botón se pulsa con el
      // espacio al soltarlo, y cortarlo aquí evita que «Turno atrás», que
      // se queda con el foco después de pulsarlo, siga mandando. El espacio
      // significa pasar turno SIEMPRE, mire donde mire el foco.
      evento.preventDefault()
      pasarTurno()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [pasarTurno])

  // ---- lo que viaja ----

  useEffect(() => {
    return alRecibirDato((dato) => {
      const mensaje = dato as Mensaje
      if (mensaje?.que === 'contadores') {
        setSuyos(mensaje.valores)
      } else if (mensaje?.que === 'compartido') {
        setCompartido((c) =>
          mensaje.secuencia > c.secuencia
            ? {
                empieza: mensaje.empieza,
                turnoEnJuego: mensaje.turnoEnJuego,

                secuencia: mensaje.secuencia,
              }
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

  const deQuienEs = suId && compartido.empieza ? deQuienEsElTurno(compartido, tuId, suId) : ''

  return {
    mios,
    suyos,
    compartido,
    /** Id de quien juega ahora. Vacío si aún no se sabe quién empieza. */
    deQuienEs,
    esMiTurno: deQuienEs !== '' && deQuienEs === tuId,
    enlazados: datosAbiertos,
    cambiar,
    reiniciarMios,

    pasarTurno,
    turnoAtras,
    elegirQuienEmpieza,
    partidaNueva,
  }
}
