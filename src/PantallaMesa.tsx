import { useEffect, useState, type FormEvent } from 'react'

import { BarraPartida } from './BarraPartida'
import { LateralPartida } from './LateralPartida'
import { Moneda } from './Moneda'
import { Mesa } from './Tapete'
import { useContadores } from './contadores'
import { useEnlace } from './enlace'
import { useFotos } from './fotos'
import { useMazoElegido } from './mazoElegido'
import { useMesa } from './mesa'
import { usePegatinas } from './pegatinas'

/**
 * La mesa: primero la puerta para encontraros, y luego la partida entera.
 *
 * La partida ocupa la pantalla y se reparte en tres: la imagen en medio y
 * lo más grande posible, a la izquierda lo que NO es de la partida (cámara,
 * micro, salir) y a la derecha lo que SÍ lo es (vidas, turno, cartas). Es
 * el reparto de SpellTable, y lo pidió Héctor el 28/10/2026 después de
 * jugar con el montaje anterior: lo que importa es ver las cartas.
 */
export function PantallaMesa({ nombre }: { nombre: string }) {
  const mesa = useMesa(nombre)
  const [escrito, setEscrito] = useState('')

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

  const pegatinas = usePegatinas({
    datosAbiertos: enlace.datosAbiertos,
    enviarDato: enlace.enviarDato,
    alRecibirDato: enlace.alRecibirDato,
  })

  const mazo = useMazoElegido({
    datosAbiertos: enlace.datosAbiertos,
    enviarDato: enlace.enviarDato,
    alRecibirDato: enlace.alRecibirDato,
  })

  const fotos = useFotos({
    miMedia: enlace.miMedia,
    enviarDato: enlace.enviarDato,
    alRecibirDato: enlace.alRecibirDato,
  })
  const contadores = useContadores({
    codigo: mesa.codigo ?? "",
    tuId: mesa.tuId ?? "",
    suId: elOtro?.id ?? null,
    datosAbiertos: enlace.datosAbiertos,
    enviarDato: enlace.enviarDato,
    alRecibirDato: enlace.alRecibirDato,
  })

  const [apuntando, setApuntando] = useState(false)
  const [miMesaGrande, setMiMesaGrande] = useState(false)

  // Dentro de la partida la pantalla no se mueve (Héctor, 28/10/2026). La
  // partida es una capa fija encima de todo; sin esto, la rueda del ratón
  // seguiría moviendo la página de debajo y la imagen bailaría.
  const jugando = mesa.estado === 'dentro'
  useEffect(() => {
    if (!jugando) return
    const comoEstaba = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = comoEstaba
    }
  }, [jugando])

  async function unirse(evento: FormEvent) {
    evento.preventDefault()
    await mesa.entrar(escrito)
  }

  if (mesa.estado === 'conectando') {
    return (
      <section className="tarjeta">
        <h2>La mesa</h2>
        <p className="cargando">Buscando la mesa…</p>
      </section>
    )
  }

  if (mesa.estado !== 'dentro' || !mesa.codigo || !mesa.tuId) {
    return (
      <section className="tarjeta">
        <h2>La mesa</h2>
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

  return (
    <div className="partida">
      <BarraPartida
        codigo={mesa.codigo}
        camaraEncendida={!!enlace.miMedia}
        videoCortado={enlace.videoCortado}
        micCortado={enlace.micCortado}
        variasCamaras={enlace.variasCamaras}
        diagnostico={enlace.diagnostico}
        encender={enlace.encender}
        apagar={enlace.apagar}
        alternarVideo={enlace.alternarVideo}
        alternarMicrofono={enlace.alternarMicrofono}
        cambiarCamara={enlace.cambiarCamara}
        salir={mesa.cerrar}
      />

      <div className="tapete">
        {/* La de abajo es la que manda: va grande. Pulsando la pequeña se
            cambian de sitio, que es la única forma de poner pegatinas en
            tu propia mesa: en el recuadro de la esquina no se ve nada
            (Héctor, 28/10/2026). */}
        <Mesa
          media={miMesaGrande ? enlace.miMedia : enlace.suMedia}
          mia={miMesaGrande}
          etiqueta={miMesaGrande ? 'Tu mesa' : (elOtro?.nombre ?? 'Esperando…')}
          vacia={
            miMesaGrande
              ? 'Tu cámara está apagada.'
              : elOtro
                ? `${elOtro.nombre} todavía no ha encendido su cámara.`
                : `Dicta el código ${mesa.codigo} y tu rival entrará aquí mismo.`
          }
          pegatinas={pegatinas.manejo.lista.filter(
            (p) => p.mesa === (miMesaGrande ? mesa.tuId : elOtro?.id),
          )}
          manejo={pegatinas.manejo}
          apuntando={apuntando && !miMesaGrande}
          alSeleccionar={(recuadro) => {
            // Un recuadro, una foto: el modo se apaga solo.
            setApuntando(false)
            fotos.pedir(recuadro)
          }}
        />

        <Mesa
          media={miMesaGrande ? enlace.suMedia : enlace.miMedia}
          mia={!miMesaGrande}
          etiqueta={miMesaGrande ? (elOtro?.nombre ?? 'Esperando…') : 'Tu mesa'}
          vacia=""
          pegatinas={pegatinas.manejo.lista.filter(
            (p) => p.mesa === (miMesaGrande ? elOtro?.id : mesa.tuId),
          )}
          pequena
          manejo={pegatinas.manejo}
          alPulsar={() => setMiMesaGrande((v) => !v)}
        />

        {/* La moneda va en medio de la imagen y no en el panel: es un
            momento, se mira una vez y los dos tienen que verla. */}
        {mazo.mio && mazo.suyo && !contadores.compartido.empieza && elOtro && mesa.tuId && (
          <div className="tapete__encima">
            <Moneda
              tuNombre={nombre}
              suNombre={elOtro.nombre}
              tuId={mesa.tuId}
              suId={elOtro.id}
              elegir={contadores.elegirQuienEmpieza}
            />
          </div>
        )}

        {(mesa.motivo || enlace.fallo) && (
          <p className="tapete__recado">{mesa.motivo ?? enlace.fallo}</p>
        )}
      </div>

      <LateralPartida
        key={mesa.codigo}
        codigo={mesa.codigo}
        tuId={mesa.tuId}
        suId={elOtro?.id ?? null}
        tuNombre={nombre}
        nombreDelOtro={elOtro?.nombre ?? null}
        enlazado={enlace.datosAbiertos}
        enviarDato={enlace.enviarDato}
        alRecibirDato={enlace.alRecibirDato}
        moverTodas={pegatinas.moverTodas}
        alternarMoverTodas={() => pegatinas.setMoverTodas((v) => !v)}
        pegar={pegatinas.pegar}
        quitarTodas={pegatinas.quitarTodas}
        apuntando={apuntando}
        alternarApuntar={() => {
          // Si estabas mirando tu propia mesa, se pone delante la del
          // rival: es la que vas a encuadrar, y en el recuadro de la
          // esquina no se puede encuadrar nada (Héctor, 29/10/2026).
          if (!apuntando) setMiMesaGrande(false)
          setApuntando((v) => !v)
        }}
        foto={fotos.foto?.imagen ?? null}
        esperandoFoto={fotos.esperando}
        falloFoto={fotos.fallo}
        cerrarFoto={fotos.cerrar}
        mazoMio={mazo.mio}
        mazoSuyo={mazo.suyo}
        elegirMazo={mazo.elegir}
        contadores={contadores}
      />
    </div>
  )
}
