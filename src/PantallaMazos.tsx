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
import { porLote, porNombre, type Carta } from './scryfall'

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
const TIERRAS_BASICAS = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
  'llanura', 'isla', 'pantano', 'montaña', 'bosque',
])

/** Si una carta es tierra, con lo que se sepa de ella. */
function esTierra(carta: CartaDelMazo, fotos: Map<string, Carta>): boolean {
  return pesoDe(carta, fotos.get(carta.nombre.toLowerCase())).tierra
}

/** El coste y si es tierra, con lo que se sepa de cada carta. */
function pesoDe(carta: CartaDelMazo, foto: Carta | undefined) {
  if (foto) return { tierra: foto.esTierra, coste: foto.coste }
  // Todavía no ha llegado de Scryfall. Las tierras básicas se reconocen
  // por el nombre y van a su sitio igual; el resto espera al final, para
  // que la lista no dé un salto raro cuando llegue la respuesta.
  return { tierra: TIERRAS_BASICAS.has(carta.nombre.trim().toLowerCase()), coste: 99 }
}

function porCoste(deLaZona: CartaDelMazo[], fotos: Map<string, Carta>): CartaDelMazo[] {
  return [...deLaZona].sort((una, otra) => {
    const a = pesoDe(una, fotos.get(una.nombre.toLowerCase()))
    const b = pesoDe(otra, fotos.get(otra.nombre.toLowerCase()))
    if (a.tierra !== b.tierra) return a.tierra ? 1 : -1
    if (a.coste !== b.coste) return a.coste - b.coste
    return una.nombre.localeCompare(otra.nombre)
  })
}

/**
 * «¿Esta carta, y cuántas?»
 *
 * Se enseña la carta **grande** porque en Magic hay nombres que se parecen
 * mucho, y una vez metida en el mazo el error no se ve: la lista son
 * nombres. Mirando la ilustración se sabe al instante si es la que se
 * quería.
 */
