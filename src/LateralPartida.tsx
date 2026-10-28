import { useState } from 'react'

import { Paleta } from './Paleta'
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
  pegar: (clase: ClasePegatina, mesa: string) => void
  quitarTodas: (mesa: string) => void
  apuntando: boolean
  alternarApuntar: () => void
  foto: string | null
  esperandoFoto: boolean
  falloFoto: string | null
  cerrarFoto: () => void
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
        {pestana === 'partida' ? (
          <>
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
          <>
            <section className="tarjeta">
              <h2>Ver una carta de cerca</h2>
              <button
                type="button"
                className={apuntando ? 'boton boton--principal' : 'boton boton--plano'}
                onClick={alternarApuntar}
              >
                {apuntando ? 'Toca la carta…' : 'Tocar una carta'}
              </button>
              <p className="aviso aviso--suelto">
                Toca la carta en la mesa de {nombreDelOtro ?? 'tu rival'}: su navegador manda una
                foto de ese trozo <strong>a resolución completa</strong>, mucho más nítida que el
                vídeo.
              </p>
              {esperandoFoto && <p className="cargando">Pidiéndole la foto…</p>}
              {falloFoto && <p className="recado recado--mal">{falloFoto}</p>}
              {foto && (
                <div className="foto">
                  <img className="foto__imagen" src={foto} alt="La carta, de cerca" />
                  <button type="button" className="boton boton--plano" onClick={cerrarFoto}>
                    Quitar la foto
                  </button>
                </div>
              )}
            </section>

            <PantallaConsultas
              codigo={codigo}
              enlazado={enlazado}
              nombreDelOtro={nombreDelOtro}
              enviarDato={enviarDato}
              alRecibirDato={alRecibirDato}
            />
          </>
        )}
      </div>
    </aside>
  )
}
