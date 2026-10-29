import { useEffect, useState } from 'react'

import { ZONAS, useCartasDelMazo, useMazos, type CartaDelMazo, type Mazo } from './mazos'
import { porLote, type Carta } from './scryfall'

/** Un mapa vacío fijo, para no crear uno nuevo en cada pintado. */
const SIN_IMAGENES = new Map<string, Carta>()

/**
 * Una carta del mazo, con sus copias apiladas.
 *
 * Es como se ven los mazos en cualquier sitio de Magic, y lo pidió Héctor
 * el 29/10/2026 enseñando una foto: de cada copia solo asoma **la banda
 * del nombre**, y la última se ve entera. Así se cuenta cuántas llevas sin
 * leer un número, y ocupa una fracción de lo que ocuparían cuatro cartas.
 */
function Pila({ carta, imagen }: { carta: CartaDelMazo; imagen: Carta | undefined }) {
  const copias = Array.from({ length: Math.min(carta.cantidad, 9) })

  return (
    <div className="pila" title={`${carta.cantidad} × ${carta.nombre}`}>
      {copias.map((_, i) =>
        imagen?.imagen ? (
          <img
            key={i}
            className="pila__carta"
            src={imagen.imagen}
            alt={i === copias.length - 1 ? carta.nombre : ''}
            loading="lazy"
          />
        ) : (
          <div key={i} className="pila__carta pila__carta--sinfoto">
            <span>{carta.nombre}</span>
          </div>
        ),
      )}
      {carta.cantidad > 9 && <span className="pila__muchas">×{carta.cantidad}</span>}
    </div>
  )
}

function Zonas({ cartas, imagenes }: { cartas: CartaDelMazo[]; imagenes: Map<string, Carta> }) {
  return (
    <>
      {ZONAS.map(({ zona, nombre, explicacion }) => {
        const deAqui = cartas.filter((c) => c.zona === zona)
        if (deAqui.length === 0) return null
        const cuantas = deAqui.reduce((suma, c) => suma + c.cantidad, 0)
        return (
          <section key={zona} className="zona">
            <h3 className="zona__titulo">
              {nombre} <span className="zona__cuantas">{cuantas}</span>
              <span className="zona__explicacion">{explicacion}</span>
            </h3>
            <div className="pilas">
              {deAqui.map((carta) => (
                <Pila
                  key={carta.id}
                  carta={carta}
                  imagen={imagenes.get(carta.nombre.toLowerCase())}
                />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}

export function PantallaMazos({ cerrar }: { cerrar: () => void }) {
  const { lista, fallo } = useMazos()
  const [abierto, setAbierto] = useState<Mazo | null>(null)
  const cartas = useCartasDelMazo(abierto?.id ?? null)
  // Las imágenes se guardan junto al mazo del que son. Así «estoy
  // trayendo» se sabe mirando (son de otro mazo) en vez de llevándolo
  // aparte, y no hay forma de enseñar las fotos de un mazo en otro.
  const [traidas, setTraidas] = useState<{ para: string | null; mapa: Map<string, Carta> }>({
    para: null,
    mapa: SIN_IMAGENES,
  })
  const trayendo = !!abierto && traidas.para !== abierto.id

  useEffect(() => {
    if (!abierto || !cartas || cartas.length === 0) return
    let vigente = true
    const mazoId = abierto.id
    void (async () => {
      const encontradas = await porLote([...new Set(cartas.map((c) => c.nombre))])
      if (vigente) setTraidas({ para: mazoId, mapa: encontradas })
    })()
    return () => {
      vigente = false
    }
  }, [abierto, cartas])

  if (abierto) {
    return (
      <section className="tarjeta">
        <div className="mazo__cabecera">
          <button type="button" className="boton boton--plano" onClick={() => setAbierto(null)}>
            ← Mis mazos
          </button>
          <h2 className="mazo__nombre">{abierto.nombre}</h2>
          <span className="mazo__formato">{abierto.formato}</span>
        </div>

        {abierto.notas && <p className="mazo__notas">{abierto.notas}</p>}
        {trayendo && <p className="cargando">Trayendo las cartas…</p>}

        {/* Las imágenes son las del mazo que hay abierto: si acabas de
            cambiar de mazo, mejor sin foto un instante que con la foto de
            otra carta. */}
        {cartas && <Zonas cartas={cartas} imagenes={trayendo ? SIN_IMAGENES : traidas.mapa} />}
      </section>
    )
  }

  return (
    <section className="tarjeta">
      <div className="mazo__cabecera">
        <h2 className="mazo__nombre">Mis mazos</h2>
        <button type="button" className="boton boton--plano" onClick={cerrar}>
          Cerrar
        </button>
      </div>

      {fallo && <p className="recado recado--mal">{fallo}</p>}
      {lista === null && <p className="cargando">Trayendo tus mazos…</p>}
      {lista?.length === 0 && <p>Todavía no tienes ningún mazo.</p>}

      <div className="mazos">
        {lista?.map((mazo) => (
          <button
            key={mazo.id}
            type="button"
            className="mazo"
            onClick={() => setAbierto(mazo)}
          >
            <span className="mazo__portada">
              {mazo.portadaNombre ? (
                <img
                  src={`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(mazo.portadaNombre)}&format=image&version=art_crop`}
                  alt=""
                  loading="lazy"
                />
              ) : null}
            </span>
            <span className="mazo__texto">
              <strong>{mazo.nombre}</strong>
              <span className="mazo__formato">{mazo.formato}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
