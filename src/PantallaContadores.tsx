import {
  FASES,
  numeroDeTurno,
  turnosJugados,
  useContadores,
  type Contadores,
} from './contadores'

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
  tuId,
  suId,
  tuNombre,
  nombreDelOtro,
  datosAbiertos,
  enviarDato,
  alRecibirDato,
}: {
  codigo: string
  tuId: string
  /** Null mientras estés solo en la mesa. */
  suId: string | null
  tuNombre: string
  nombreDelOtro: string | null
  datosAbiertos: boolean
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}) {
  const contadores = useContadores({ codigo, tuId, suId, datosAbiertos, enviarDato, alRecibirDato })
  const { compartido, esMiTurno } = contadores

  // Siempre por su nombre, también el tuyo. «Turno 17 de ti» obliga a parar
  // a pensar de quién habla; «Turno 17 de Héctor» no (Héctor, 27/10/2026).
  const nombreDeQuienJuega = contadores.deQuienEs === tuId ? tuNombre : (nombreDelOtro ?? 'tu rival')

  return (
    <section className="tarjeta">
      <h2>Los contadores</h2>

      {!compartido.empieza ? (
        <div className="turno">
          <p className="turno__donde">
            {suId ? '¿Quién empieza?' : 'Cuando llegue tu rival se elige quién empieza.'}
          </p>
          {suId && (
            <div className="turno__botones">
              <button
                type="button"
                className="boton boton--plano"
                onClick={() => contadores.elegirQuienEmpieza(tuId)}
              >
                Empiezo yo
              </button>
              <button
                type="button"
                className="boton boton--plano"
                onClick={() => contadores.elegirQuienEmpieza(suId)}
              >
                Empieza {nombreDelOtro ?? 'tu rival'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="turno">
          <p className="turno__donde">
            Turno <strong>{numeroDeTurno(compartido)}</strong> de{' '}
            <strong>{nombreDeQuienJuega}</strong>
            <span className="turno__fase">{FASES[compartido.fase]}</span>
          </p>
          <div className="turno__botones">
            <button
              type="button"
              className="boton boton--plano"
              onClick={contadores.siguienteFase}
              disabled={!esMiTurno}
            >
              Siguiente fase
            </button>
            <button
              type="button"
              className="boton boton--principal"
              onClick={contadores.pasarTurno}
              disabled={!esMiTurno}
            >
              Pasar turno
            </button>
            {/* «Turno atrás» lo tienen los dos a propósito: si pasas turno
                sin querer, deja de ser tuyo, y sin esto no podrías
                deshacerlo tú mismo. */}
            <button type="button" className="boton boton--plano" onClick={contadores.turnoAtras}>
              Turno atrás
            </button>
          </div>
        </div>
      )}

      {compartido.empieza && (
        <p className="aviso aviso--suelto">
          {esMiTurno ? (
            <>
              Te toca. La <strong>barra espaciadora</strong> pasa turno.
            </>
          ) : (
            <>
              Le toca a <strong>{nombreDeQuienJuega}</strong>. El turno lo pasa quien lo juega.
            </>
          )}{' '}
          Van <strong>{turnosJugados(compartido)}</strong>{' '}
          {turnosJugados(compartido) === 1 ? 'turno jugado' : 'turnos jugados'}.
        </p>
      )}

      <div className="jugadores">
        <Columna titulo="Tú" valores={contadores.mios} cambiar={contadores.cambiar} />
        <Columna titulo={nombreDelOtro ?? 'Tu rival'} valores={contadores.suyos} />
      </div>

      <p className="aviso">
        <strong>Cada uno lleva sus números.</strong> Los del rival se ven pero no se tocan, igual que
        en una mesa: le dices «te quito tres» y los baja él.
      </p>

      {suId &&
        (contadores.enlazados ? (
          <p className="recado recado--bien">
            Conectado con {nombreDelOtro ?? 'tu rival'}: lo que toques lo ve al momento.
          </p>
        ) : (
          <p className="recado recado--mal">
            Todavía no hay camino directo con {nombreDelOtro ?? 'tu rival'}. Tus números funcionan,
            pero no los está viendo.
          </p>
        ))}

      <div className="controles">
        <button type="button" className="boton boton--plano" onClick={contadores.reiniciarMios}>
          Reiniciar mis contadores
        </button>
        <button type="button" className="boton boton--plano" onClick={contadores.partidaNueva}>
          Partida nueva
        </button>
      </div>
    </section>
  )
}
