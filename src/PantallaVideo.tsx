import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { CapaPegatinas } from './CapaPegatinas'
import type { Diagnostico, EstadoVideo } from './enlace'
import { CLASES, type ClasePegatina, type ManejoPegatinas } from './pegatinas'

/** Mientras no se sepa el tamaño del fotograma, la capa ocupa toda la caja. */
const TODA_LA_CAJA: CSSProperties = { inset: 0 }

function Imagen({
  media,
  mio,
  etiqueta,
  vacia,
  pegatinas,
  manejo,
}: {
  media: MediaStream | null
  mio: boolean
  etiqueta: string
  vacia: string
  pegatinas: ManejoPegatinas['lista']
  manejo: ManejoPegatinas
}) {
  const elemento = useRef<HTMLVideoElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const [marco, setMarco] = useState<CSSProperties>(TODA_LA_CAJA)

  useEffect(() => {
    if (elemento.current) elemento.current.srcObject = media
  }, [media])

  // Dónde cae de verdad la imagen dentro de la caja. Con `object-fit:
  // contain`, un móvil en vertical deja dos franjas negras a los lados, y
  // las pegatinas tienen que ir sobre la imagen, no sobre las franjas.
  useEffect(() => {
    const video = elemento.current
    const fuera = caja.current
    if (!video || !fuera) return

    function recalcular() {
      if (!video || !fuera) return
      const sitio = fuera.getBoundingClientRect()
      if (!video.videoWidth || !video.videoHeight || !sitio.width || !sitio.height) {
        setMarco(TODA_LA_CAJA)
        return
      }
      const deLaImagen = video.videoWidth / video.videoHeight
      const deLaCaja = sitio.width / sitio.height
      const ancho = deLaImagen > deLaCaja ? sitio.width : sitio.height * deLaImagen
      const alto = deLaImagen > deLaCaja ? sitio.width / deLaImagen : sitio.height
      setMarco({
        left: (sitio.width - ancho) / 2,
        top: (sitio.height - alto) / 2,
        width: ancho,
        height: alto,
      })
    }

    video.addEventListener('loadedmetadata', recalcular)
    video.addEventListener('resize', recalcular)
    // Al empezar a observar, el navegador avisa una primera vez solo, así
    // que no hace falta llamarlo aquí a mano.
    const vigilante = new ResizeObserver(recalcular)
    vigilante.observe(fuera)

    return () => {
      video.removeEventListener('loadedmetadata', recalcular)
      video.removeEventListener('resize', recalcular)
      vigilante.disconnect()
    }
  }, [media])

  return (
    <div className={mio ? 'imagen imagen--mia' : 'imagen'} ref={caja}>
      <video
        ref={elemento}
        autoPlay
        playsInline
        // La mía va siempre muda: si no, se oye uno a sí mismo con retardo
        // y es insoportable.
        muted={mio}
      />
      {!media && <p className="imagen__vacia">{vacia}</p>}
      <CapaPegatinas lista={pegatinas} estilo={marco} manejo={manejo} />
      <span className="imagen__etiqueta">{etiqueta}</span>
    </div>
  )
}

