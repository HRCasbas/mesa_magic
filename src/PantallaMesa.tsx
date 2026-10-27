import { useState, type FormEvent } from 'react'

import { PantallaContadores } from './PantallaContadores'
import { PantallaVideo } from './PantallaVideo'
import { useEnlace } from './enlace'
import { useMesa } from './mesa'

/**
 * La mesa y, cuando estáis los dos, el vídeo.
 *
 * El orden importa: la mesa solo sirve para encontraros y para pasaros las
 * primeras cartas de presentación. En cuanto los dos navegadores se
 * encuentran, la imagen va DIRECTA de uno a otro y la mesa se queda al
 * margen.
 */
export function PantallaMesa({ nombre }: { nombre: string }) {
  const mesa = useMesa(nombre)
  const [escrito, setEscrito] = useState('')
  const [copiado, setCopiado] = useState(false)

  const elOtro = mesa.jugadores.find((j) => j.id !== mesa.tuId) ?? null
  const estamosLosDos = mesa.estado === 'dentro' && elOtro !== null

  // Si los dos hacen una oferta a la vez, uno tiene que ceder. Se decide
  // comparando los identificadores: los dos navegadores llegan a la misma
  // conclusión sin tener que hablarlo.
  const soyEducado = !!mesa.tuId && !!elOtro && mesa.tuId < elOtro.id

  const enlace = useEnlace({
    activo: estamosLosDos,
    soyEducado,
    enviarSenal: mesa.enviarSenal,
    alRecibirSenal: mesa.alRecibirSenal,
  })

  async function unirse(evento: FormEvent) {
    evento.preventDefault()
    await mesa.entrar(escrito)
  }

  async function copiarCodigo() {
    if (!mesa.codigo) return
    try {
      await navigator.clipboard.writeText(mesa.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Algunos navegadores no dejan copiar sin un gesto claro. No pasa
      // nada: el código está en pantalla, se puede dictar.
    }
  }

  if (mesa.estado === 'fuera' || mesa.estado === 'caida') {
    return (
      <section className="tarjeta">
        <h2>La mesa</h2>
        <p>Uno de los dos crea la mesa y le dicta el código al otro. Da igual quién.</p>

        {mesa.motivo && <p className="recado recado--mal">{mesa.motivo}</p>}

        <div className="mesa__opciones">
          <button type="button" className="boton boton--principal" onClick={mesa.crear}>
            Crear una mesa
          </button>

          <form onSubmit={unirse} className="mesa__unirse">
            <label className="campo">
              <span className="campo__nombre">…o entrar con un código</span>
              <input
                type="text"
                value={escrito}
                onChange={(e) => setEscrito(e.target.value.toUpperCase())}
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="ABCD"
                className="campo__codigo"
              />
            </label>
            <button type="submit" className="boton boton--plano" disabled={escrito.length < 4}>
              Entrar
            </button>
          </form>
        </div>
      </section>
    )
  }

  if (mesa.estado === 'conectando') {
    return (
      <section className="tarjeta">
        <h2>La mesa</h2>
        <p className="cargando">Buscando la mesa…</p>
      </section>
    )
  }

  return (
    <>
      <section className="tarjeta">
        <h2>La mesa</h2>

        <div className="mesa__codigo">
          <span className="mesa__codigo__etiqueta">Código</span>
          <strong className="mesa__codigo__valor">{mesa.codigo}</strong>
          <button type="button" className="boton boton--plano" onClick={copiarCodigo}>
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <ul className="mesa__jugadores">
          {mesa.jugadores.map((j) => (
            <li key={j.id} className="mesa__jugador">
              <span className="mesa__jugador__punto" aria-hidden="true" />
              {j.nombre}
              {j.id === mesa.tuId && <span className="mesa__jugador__tu">tú</span>}
            </li>
          ))}
          {!elOtro && (
            <li className="mesa__jugador mesa__jugador--hueco">
              <span
                className="mesa__jugador__punto mesa__jugador__punto--vacio"
                aria-hidden="true"
              />
              Esperando a tu rival…
            </li>
          )}
        </ul>

        <p className={elOtro ? 'resumen resumen--bien' : 'resumen'}>
          {elOtro
            ? 'Estáis los dos. El camino entre vosotros está abierto.'
            : 'Dícta­le el código y entrará aquí mismo.'}
        </p>

        <div className="mesa__pruebas">
          <button type="button" className="boton boton--plano" onClick={mesa.medirRetardo}>
            Probar el enlace
          </button>
          {mesa.retardo !== null && (
            <span className="mesa__retardo">
              Ida y vuelta hasta la mesa: <strong>{mesa.retardo} ms</strong>
            </span>
          )}
        </div>

        {mesa.motivo && <p className="recado recado--mal">{mesa.motivo}</p>}

        <button type="button" className="boton boton--plano" onClick={mesa.cerrar}>
          Salir de la mesa
        </button>
      </section>

      {/* El vídeo se ve desde que estás en la mesa, aunque estés solo: así
          puedes encender y encuadrar mientras esperas, y comprobar que el
          navegador te da el permiso sin depender del otro. */}
      <PantallaVideo
        estado={enlace.estado}
        fallo={enlace.fallo}
        miMedia={enlace.miMedia}
        suMedia={enlace.suMedia}
        diagnostico={enlace.diagnostico}
        videoCortado={enlace.videoCortado}
        micCortado={enlace.micCortado}
        variasCamaras={enlace.variasCamaras}
        nombreDelOtro={elOtro?.nombre ?? null}
        encender={enlace.encender}
        apagar={enlace.apagar}
        cambiarCamara={enlace.cambiarCamara}
        alternarVideo={enlace.alternarVideo}
        alternarMicrofono={enlace.alternarMicrofono}
      />

      {/* La `key` hace que cada mesa empiece con sus propios números: al
          cambiar de código, el panel se monta de cero y lee lo guardado de
          esa mesa, no lo de la anterior. */}
      {mesa.codigo && mesa.tuId && (
        <PantallaContadores
          key={mesa.codigo}
          codigo={mesa.codigo}
          tuId={mesa.tuId}
          suId={elOtro?.id ?? null}
          tuNombre={nombre}
          nombreDelOtro={elOtro?.nombre ?? null}
          datosAbiertos={enlace.datosAbiertos}
          enviarDato={enlace.enviarDato}
          alRecibirDato={enlace.alRecibirDato}
        />
      )}
    </>
  )
}
