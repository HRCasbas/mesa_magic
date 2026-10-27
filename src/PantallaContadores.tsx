import { FASES, useContadores, type Contadores } from './contadores'

/** Los contadores pequeños. Son pocos a propósito: ver `contadores.ts`. */
const MENUDOS: { clave: keyof Contadores; nombre: string }[] = [
  { clave: 'veneno', nombre: 'Veneno' },
  { clave: 'energia', nombre: 'Energía' },
]

function Menudo({
  nombre,
  valor,
  aviso,
  cambiar,
}: {
  nombre: string
  valor: number | null
  /** Para el veneno a diez: se marca, pero no se dice que nadie ha perdido. */
  aviso?: boolean
  cambiar?: (cuanto: number) => void
}) {
  return (
    <div className={aviso ? 'menudo menudo--aviso' : 'menudo'}>
      <span className="menudo__nombre">{nombre}</span>
      <span className="menudo__valor">{valor ?? '—'}</span>
      {cambiar && (
        <span className="menudo__botones">
          <button type="button" className="tecla" onClick={() => cambiar(-1)} aria-label={`${nombre}, uno menos`}>
            −
          </button>
          <button type="button" className="tecla" onClick={() => cambiar(1)} aria-label={`${nombre}, uno más`}>
            +
          </button>
        </span>
      )}
    </div>
  )
}

function Columna({
  titulo,
  valores,
  cambiar,
}: {
  titulo: string
  valores: Contadores | null
  /** Solo la columna tuya lo trae: de los números del otro manda él. */
  cambiar?: (cual: keyof Contadores, cuanto: number) => void
}) {
  return (
    <div className={cambiar ? 'jugador jugador--mio' : 'jugador'}>
      <h3 className="jugador__nombre">{titulo}</h3>

      <div className="vidas">
        {cambiar && (
          <div className="vidas__lado">
            <button type="button" className="tecla tecla--ancha" onClick={() => cambiar('vidas', -5)}>
              −5
            </button>
            <button type="button" className="tecla tecla--ancha" onClick={() => cambiar('vidas', -1)}>
              −1
            </button>
          </div>
        )}
        <strong className="vidas__valor">{valores ? valores.vidas : '—'}</strong>
        {cambiar && (
          <div className="vidas__lado">
            <button type="button" className="tecla tecla--ancha" onClick={() => cambiar('vidas', 1)}>
              +1
            </button>
            <button type="button" className="tecla tecla--ancha" onClick={() => cambiar('vidas', 5)}>
              +5
            </button>
          </div>
        )}
      </div>

      <div className="menudos">
        {MENUDOS.map(({ clave, nombre }) => (
          <Menudo
            key={clave}
            nombre={nombre}
            valor={valores ? valores[clave] : null}
            aviso={clave === 'veneno' && valores?.veneno === 10}
            cambiar={cambiar && ((cuanto: number) => cambiar(clave, cuanto))}
          />
        ))}
      </div>
    </div>
  )
}

export function PantallaContadores({
  codigo,
  nombreDelOtro,
  datosAbiertos,
  enviarDato,
  alRecibirDato,
}: {
  codigo: string
  nombreDelOtro: string | null
  datosAbiertos: boolean
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}) {
  const contadores = useContadores({ codigo, datosAbiertos, enviarDato, alRecibirDato })

  return (
    <section className="tarjeta">
      <h2>Los contadores</h2>

      <div className="turno">
        <p className="turno__donde">
          Turno <strong>{contadores.compartido.turno}</strong>
          <span className="turno__fase">{FASES[contadores.compartido.fase]}</span>
        </p>
        <div className="turno__botones">
          <button type="button" className="boton boton--plano" onClick={contadores.siguienteFase}>
            Siguiente fase
          </button>
          <button type="button" className="boton boton--plano" onClick={contadores.pasarTurno}>
            Pasar turno
          </button>
        </div>
      </div>

      <div className="jugadores">
        <Columna titulo="Tú" valores={contadores.mios} cambiar={contadores.cambiar} />
        <Columna titulo={nombreDelOtro ?? 'Tu rival'} valores={contadores.suyos} />
      </div>

      <p className="aviso">
        <strong>Cada uno lleva sus números.</strong> Los del rival se ven pero no se tocan, igual que
        en una mesa: le dices «te quito tres» y los baja él.
      </p>

      {!contadores.enlazados && (
        <p className="recado recado--mal">
          Todavía no hay camino directo con {nombreDelOtro ?? 'tu rival'}. Tus números funcionan,
          pero no los está viendo.
        </p>
      )}

      <div className="controles">
        <button type="button" className="boton boton--plano" onClick={contadores.reiniciarMios}>
          Reiniciar mis contadores
        </button>
        <button type="button" className="boton boton--plano" onClick={contadores.reiniciarTurno}>
          Volver al turno 1
        </button>
      </div>
    </section>
  )
}
