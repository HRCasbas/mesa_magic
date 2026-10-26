import { useEffect, useState } from 'react'

import {
  datosDelAparato,
  ejecutarComprobaciones,
  type Comprobacion,
  type Resultado,
} from './comprobaciones'

const SIGNOS: Record<Resultado, string> = {
  bien: '✓',
  mal: '✕',
  duda: '?',
}

/** Las fases del proyecto. La primera sin terminar es la que toca ahora. */
const FASES = [
  { numero: 0, nombre: 'El terreno', hecha: true },
  { numero: 1, nombre: 'La puerta', hecha: false },
  { numero: 2, nombre: 'La mesa', hecha: false },
  { numero: 3, nombre: 'El vídeo', hecha: false },
  { numero: 4, nombre: 'Los contadores', hecha: false },
  { numero: 5, nombre: 'Los marcadores', hecha: false },
  { numero: 6, nombre: 'Leer las cartas', hecha: false },
  { numero: 7, nombre: 'Mazos e historial', hecha: false },
  { numero: 8, nombre: 'El remate', hecha: false },
]

function FilaComprobacion({ dato }: { dato: Comprobacion }) {
  return (
    <li className={`comprobacion comprobacion--${dato.resultado}`}>
      <span className="comprobacion__signo" aria-hidden="true">
        {SIGNOS[dato.resultado]}
      </span>
      <div className="comprobacion__texto">
        <p className="comprobacion__titulo">
          {dato.titulo}
          <span className="comprobacion__detalle">{dato.detalle}</span>
        </p>
        <p className="comprobacion__porque">{dato.porQue}</p>
      </div>
    </li>
  )
}

export function App() {
  const [comprobaciones, setComprobaciones] = useState<Comprobacion[] | null>(null)

  useEffect(() => {
    let vigente = true
    ejecutarComprobaciones().then((lista) => {
      if (vigente) setComprobaciones(lista)
    })
    return () => {
      vigente = false
    }
  }, [])

  const aparato = datosDelAparato()
  const fallos = comprobaciones?.filter((c) => c.resultado === 'mal').length ?? 0

  return (
    <main className="pagina">
      <header className="cabecera">
        <p className="cabecera__fase">Fase 0 · El terreno</p>
        <h1 className="cabecera__titulo">Mesa Magic</h1>
        <p className="cabecera__lema">
          Magic: The Gathering a distancia, mesa contra mesa.
        </p>
      </header>

      <section className="tarjeta">
        <h2>Esto todavía no juega</h2>
        <p>
          La fase 0 solo comprueba el terreno: que la web existe, que se abre con conexión segura
          y que el aparato desde el que la miras sirve para lo que viene después. No hay cámara,
          no hay cuentas y no hay partida. Eso llega por orden.
        </p>
        <p className="aviso">
          <strong>La cámara no se enciende aquí.</strong> Abajo solo se pregunta al navegador si
          existe alguna, que no es lo mismo: no sale ningún aviso de permiso y no se graba nada.
        </p>
      </section>

      <section className="tarjeta">
        <h2>¿Sirve este aparato?</h2>
        {comprobaciones === null ? (
          <p className="cargando">Comprobando…</p>
        ) : (
          <>
            <ul className="comprobaciones">
              {comprobaciones.map((dato) => (
                <FilaComprobacion key={dato.clave} dato={dato} />
              ))}
            </ul>
            <p className={fallos === 0 ? 'resumen resumen--bien' : 'resumen resumen--mal'}>
              {fallos === 0
                ? 'Este aparato sirve.'
                : fallos === 1
                  ? 'Hay 1 comprobación en rojo. Dímelo y la miramos.'
                  : `Hay ${fallos} comprobaciones en rojo. Dímelo y las miramos.`}
            </p>
          </>
        )}
      </section>

      <section className="tarjeta">
        <h2>El plan</h2>
        <ol className="fases">
          {FASES.map((fase) => (
            <li key={fase.numero} className={fase.hecha ? 'fase fase--hecha' : 'fase'}>
              <span className="fase__numero">{fase.numero}</span>
              <span className="fase__nombre">{fase.nombre}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="pie">
        <dl className="aparato">
          {aparato.map((dato) => (
            <div key={dato.etiqueta} className="aparato__par">
              <dt>{dato.etiqueta}</dt>
              <dd>{dato.valor}</dd>
            </div>
          ))}
        </dl>
      </footer>
    </main>
  )
}
