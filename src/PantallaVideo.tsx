import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { CapaPegatinas } from './CapaPegatinas'
import type { Diagnostico, EstadoVideo } from './enlace'
import { CLASES, type ClasePegatina, type ManejoPegatinas } from './pegatinas'

/** Dónde cae la imagen de verdad dentro de la caja, en píxeles. */
interface Marco {
  izquierda: number
  arriba: number
  ancho: number
  alto: number
}

/** Mientras no se sepa el tamaño del fotograma, la capa ocupa toda la caja. */
const TODA_LA_CAJA: CSSProperties = { inset: 0 }

function Imagen({
  media,
  mio,
  etiqueta,
  vacia,
  pegatinas,
  manejo,
  apuntando,
  alTocar,
}: {
  media: MediaStream | null
  mio: boolean
  etiqueta: string
  vacia: string
  pegatinas: ManejoPegatinas['lista']
  manejo: ManejoPegatinas
  /** Puesto, el siguiente toque pide la foto de esa carta. */
  apuntando?: boolean
  alTocar?: (x: number, y: number) => void
}) {
  const elemento = useRef<HTMLVideoElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const [marco, setMarco] = useState<Marco | null>(null)

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
        setMarco(null)
        return
      }
      const deLaImagen = video.videoWidth / video.videoHeight
      const deLaCaja = sitio.width / sitio.height
      const ancho = deLaImagen > deLaCaja ? sitio.width : sitio.height * deLaImagen
      const alto = deLaImagen > deLaCaja ? sitio.width / deLaImagen : sitio.height
      setMarco({
        izquierda: (sitio.width - ancho) / 2,
        arriba: (sitio.height - alto) / 2,
        ancho,
        alto,
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

  // De dónde has tocado a «qué punto del fotograma es eso», que es lo que
  // entiende el otro navegador para recortar su imagen buena.
  function tocado(evento: React.MouseEvent<HTMLDivElement>) {
    if (!apuntando || !alTocar) return
    const fuera = caja.current?.getBoundingClientRect()
    if (!fuera) return
    const izquierda = marco ? marco.izquierda : 0
    const arriba = marco ? marco.arriba : 0
    const ancho = marco ? marco.ancho : fuera.width
    const alto = marco ? marco.alto : fuera.height
    if (!ancho || !alto) return
    const x = (evento.clientX - fuera.left - izquierda) / ancho
    const y = (evento.clientY - fuera.top - arriba) / alto
    // Tocar la franja negra de al lado no es tocar ninguna carta.
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    alTocar(x, y)
  }

  const estilo: CSSProperties = marco
    ? { left: marco.izquierda, top: marco.arriba, width: marco.ancho, height: marco.alto }
    : TODA_LA_CAJA

  return (
    <div
      className={`imagen${mio ? ' imagen--mia' : ''}${apuntando ? ' imagen--apuntando' : ''}`}
      ref={caja}
      onClick={tocado}
    >
      <video
        ref={elemento}
        autoPlay
        playsInline
        // La mía va siempre muda: si no, se oye uno a sí mismo con retardo
        // y es insoportable.
        muted={mio}
      />
      {!media && <p className="imagen__vacia">{vacia}</p>}
      <CapaPegatinas lista={pegatinas} estilo={estilo} manejo={manejo} />
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
  apuntando,
  alternarApuntar,
  tocarCarta,
  foto,
  esperandoFoto,
  falloFoto,
  cerrarFoto,
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
  apuntando: boolean
  alternarApuntar: () => void
  tocarCarta: (x: number, y: number) => void
  foto: string | null
  esperandoFoto: boolean
  falloFoto: string | null
  cerrarFoto: () => void
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
          apuntando={apuntando}
          alTocar={tocarCarta}
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

      <h3 className="paleta__cabecera">Ver una carta de cerca</h3>
      <div className="controles">
        <button
          type="button"
          className={apuntando ? 'boton boton--principal' : 'boton boton--plano'}
          onClick={alternarApuntar}
          disabled={!suMedia}
        >
          {apuntando ? 'Toca la carta…' : 'Tocar una carta'}
        </button>
        {foto && (
          <button type="button" className="boton boton--plano" onClick={cerrarFoto}>
            Quitar la foto
          </button>
        )}
      </div>

      <p className="aviso aviso--suelto">
        {suMedia ? (
          <>
            Pulsa el botón y toca la carta en la mesa de {nombreDelOtro ?? 'tu rival'}. Su navegador
            manda <strong>una foto de ese trozo a resolución completa</strong>, que es mucho más
            nítida que el vídeo. Ampliar el vídeo no serviría: ya te llega reducido.
          </>
        ) : (
          <>Hasta que {nombreDelOtro ?? 'tu rival'} no encienda su cámara no hay nada que tocar.</>
        )}
      </p>

      {esperandoFoto && <p className="cargando">Pidiéndole la foto…</p>}
      {falloFoto && <p className="recado recado--mal">{falloFoto}</p>}
      {foto && (
        <div className="foto">
          <img className="foto__imagen" src={foto} alt="La carta, de cerca" />
          <p className="aviso">
            Si aun así no se lee, busca la carta por su número de colección ahí abajo, en{' '}
            <strong>Las cartas</strong>: abajo a la izquierda de la carta están el número y las
            letras de la edición, y son los mismos en todos los idiomas.
          </p>
        </div>
      )}

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
