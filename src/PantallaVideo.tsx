import { useEffect, useRef } from 'react'

import type { Diagnostico, EstadoVideo } from './video'

function Imagen({
  media,
  mio,
  etiqueta,
  vacia,
}: {
  media: MediaStream | null
  mio: boolean
  etiqueta: string
  vacia: string
}) {
  const elemento = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (elemento.current) elemento.current.srcObject = media
  }, [media])

  return (
    <div className={mio ? 'imagen imagen--mia' : 'imagen'}>
      <video
        ref={elemento}
        autoPlay
        playsInline
        // La mía va siempre muda: si no, se oye uno a sí mismo con retardo
        // y es insoportable.
        muted={mio}
      />
      {!media && <p className="imagen__vacia">{vacia}</p>}
      <span className="imagen__etiqueta">{etiqueta}</span>
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
        />
        <Imagen media={miMedia} mio etiqueta="Tu mesa" vacia="Tu cámara está apagada." />
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

      <PanelDiagnostico datos={diagnostico} />
    </section>
  )
}
