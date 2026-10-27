import { useEffect, useRef } from 'react'

import type { Diagnostico, EstadoVideo } from './video'

function Imagen({
  media,
  mio,
  etiqueta,
}: {
  media: MediaStream | null
  mio: boolean
  etiqueta: string
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
      {!media && <p className="imagen__vacia">{etiqueta}</p>}
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
              datos.camino === 'directo' ? 'diagnostico__via' : 'diagnostico__via diagnostico__via--rele'
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
  nombreDelOtro,
  encender,
  apagar,
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
  nombreDelOtro: string
  encender: () => void
  apagar: () => void
  alternarVideo: () => void
  alternarMicrofono: () => void
}) {
  if (estado === 'apagado' || estado === 'fallo') {
    return (
      <section className="tarjeta">
        <h2>El vídeo</h2>
        <p>
          Apunta la cámara a tu mesa. {nombreDelOtro} verá lo mismo que tú veas en el recuadro
          pequeño, así que úsalo para encuadrar.
        </p>
        {fallo && <p className="recado recado--mal">{fallo}</p>}
        <button type="button" className="boton boton--principal" onClick={encender}>
          Encender la cámara
        </button>
        <p className="aviso">
          La cámara se enciende <strong>solo cuando pulsas</strong>, y se apaga del todo al salir
          de aquí. El vídeo va cifrado y directo: no pasa por ningún servidor nuestro.
        </p>
      </section>
    )
  }

  if (estado === 'pidiendo') {
    return (
      <section className="tarjeta">
        <h2>El vídeo</h2>
        <p className="cargando">Pidiendo permiso para la cámara…</p>
      </section>
    )
  }

  return (
    <section className="tarjeta">
      <h2>El vídeo</h2>

      <div className="imagenes">
        <Imagen media={suMedia} mio={false} etiqueta={`Mesa de ${nombreDelOtro}`} />
        <Imagen media={miMedia} mio etiqueta="Tu mesa" />
      </div>

      <div className="controles">
        <button type="button" className="boton boton--plano" onClick={alternarVideo}>
          {videoCortado ? 'Volver a mostrar' : 'Cortar imagen'}
        </button>
        <button type="button" className="boton boton--plano" onClick={alternarMicrofono}>
          {micCortado ? 'Abrir micrófono' : 'Silenciar micrófono'}
        </button>
        <button type="button" className="boton boton--plano" onClick={apagar}>
          Apagar la cámara
        </button>
      </div>

      {videoCortado && (
        <p className="recado recado--bien">
          Tu imagen está cortada. {nombreDelOtro} no te ve, pero tú a él sí.
        </p>
      )}

      <PanelDiagnostico datos={diagnostico} />
    </section>
  )
}