function Paleta({
  mesaMia,
  mesaSuya,
  nombreDelOtro,
  moverTodas,
  alternarMoverTodas,
  pegar,
  quitarTodas,
}: {
  mesaMia: string
  mesaSuya: string | null
  nombreDelOtro: string | null
  moverTodas: boolean
  alternarMoverTodas: () => void
  pegar: (clase: ClasePegatina, mesa: string) => void
  quitarTodas: (mesa: string) => void
}) {
  const [enLaSuya, setEnLaSuya] = useState(false)
  const mesa = enLaSuya && mesaSuya ? mesaSuya : mesaMia

  return (
    <div className="paleta">
      {mesaSuya && (
        <div className="paleta__donde">
          <span className="paleta__titulo">Pegar en</span>
          <button
            type="button"
            className={enLaSuya ? 'boton boton--plano' : 'boton boton--principal'}
            onClick={() => setEnLaSuya(false)}
          >
            Mi mesa
          </button>
          <button
            type="button"
            className={enLaSuya ? 'boton boton--principal' : 'boton boton--plano'}
            onClick={() => setEnLaSuya(true)}
          >
            Mesa de {nombreDelOtro ?? 'tu rival'}
          </button>
        </div>
      )}

      <div className="paleta__clases">
        {CLASES.map(({ clase, nombre }) => (
          <button
            key={clase}
            type="button"
            className={`boton boton--plano paleta__clase paleta__clase--${clase}`}
            onClick={() => pegar(clase, mesa)}
          >
            {nombre}
          </button>
        ))}
      </div>

      <div className="paleta__mas">
        <button
          type="button"
          className={moverTodas ? 'boton boton--principal' : 'boton boton--plano'}
          onClick={alternarMoverTodas}
        >
          {moverTodas ? 'Moviendo todas' : 'Mover todas'}
        </button>
        <button type="button" className="boton boton--plano" onClick={() => quitarTodas(mesa)}>
          Quitar las de esa mesa
        </button>
      </div>

      <p className="aviso aviso--suelto">
        Sale en medio de la imagen y se arrastra hasta la carta.{' '}
        {moverTodas ? (
          <strong>Arrastrando una se mueven todas las de esa mesa.</strong>
        ) : (
          <>
            Si alguien da un golpe a la cámara, <strong>Mover todas</strong> recoloca el grupo
            entero de un arrastre.
          </>
        )}
      </p>
    </div>
  )
}

function PanelDiagnostico({ datos }: { datos: Diagnostico }) {
  return (
    <details className="diagnostico">
      <summary>
        Cómo va la conexión
        {datos.camino !== '—' && (
          <span
            className={
              datos.camino === 'directo'
                ? 'diagnostico__via'
                : 'diagnostico__via diagnostico__via--rele'
            }
          >
            {datos.camino}
          </span>
        )}
      </summary>

      <dl className="diagnostico__datos">
        <div>
          <dt>Camino</dt>
          <dd>
            {datos.camino === 'directo'
              ? 'directo, de tu casa a la suya'
              : datos.camino === 'relé'
                ? 'por el relé de Cloudflare'
                : '—'}
          </dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{datos.conexion}</dd>
        </div>
        <div>
          <dt>Imagen que envías</dt>
          <dd>{datos.enviada ?? '—'}</dd>
        </div>
        <div>
          <dt>Imagen que recibes</dt>
          <dd>{datos.resolucion ?? '—'}</dd>
        </div>
        <div>
          <dt>Fotogramas</dt>
          <dd>{datos.fps !== null ? `${datos.fps} por segundo` : '—'}</dd>
        </div>
        <div>
          <dt>Calidad</dt>
          <dd>{datos.kbps !== null ? `${datos.kbps} kbps` : '—'}</dd>
        </div>
        <div>
          <dt>Ida y vuelta</dt>
          <dd>{datos.idaYVuelta !== null ? `${datos.idaYVuelta} ms` : '—'}</dd>
        </div>
      </dl>

      <p className="diagnostico__nota">
        {datos.hayRele
          ? 'Hay relé disponible por si la conexión directa no fuera posible.'
          : (datos.motivoRele ??
            'Sin relé: si alguno de los dos tiene el router cerrado, puede que no conectéis.')}
      </p>
    </details>
  )
}

