import { useState } from 'react'

import { ElegirMazo } from './ElegirMazo'
import { Paleta } from './Paleta'
import type { MazoEnJuego } from './mazoElegido'
import { PantallaConsultas } from './PantallaConsultas'
import { PantallaContadores } from './PantallaContadores'
import type { ClasePegatina } from './pegatinas'

type Pestana = 'partida' | 'cartas'

/**
 * El panel de la derecha: TODO lo que es de la partida.
 *
 * Va en dos pestañas porque la columna es estrecha y, con todo apilado, lo
 * de abajo no se ve nunca. «Partida» es lo que se toca cada turno;
 * «Cartas» es lo que se abre de vez en cuando.
 */
export function LateralPartida({
  codigo,
  tuId,
  suId,
  tuNombre,
  nombreDelOtro,
  enlazado,
  enviarDato,
  alRecibirDato,
  moverTodas,
  alternarMoverTodas,
  pegar,
  quitarTodas,
  apuntando,
  alternarApuntar,
  foto,
  esperandoFoto,
  falloFoto,
  cerrarFoto,
  mazoMio,
  mazoSuyo,
  elegirMazo,
}: {
  codigo: string
  tuId: string
  suId: string | null
  tuNombre: string
  nombreDelOtro: string | null
  enlazado: boolean
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
  moverTodas: boolean
  alternarMoverTodas: () => void
  pegar: (clase: ClasePegatina, mesa: string, texto?: string) => void
  quitarTodas: (mesa: string) => void
  apuntando: boolean
  alternarApuntar: () => void
  foto: string | null
  esperandoFoto: boolean
  falloFoto: string | null
  cerrarFoto: () => void
  mazoMio: MazoEnJuego | null
  mazoSuyo: MazoEnJuego | null
  elegirMazo: (mazo: MazoEnJuego | null) => void
}) {
  const [pestana, setPestana] = useState<Pestana>('partida')

  return (
    <aside className="lateral">
      <div className="lateral__pestanas">
        <button
          type="button"
          className={pestana === 'partida' ? 'lateral__pestana lateral__pestana--puesta' : 'lateral__pestana'}
          onClick={() => setPestana('partida')}
        >
          Partida
        </button>
        <button
          type="button"
          className={pestana === 'cartas' ? 'lateral__pestana lateral__pestana--puesta' : 'lateral__pestana'}
          onClick={() => setPestana('cartas')}
        >
          Cartas
        </button>
      </div>

      <div className="lateral__dentro">
        {pestana === "partida" ? (
          <>
            <ElegirMazo
              mio={mazoMio}
              suyo={mazoSuyo}
              nombreDelOtro={nombreDelOtro}
              elegir={elegirMazo}
            />

            {mazoMio && mazoSuyo && (
            <PantallaContadores
              codigo={codigo}
              tuId={tuId}
              suId={suId}
              tuNombre={tuNombre}
              nombreDelOtro={nombreDelOtro}
              datosAbiertos={enlazado}
              enviarDato={enviarDato}
              alRecibirDato={alRecibirDato}
            />
            )}

            <section className="tarjeta">
              <h2>Las pegatinas</h2>
              <Paleta
                mesaMia={tuId}
                mesaSuya={suId}
                nombreDelOtro={nombreDelOtro}
                moverTodas={moverTodas}
                alternarMoverTodas={alternarMoverTodas}
                pegar={pegar}
                quitarTodas={quitarTodas}
              />
            </section>
          </>
        ) : (
          <PantallaConsultas
            codigo={codigo}
            enlazado={enlazado}
            nombreDelOtro={nombreDelOtro}
            enviarDato={enviarDato}
            alRecibirDato={alRecibirDato}
            apuntando={apuntando}
            alternarApuntar={alternarApuntar}
            foto={foto}
            esperandoFoto={esperandoFoto}
            falloFoto={falloFoto}
            cerrarFoto={cerrarFoto}
          />
        )}
      </div>
    </aside>
  )
}
