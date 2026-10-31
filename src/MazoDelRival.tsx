import { useEffect, useState } from 'react'

import type { MazoEnJuego } from './mazoElegido'
import { ZONAS, type CartaDelMazo } from './mazos'
import { esTierra, porCoste } from './orden'
import { Pila } from './Pila'
import { porLote, type Carta } from './scryfall'

const SIN_IMAGENES = new Map<string, Carta>()

/**
 * El mazo del rival, entero, en plena partida.
 *
 * ESTO NO ES ESPIAR: lo decidió Héctor el 27/10/2026 y es la regla 7. En
 * torneo las listas son públicas, y entre ellos acaban preguntándoselas
 * igual a mitad de partida. Enseñarlo quita la pregunta y no cambia nada
 * del juego.
 *
 * El mazo llega por el canal de datos cuando el otro lo elige, así que
 * esto no toca la base de datos: funciona igual con Supabase dormida.
 * Las imágenes sí se piden a Scryfall, y si no llegan se ven los nombres.
 */
export function MazoDelRival({
  mazo,
  nombre,
  cerrar,
}: {
  mazo: MazoEnJuego
  nombre: string
  cerrar: () => void
}) {
  const [fotos, setFotos] = useState<Map<string, Carta>>(SIN_IMAGENES)

  useEffect(() => {
    let vigente = true
    const nombres = [...new Set(mazo.cartas.map((c) => c.nombre))]
    void (async () => {
      const encontradas = await porLote(nombres)
      if (vigente) setFotos(encontradas)
    })()
    return () => {
      vigente = false
    }
  }, [mazo])

  // Las cartas llegan sin identificador, que es cosa de la base de datos:
  // aquí se le pone uno con el nombre y la zona, que ya son únicos.
  const conId: CartaDelMazo[] = mazo.cartas.map((c, i) => ({
    id: `${c.zona}:${c.nombre}:${i}`,
    nombre: c.nombre,
    cantidad: c.cantidad,
    zona: c.zona as CartaDelMazo['zona'],
    orden: i,
  }))

  // Mismo orden que en tus mazos: por coste y las tierras aparte. Un mazo
  // se mira igual sea de quien sea.
  const bloques: { clave: string; nombre: string; cartas: CartaDelMazo[] }[] = []
  for (const { zona, nombre: comoSeLlama } of ZONAS) {
    const deAqui = porCoste(
      conId.filter((c) => c.zona === zona),
      fotos,
    )
    if (deAqui.length === 0) continue
    const tierras = deAqui.filter((c) => esTierra(c, fotos))
    const resto = deAqui.filter((c) => !esTierra(c, fotos))
    if (resto.length > 0) bloques.push({ clave: zona, nombre: comoSeLlama, cartas: resto })
    if (tierras.length > 0) {
      bloques.push({ clave: zona + ':tierras', nombre: 'Tierras', cartas: tierras })
    }
  }

  return (
    <div className="dialogo">
      <div className="dialogo__caja dialogo__caja--mazo">
        <div className="mazo__arriba">
          <h3>El mazo de {nombre}</h3>
          <button type="button" className="boton boton--plano" onClick={cerrar}>
            Cerrar
          </button>
        </div>

        <p className="confirmar__donde">
          {mazo.nombre} · {mazo.formato}
        </p>

        <div className="rival__cartas">
          {bloques.map(({ clave, nombre: comoSeLlama, cartas }) => {
            const cuantas = cartas.reduce((suma, c) => suma + c.cantidad, 0)
            return (
              <section key={clave} className="zona">
                <h4 className="zona__titulo">
                  {comoSeLlama} <span className="zona__cuantas">{cuantas}</span>
                </h4>
                <div className="pilas">
                  {cartas.map((carta) => (
                    <Pila
                      key={carta.id}
                      carta={carta}
                      imagen={fotos.get(carta.nombre.toLowerCase())}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