export function PantallaVideo({
  estado,
  fallo,
  miMedia,
  suMedia,
  diagnostico,
  videoCortado,
  micCortado,
  variasCamaras,
  nombreDelOtro,
  mesaMia,
  mesaSuya,
  pegatinas,
  moverTodas,
  alternarMoverTodas,
  pegar,
  quitarTodas,
  encender,
  apagar,
  cambiarCamara,
  alternarVideo,
  alternarMicrofono,
}: {
  estado: EstadoVideo
  fallo: string | null
  miMedia: MediaStream | null
  suMedia: MediaStream | null
  diagnostico: Diagnostico
  videoCortado: boolean
  micCortado: boolean
  variasCamaras: boolean
  /** Null mientras estés solo en la mesa. */
  nombreDelOtro: string | null
  mesaMia: string
  mesaSuya: string | null
  pegatinas: ManejoPegatinas
  moverTodas: boolean
  alternarMoverTodas: () => void
  pegar: (clase: ClasePegatina, mesa: string) => void
  quitarTodas: (mesa: string) => void
  encender: () => void
  apagar: () => void
  cambiarCamara: () => void
  alternarVideo: () => void
  alternarMicrofono: () => void
}) {
  if (estado === 'pidiendo') {
    return (
      <section className="tarjeta">
        <h2>El vídeo</h2>
        <p className="cargando">Pidiendo permiso para la cámara…</p>
        <p className="aviso">
          Si no sale el aviso del navegador, búscalo en el candado de la barra de direcciones: puede
          que el permiso esté denegado de antes.
        </p>
      </section>
    )
  }

  // Nada encendido por ninguno de los dos: la invitación.
  if (!miMedia && !suMedia) {
    return (
      <section className="tarjeta">
        <h2>El vídeo</h2>
        <p>
          <strong>Cada uno enciende la suya.</strong> Tu cámara solo manda tu mesa; la mesa de{' '}
          {nombreDelOtro ?? 'tu rival'} no se ve hasta que la enciendan desde el otro lado. Apunta a
          la mesa y usa el recuadro pequeño para encuadrar.
        </p>
        {fallo && <p className="recado recado--mal">{fallo}</p>}
        <button type="button" className="boton boton--principal" onClick={encender}>
          Encender la cámara
        </button>
        <p className="aviso">
          La cámara se enciende <strong>solo cuando pulsas</strong>, y se apaga del todo al salir de
          aquí. El vídeo va cifrado y directo: no pasa por ningún servidor nuestro.
        </p>
      </section>
    )
  }

  return (
    <section className="tarjeta">
      <h2>El vídeo</h2>

      <div className="imagenes">
        <Imagen
          media={suMedia}
          mio={false}
          etiqueta={nombreDelOtro ? `Mesa de ${nombreDelOtro}` : 'La otra mesa'}
          vacia={
            nombreDelOtro
              ? `${nombreDelOtro} todavía no ha encendido su cámara.`
              : 'Esperando a tu rival.'
          }
          pegatinas={mesaSuya ? pegatinas.lista.filter((p) => p.mesa === mesaSuya) : []}
          manejo={pegatinas}
        />
        <Imagen
          media={miMedia}
          mio
          etiqueta="Tu mesa"
          vacia="Tu cámara está apagada."
          pegatinas={pegatinas.lista.filter((p) => p.mesa === mesaMia)}
          manejo={pegatinas}
        />
      </div>

      <div className="controles">
        {miMedia ? (
          <>
            <button type="button" className="boton boton--plano" onClick={alternarVideo}>
              {videoCortado ? 'Volver a mostrar' : 'Cortar imagen'}
            </button>
            <button type="button" className="boton boton--plano" onClick={alternarMicrofono}>
              {micCortado ? 'Abrir micrófono' : 'Silenciar micrófono'}
            </button>
            {variasCamaras && (
              <button type="button" className="boton boton--plano" onClick={cambiarCamara}>
                Cambiar de cámara
              </button>
            )}
            <button type="button" className="boton boton--plano" onClick={apagar}>
              Apagar la cámara
            </button>
          </>
        ) : (
          <button type="button" className="boton boton--principal" onClick={encender}>
            Encender la cámara
          </button>
        )}
      </div>

      {fallo && <p className="recado recado--mal">{fallo}</p>}

      {videoCortado && (
        <p className="recado recado--bien">
          Tu imagen está cortada. {nombreDelOtro ?? 'Tu rival'} no ve tu mesa; tú la suya sí.
        </p>
      )}

      <h3 className="paleta__cabecera">Las pegatinas</h3>
      <Paleta
        mesaMia={mesaMia}
        mesaSuya={mesaSuya}
        nombreDelOtro={nombreDelOtro}
        moverTodas={moverTodas}
        alternarMoverTodas={alternarMoverTodas}
        pegar={pegar}
        quitarTodas={quitarTodas}
      />

      <PanelDiagnostico datos={diagnostico} />
    </section>
  )
}
