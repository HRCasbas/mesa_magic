import { useEffect, useRef, useState, type FormEvent } from 'react'

import { interpretarLista, sumar, type CartaLeida } from './importar'
import {
  ZONAS,
  borrarMazo,
  crearMazo,
  guardarCartas,
  guardarMazo,
  useCartasDelMazo,
  useMazos,
  type CartaDelMazo,
  type Mazo,
  type Zona,
} from './mazos'
import { porLote, type Carta } from './scryfall'

const SIN_IMAGENES = new Map<string, Carta>()

/** La portada se pide por nombre: los mazos importados no traen su id. */
function portadaDe(nombre: string, recorte: 'art_crop' | 'normal'): string {
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nombre)}&format=image&version=${recorte}`
}

/** Lo que identifica una lista de cartas. Si cambia, hay que traer fotos. */
function huella(cartas: CartaDelMazo[] | null): string {
  return cartas ? cartas.map((c) => c.nombre).join('|') : ''
}

interface Menu {
  carta: CartaDelMazo
  x: number
  y: number
}

function Pila({
  carta,
  imagen,
  esPortada,
  alPulsar,
  alMenu,
}: {
  carta: CartaDelMazo
  imagen: Carta | undefined
  esPortada: boolean
  alPulsar: () => void
  alMenu: (evento: React.MouseEvent) => void
}) {
  const copias = Array.from({ length: Math.min(carta.cantidad, 9) })

  return (
    <button
      type="button"
      className={esPortada ? 'pila pila--portada' : 'pila'}
      title={`${carta.cantidad} × ${carta.nombre}`}
      onClick={alPulsar}
      onContextMenu={alMenu}
    >
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
          <span key={i} className="pila__carta pila__carta--sinfoto">
            {carta.nombre}
          </span>
        ),
      )}
      {carta.cantidad > 9 && <span className="pila__muchas">×{carta.cantidad}</span>}
    </button>
  )
}

function DialogoImportar({
  cerrar,
  guardar,
}: {
  cerrar: () => void
  guardar: (cartas: CartaLeida[]) => Promise<void>
}) {
  const [texto, setTexto] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const leido = texto.trim() ? interpretarLista(texto) : null

  async function meter(evento: FormEvent) {
    evento.preventDefault()
    if (!leido) return
    setTrabajando(true)
    await guardar(leido.cartas)
    setTrabajando(false)
    cerrar()
  }

  return (
    <div className="dialogo" onClick={cerrar}>
      <form className="dialogo__caja" onSubmit={meter} onClick={(e) => e.stopPropagation()}>
        <h3>Importar</h3>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={12}
          placeholder={'4 Lightning Bolt\n2 Island (EOE) 269\n\nSideboard\n2 Pyroblast'}
          spellCheck={false}
          autoFocus
        />
        {leido && (
          <p className="importar__cuenta">
            {ZONAS.map(({ zona, nombre }) => {
              const cuantas = sumar(leido.cartas, zona)
              return cuantas > 0 ? (
                <span key={zona}>
                  {nombre}: <strong>{cuantas}</strong>
                </span>
              ) : null
            })}
            {leido.perdidas.length > 0 && (
              <span className="importar__perdidas">
                {leido.perdidas.length} sin entender: «{leido.perdidas[0]}»
              </span>
            )}
          </p>
        )}
        <div className="dialogo__botones">
          <button
            type="submit"
            className="boton boton--principal"
            disabled={trabajando || !leido || leido.cartas.length === 0}
          >
            {trabajando ? 'Metiendo…' : 'Reemplazar las cartas'}
          </button>
          <button type="button" className="boton boton--plano" onClick={cerrar}>
            Dejarlo
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Las cartas de una zona, ordenadas como se mira un mazo (Héctor,
 * 30/10/2026): **por coste de maná, y las tierras al final**.
 *
 * Es el orden en el que se piensa un mazo: lo barato arriba, lo caro
 * abajo, y las tierras aparte porque no se juegan pagándolas. El orden
 * guardado en la base no se toca, que es el de la lista que se importó.
 *
 * Mientras una carta no ha llegado de Scryfall no se sabe su coste. Esas
 * se dejan al final y en su sitio: moverlas de golpe cuando llega la
 * respuesta sería peor que no ordenarlas.
 */
function porCoste(deLaZona: CartaDelMazo[], fotos: Map<string, Carta>): CartaDelMazo[] {
  return [...deLaZona].sort((una, otra) => {
    const a = fotos.get(una.nombre.toLowerCase())
    const b = fotos.get(otra.nombre.toLowerCase())
    if (!a || !b) return a ? -1 : b ? 1 : una.orden - otra.orden
    if (a.esTierra !== b.esTierra) return a.esTierra ? 1 : -1
    if (a.coste !== b.coste) return a.coste - b.coste
    return una.nombre.localeCompare(otra.nombre)
  })
}

export function PantallaMazos({ idUsuario, cerrar }: { idUsuario: string; cerrar: () => void }) {
  const { lista, fallo, recargar } = useMazos()
  const [abiertoId, setAbiertoId] = useState<string | null>(null)
  const abierto = lista?.find((m) => m.id === abiertoId) ?? null

  const traidas = useCartasDelMazo(abiertoId)
  /** Las cartas que se están viendo y tocando, antes de guardarlas. */
  const [cartas, setCartas] = useState<CartaDelMazo[]>([])
  const deQuien = useRef<string | null>(null)

  const [borrador, setBorrador] = useState<Mazo | null>(null)
  const [importando, setImportando] = useState(false)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [nueva, setNueva] = useState('')
  const [zonaNueva, setZonaNueva] = useState<Zona>('principal')

  // Las cartas que llegan de la base se copian aquí una vez, y a partir de
  // ahí manda esta copia: lo que tocas se ve al momento, sin esperar a la
  // ida y vuelta.
  useEffect(() => {
    if (!traidas || deQuien.current === abiertoId) return
    deQuien.current = abiertoId
    setCartas(traidas)
  }, [traidas, abiertoId])

  /**
   * Abrir un mazo, vaciando lo que hubiera.
   *
   * El vaciado va AQUÍ y no en un efecto: el nombre del mazo cambia al
   * momento y sus cartas tardan su viaje a la base, así que entre una cosa
   * y otra se veían las del mazo anterior bajo el nombre del nuevo
   * (Héctor, 30/10/2026). Lo que provoca el cambio es esta pulsación, y
   * aquí es donde se limpia.
   */
  function abrirMazo(id: string | null) {
    setAbiertoId(id)
    deQuien.current = null
    setCartas([])
  }

  // Las fotos se piden por LO QUE HAY, no por un contador de vueltas: si
  // cambian las cartas, cambia la huella y se vuelven a pedir. Con el
  // contador, reemplazar la lista dejaba las fotos viejas puestas.
  const [fotos, setFotos] = useState<{ de: string; mapa: Map<string, Carta> }>({
    de: '',
    mapa: SIN_IMAGENES,
  })
  const laHuella = huella(cartas)
  const trayendo = laHuella !== '' && fotos.de !== laHuella

  useEffect(() => {
    if (!laHuella) return
    let vigente = true
    void (async () => {
      const encontradas = await porLote([...new Set(laHuella.split('|'))])
      if (vigente) setFotos({ de: laHuella, mapa: encontradas })
    })()
    return () => {
      vigente = false
    }
  }, [laHuella])

  useEffect(() => {
    if (!menu) return
    const quitar = () => setMenu(null)
    window.addEventListener('click', quitar)
    return () => window.removeEventListener('click', quitar)
  }, [menu])

  async function aplicar(nuevas: CartaDelMazo[]) {
    setCartas(nuevas)
    if (abiertoId) await guardarCartas(abiertoId, nuevas)
  }

  function anadir(evento: FormEvent) {
    evento.preventDefault()
    const nombre = nueva.trim()
    if (!nombre) return
    setNueva('')
    const ya = cartas.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase() && c.zona === zonaNueva)
    if (ya) {
      void aplicar(cartas.map((c) => (c.id === ya.id ? { ...c, cantidad: c.cantidad + 1 } : c)))
      return
    }
    const orden = cartas.filter((c) => c.zona === zonaNueva).length + 1
    void aplicar([
      ...cartas,
      { id: crypto.randomUUID(), nombre, cantidad: 1, zona: zonaNueva, orden },
    ])
  }

  function quitarUna(carta: CartaDelMazo) {
    setMenu(null)
    void aplicar(
      carta.cantidad > 1
        ? cartas.map((c) => (c.id === carta.id ? { ...c, cantidad: c.cantidad - 1 } : c))
        : cartas.filter((c) => c.id !== carta.id),
    )
  }

  function quitarTodas(carta: CartaDelMazo) {
    setMenu(null)
    void aplicar(cartas.filter((c) => c.id !== carta.id))
  }

  async function nuevo() {
    const nombre = window.prompt('¿Cómo se llama el mazo?')?.trim()
    if (!nombre) return
    const id = await crearMazo(idUsuario, nombre, 'Casual')
    recargar()
    if (id) abrirMazo(id)
  }

  async function guardarDatos(evento: FormEvent) {
    evento.preventDefault()
    if (!borrador) return
    await guardarMazo(borrador)
    recargar()
  }

  async function quitarMazo() {
    if (!abierto) return
    if (!window.confirm(`¿Seguro que borras «${abierto.nombre}»? No se puede deshacer.`)) return
    await borrarMazo(abierto.id)
    abrirMazo(null)
    recargar()
  }

  async function ponerPortada(nombre: string) {
    if (!abierto) return
    await guardarMazo({ ...abierto, portadaId: null, portadaNombre: nombre })
    recargar()
  }

  // ---- un mazo abierto ----
  if (abierto) {
    const datos = borrador?.id === abierto.id ? borrador : abierto
    return (
      <>
        <div className="mazo">
          <aside className="mazo__lado">
            <button type="button" className="boton boton--plano" onClick={() => abrirMazo(null)}>
              ← Mis mazos
            </button>

            {abierto.portadaNombre && (
              <img
                className="mazo__grande"
                src={portadaDe(abierto.portadaNombre, 'normal')}
                alt=""
              />
            )}

            <form onSubmit={guardarDatos} className="mazo__forma">
              <label className="campo">
                <span className="campo__nombre">Nombre</span>
                <input
                  type="text"
                  value={datos.nombre}
                  onChange={(e) => setBorrador({ ...datos, nombre: e.target.value })}
                  maxLength={80}
                  required
                />
              </label>
              <label className="campo">
                <span className="campo__nombre">Formato</span>
                <input
                  type="text"
                  value={datos.formato}
                  onChange={(e) => setBorrador({ ...datos, formato: e.target.value })}
                  maxLength={40}
                />
              </label>
              <label className="campo">
                <span className="campo__nombre">Notas</span>
                <textarea
                  value={datos.notas}
                  onChange={(e) => setBorrador({ ...datos, notas: e.target.value })}
                  rows={3}
                />
              </label>
              <button type="submit" className="boton boton--principal">
                Guardar
              </button>
            </form>

            <form onSubmit={anadir} className="mazo__anadir">
              <label className="campo">
                <span className="campo__nombre">Añadir carta</span>
                <input
                  type="text"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  placeholder="Lightning Bolt"
                  spellCheck={false}
                />
              </label>
              <select value={zonaNueva} onChange={(e) => setZonaNueva(e.target.value as Zona)}>
                {ZONAS.map((z) => (
                  <option key={z.zona} value={z.zona}>
                    {z.nombre}
                  </option>
                ))}
              </select>
              <button type="submit" className="boton boton--plano">
                Añadir
              </button>
            </form>

            <div className="mazo__abajo">
              <button
                type="button"
                className="boton boton--plano"
                onClick={() => setImportando(true)}
              >
                Importar lista
              </button>
              <button type="button" className="boton boton--plano" onClick={quitarMazo}>
                Borrar el mazo
              </button>
            </div>
          </aside>

          <div className="mazo__cartas">
            {trayendo && <p className="cargando">Trayendo las cartas…</p>}
            {cartas.length === 0 && !trayendo && (
              <p>Este mazo no tiene cartas. Añádelas o importa la lista.</p>
            )}

            {ZONAS.map(({ zona, nombre, explicacion }) => {
              const deAqui = porCoste(
                cartas.filter((c) => c.zona === zona),
                fotos.mapa,
              )
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
                        imagen={fotos.mapa.get(carta.nombre.toLowerCase())}
                        esPortada={abierto.portadaNombre === carta.nombre}
                        alPulsar={() => ponerPortada(carta.nombre)}
                        alMenu={(evento) => {
                          evento.preventDefault()
                          setMenu({ carta, x: evento.clientX, y: evento.clientY })
                        }}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {menu && (
          <div className="menucarta" style={{ left: menu.x, top: menu.y }}>
            <strong>{menu.carta.nombre}</strong>
            <button type="button" onClick={() => quitarUna(menu.carta)}>
              Quitar una
            </button>
            <button type="button" onClick={() => quitarTodas(menu.carta)}>
              Quitar todas
            </button>
          </div>
        )}

        {importando && (
          <DialogoImportar
            cerrar={() => setImportando(false)}
            guardar={async (leidas) => {
              const conId = leidas.map((c) => ({ ...c, id: crypto.randomUUID() }))
              await aplicar(conId)
            }}
          />
        )}
      </>
    )
  }

  // ---- la lista ----
  return (
    <section className="tarjeta">
      <div className="mazo__cabecera">
        <h2 className="mazo__nombre">Mis mazos</h2>
        <button type="button" className="boton boton--principal" onClick={nuevo}>
          Mazo nuevo
        </button>
        <button type="button" className="boton boton--plano" onClick={cerrar}>
          Cerrar
        </button>
      </div>

      {fallo && <p className="recado recado--mal">{fallo}</p>}
      {lista === null && <p className="cargando">Trayendo tus mazos…</p>}
      {lista?.length === 0 && <p>Todavía no tienes ningún mazo.</p>}

      <div className="mazos">
        {lista?.map((mazo) => (
          <button key={mazo.id} type="button" className="mazo__ficha" onClick={() => abrirMazo(mazo.id)}>
            <span className="mazo__portada">
              {mazo.portadaNombre && (
                <img src={portadaDe(mazo.portadaNombre, 'art_crop')} alt="" loading="lazy" />
              )}
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
