import { useState } from 'react'

import type { Diagnostico } from './enlace'

// La barra de la izquierda: TODO lo que no es de la partida. Cámara, micro,
// el código de la mesa y la salida. Va estrecha y se abre al pasar el ratón,
// para no comerle sitio a la imagen, que es lo que importa.

function Icono({ d }: { d: string }) {
  return (
    <svg className="barra__icono" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const DIBUJOS = {
  camara: 'M15 8v8H3V8h12m2 2.5 4-2.5v8l-4-2.5V10.5Z',
  camaraNo: 'M3 4.5 19.5 21M15 8v8H3V8h8m6 2.5 4-2.5v8l-2-1.2',
  micro: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm7 9a7 7 0 0 1-14 0m7 7v3',
  microNo: 'M3 4.5 19.5 21M15 6v6m-6 0a3 3 0 0 0 4.5 2.6M19 12a7 7 0 0 1-10.6 6M12 19v3',
  girar: 'M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6M17 3v4h-4M7 21v-4h4',
  codigo: 'M9 5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M12 4h7v7M19 4l-9 9',
  salir: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10',
  pulso: 'M3 12h4l2-6 4 12 2-6h6',
}

export function BarraPartida({
  codigo,
  camaraEncendida,
  videoCortado,
  micCortado,
  variasCamaras,
  diagnostico,
  encender,
  apagar,
  alternarVideo,
  alternarMicrofono,
  cambiarCamara,
  salir,
}: {
  codigo: string
  camaraEncendida: boolean
  videoCortado: boolean
  micCortado: boolean
  variasCamaras: boolean
  diagnostico: Diagnostico
  encender: () => void
  apagar: () => void
  alternarVideo: () => void
  alternarMicrofono: () => void
  cambiarCamara: () => void
  salir: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const [mirandoConexion, setMirandoConexion] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Hay navegadores que no dejan copiar sin un gesto claro. No pasa
      // nada: el código está escrito aquí al lado y se puede dictar.
    }
  }

  return (
    <aside className="barra">
      <button
        type="button"
        className={camaraEncendida ? 'barra__boton' : 'barra__boton barra__boton--llama'}
        onClick={camaraEncendida ? apagar : encender}
      >
        <Icono d={camaraEncendida ? DIBUJOS.camara : DIBUJOS.camaraNo} />
        <span className="barra__texto">
          {camaraEncendida ? 'Apagar la cámara' : 'Encender la cámara'}
        </span>
      </button>

      {camaraEncendida && (
        <>
          <button
            type="button"
            className={videoCortado ? 'barra__boton barra__boton--cortado' : 'barra__boton'}
            onClick={alternarVideo}
          >
            <Icono d={videoCortado ? DIBUJOS.camaraNo : DIBUJOS.camara} />
            <span className="barra__texto">
              {videoCortado ? 'Volver a mostrar' : 'Cortar imagen'}
            </span>
          </button>

          <button
            type="button"
            className={micCortado ? 'barra__boton barra__boton--cortado' : 'barra__boton'}
            onClick={alternarMicrofono}
          >
            <Icono d={micCortado ? DIBUJOS.microNo : DIBUJOS.micro} />
            <span className="barra__texto">
              {micCortado ? 'Abrir micrófono' : 'Silenciar micrófono'}
            </span>
          </button>

          {variasCamaras && (
            <button type="button" className="barra__boton" onClick={cambiarCamara}>
              <Icono d={DIBUJOS.girar} />
              <span className="barra__texto">Cambiar de cámara</span>
            </button>
          )}
        </>
      )}

      <div className="barra__hueco" />

      <button type="button" className="barra__boton" onClick={copiar}>
        <Icono d={DIBUJOS.codigo} />
        <span className="barra__texto">{copiado ? '¡Copiado!' : `Código ${codigo}`}</span>
      </button>

      <button
        type="button"
        className="barra__boton"
        onClick={() => setMirandoConexion((v) => !v)}
      >
        <Icono d={DIBUJOS.pulso} />
        <span className="barra__texto">Cómo va la conexión</span>
      </button>

      {mirandoConexion && (
        <div className="conexion">
          <dl className="conexion__datos">
            <div>
              <dt>Camino</dt>
              <dd>{diagnostico.camino}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{diagnostico.conexion}</dd>
            </div>
            <div>
              <dt>Envías</dt>
              <dd>{diagnostico.enviada ?? '—'}</dd>
            </div>
            <div>
              <dt>Recibes</dt>
              <dd>{diagnostico.resolucion ?? '—'}</dd>
            </div>
            <div>
              <dt>Fotogramas</dt>
              <dd>{diagnostico.fps ?? '—'}</dd>
            </div>
            <div>
              <dt>Ida y vuelta</dt>
              <dd>{diagnostico.idaYVuelta !== null ? `${diagnostico.idaYVuelta} ms` : '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      <button type="button" className="barra__boton barra__boton--salir" onClick={salir}>
        <Icono d={DIBUJOS.salir} />
        <span className="barra__texto">Salir de la mesa</span>
      </button>
    </aside>
  )
}