function ConfirmarCarta({
  carta,
  zona,
  anadir,
  cancelar,
}: {
  carta: Carta
  zona: string
  anadir: (cuantas: number) => void
  cancelar: () => void
}) {
  const [cuantas, setCuantas] = useState(1)

  return (
    <div className="dialogo">
      <div className="dialogo__caja dialogo__caja--carta">
        {carta.imagen && <img className="confirmar__carta" src={carta.imagen} alt="" />}
        <div className="confirmar__texto">
          <h3 className="confirmar__nombre">{carta.nombre}</h3>
          <p className="confirmar__donde">
            {carta.edicionNombre} · a {zona.toLowerCase()}
          </p>
          <label className="campo">
            <span className="campo__nombre">Cuántas</span>
            <input
              type="number"
              min={1}
              max={99}
              value={cuantas}
              onChange={(e) => setCuantas(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
            />
          </label>
          <div className="dialogo__botones">
            <button
              type="button"
              className="boton boton--principal"
              onClick={() => anadir(cuantas)}
            >
              Añadir
            </button>
            <button type="button" className="boton boton--plano" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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
  const [modificando, setModificando] = useState(false)
  /** La carta encontrada, esperando que se diga que sí y cuántas. */
  const [porConfirmar, setPorConfirmar] = useState<Carta | null>(null)
  const [buscandoCarta, setBuscandoCarta] = useState(false)
  const [noExiste, setNoExiste] = useState<string | null>(null)
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

  /**
   * Buscar la carta antes de meterla.
   *
   * ANTES SE METÍA LO ESCRITO TAL CUAL (Héctor, 30/10/2026: «no añadas un
   * recuadro vacío con lo escrito»). Una errata entraba en el mazo como
   * una carta más, sin foto y sin que nada avisara, y ahí se quedaba.
   * Ahora se pregunta a Scryfall: si no existe, se dice; y si existe, se
   * enseña grande para que se vea que es esa y no otra que se llama
   * parecido, que en Magic pasa mucho.
   */
  async function buscarParaAnadir(evento: FormEvent) {
    evento.preventDefault()
    const escrito = nueva.trim()
    if (!escrito || buscandoCarta) return
    setNoExiste(null)
    setBuscandoCarta(true)
    try {
      setPorConfirmar(await porNombre(escrito))
    } catch {
      setNoExiste(escrito)
    }
    setBuscandoCarta(false)
  }

  /** Ya dicho que sí: entra en el mazo con su nombre de verdad. */
  function anadirYa(nombre: string, cuantas: number, zona: Zona) {
    setPorConfirmar(null)
    setNueva('')
    const ya = cartas.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase() && c.zona === zona)
    if (ya) {
      void aplicar(cartas.map((c) => (c.id === ya.id ? { ...c, cantidad: c.cantidad + cuantas } : c)))
      return
    }
    const orden = cartas.filter((c) => c.zona === zona).length + 1
    void aplicar([
      ...cartas,
      { id: crypto.randomUUID(), nombre, cantidad: cuantas, zona, orden },
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

  /**
   * Lo que se pinta a la derecha, en orden.
   *
   * **Las tierras van en su propia sección, al final del mazo** (Héctor,
   * 30/10/2026). Así es como se mira un mazo: primero los hechizos por
   * coste, y las tierras aparte, que ni se pagan ni se cuentan igual. Y de
   * paso se ve de un vistazo cuántas lleva, que es el número que de verdad
   * se mira al afinar un mazo.
   */
  function bloquesDe(todas: CartaDelMazo[]) {
    const salida: {
      clave: string
      nombre: string
      explicacion: string
      cartas: CartaDelMazo[]
    }[] = []

    for (const { zona, nombre, explicacion } of ZONAS) {
      const deAqui = porCoste(
        todas.filter((c) => c.zona === zona),
        fotos.mapa,
      )
      if (deAqui.length === 0) continue
      const tierras = deAqui.filter((c) => esTierra(c, fotos.mapa))
      const resto = deAqui.filter((c) => !esTierra(c, fotos.mapa))
      if (resto.length > 0) salida.push({ clave: zona, nombre, explicacion, cartas: resto })
      if (tierras.length > 0) {
        salida.push({
          clave: zona + ':tierras',
          nombre: 'Tierras',
          explicacion: '',
          cartas: tierras,
        })
      }
    }
    return salida
  }

  // ---- un mazo abierto ----
  if (abierto) {
    const datos = borrador?.id === abierto.id ? borrador : abierto
    const bloques = bloquesDe(cartas)
    return (
      <>
        <div className="mazo">
          <aside className="mazo__lado">
            <div className="mazo__arriba">
              <button
                type="button"
                className="boton boton--atras"
                onClick={() => abrirMazo(null)}
              >
                ← Mis mazos
              </button>
              {/* El engranaje cambia la columna entera de mirar a
                  modificar. Mirando un mazo no se toca nada de esto, y
                  tenerlo siempre puesto obligaba a desplazar la columna
                  (Héctor, 30/10/2026). */}
              <button
                type="button"
                className={modificando ? 'engranaje engranaje--puesto' : 'engranaje'}
                onClick={() => setModificando((v) => !v)}
                aria-pressed={modificando}
                aria-label={modificando ? 'Dejar de modificar' : 'Modificar el mazo'}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Zm0-5A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5Z"
                  />
                  <path
                    fill="currentColor"
                    d="M13.6 22h-3.2l-.3-2.3a7.9 7.9 0 0 1-1.6-.9l-2.1.9-1.6-2.8 1.8-1.4a8 8 0 0 1 0-1.9l-1.8-1.4 1.6-2.8 2.1.9a7.9 7.9 0 0 1 1.6-.9L10.4 7h3.2l.3 2.3a7.9 7.9 0 0 1 1.6.9l2.1-.9 1.6 2.8-1.8 1.4a8 8 0 0 1 0 1.9l1.8 1.4-1.6 2.8-2.1-.9a7.9 7.9 0 0 1-1.6.9Z"
                    opacity=".3"
                  />
                </svg>
              </button>
            </div>

            {abierto.portadaNombre && (
              <img
                className="mazo__grande"
                src={portadaDe(abierto.portadaNombre, 'normal')}
                alt=""
              />
            )}

            {!modificando && (
              <div className="mazo__datos">
                <h2 className="mazo__nombre">{abierto.nombre}</h2>
                <p className="mazo__formato">{abierto.formato}</p>
                {abierto.notas && <p className="mazo__notas">{abierto.notas}</p>}
              </div>
            )}

            {modificando && (
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
            )}

            {modificando && (
            <form onSubmit={buscarParaAnadir} className="mazo__anadir">
              <label className="campo">
                <span className="campo__nombre">Añadir carta</span>
                <input
                  type="text"
                  value={nueva}
                  onChange={(e) => {
                    setNueva(e.target.value)
                    setNoExiste(null)
                  }}
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
              <button type="submit" className="boton boton--plano" disabled={buscandoCarta}>
                {buscandoCarta ? 'Buscando…' : 'Buscar'}
              </button>
              {noExiste && (
                <p className="recado recado--mal">No existe ninguna carta así: «{noExiste}».</p>
              )}
            </form>
            )}

            {modificando && (
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
            )}
          </aside>

          <div className="mazo__cartas">
            {trayendo && <p className="cargando">Trayendo las cartas…</p>}
            {cartas.length === 0 && !trayendo && (
              <p>Este mazo no tiene cartas. Añádelas o importa la lista.</p>
            )}

            {bloques.map(({ clave, nombre, explicacion, cartas: deAqui }) => {
              const cuantas = deAqui.reduce((suma, c) => suma + c.cantidad, 0)
              return (
                <section key={clave} className="zona">
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

        {porConfirmar && (
          <ConfirmarCarta
            carta={porConfirmar}
            zona={ZONAS.find((z) => z.zona === zonaNueva)?.nombre ?? 'el mazo'}
            anadir={(cuantas) => anadirYa(porConfirmar.nombre, cuantas, zonaNueva)}
            cancelar={() => setPorConfirmar(null)}
          />
        )}
      </>
    )
  }

  // ---- la lista ----
  return (
    <section className="tarjeta">
      <button type="button" className="boton boton--atras" onClick={cerrar}>
        ← Atrás
      </button>
      <div className="mazo__cabecera">
        <h2 className="mazo__nombre">Mis mazos</h2>
        <button type="button" className="boton boton--principal" onClick={nuevo}>
          Mazo nuevo
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
