import { useEffect, useState, type FormEvent } from 'react'

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
} from './mazos'
import { porLote, type Carta } from './scryfall'

/** Un mapa vacío fijo, para no crear uno nuevo en cada pintado. */
const SIN_IMAGENES = new Map<string, Carta>()

/** La portada se pide por nombre: los mazos importados no traen su id. */
function direccionDePortada(nombre: string, recorte: 'art_crop' | 'normal'): string {
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nombre)}&format=image&version=${recorte}`
}

function Pila({
  carta,
  imagen,
  esPortada,
  ponerDePortada,
}: {
  carta: CartaDelMazo
  imagen: Carta | undefined
  esPortada: boolean
  ponerDePortada: () => void
}) {
  const copias = Array.from({ length: Math.min(carta.cantidad, 9) })

  return (
    <button
      type="button"
      className={esPortada ? 'pila pila--portada' : 'pila'}
      title={`${carta.cantidad} × ${carta.nombre} · pulsa para ponerla de portada`}
      onClick={ponerDePortada}
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

function Importar({ guardar }: { guardar: (cartas: CartaLeida[]) => Promise<void> }) {
  const [texto, setTexto] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const leido = texto.trim() ? interpretarLista(texto) : null

  async function meter(evento: FormEvent) {
    evento.preventDefault()
    if (!leido) return
    setTrabajando(true)
    await guardar(leido.cartas)
    setTrabajando(false)
    setTexto('')
  }

  return (
    <form onSubmit={meter} className="importar">
      <label className="campo">
        <span className="campo__nombre">Pega la lista</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder={'4 Lightning Bolt\n2 Island (EOE) 269\n\n// MAYBEBOARD\n1 Ponder'}
          spellCheck={false}
        />
      </label>

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
              {leido.perdidas.length} línea{leido.perdidas.length === 1 ? '' : 's'} sin entender:{' '}
              «{leido.perdidas[0]}»
            </span>
          )}
        </p>
      )}

      <button
        type="submit"
        className="boton boton--principal"
        disabled={trabajando || !leido || leido.cartas.length === 0}
      >
        {trabajando ? 'Metiendo…' : 'Reemplazar las cartas'}
      </button>
    </form>
  )
}

export function PantallaMazos({ idUsuario, cerrar }: { idUsuario: string; cerrar: () => void }) {
  const { lista, fallo, recargar } = useMazos()
  const [abiertoId, setAbiertoId] = useState<string | null>(null)
  const abierto = lista?.find((m) => m.id === abiertoId) ?? null
  const [vueltaCartas, setVueltaCartas] = useState(0)
  const cartas = useCartasDelMazo(abiertoId, vueltaCartas)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<Mazo | null>(null)

  const [traidas, setTraidas] = useState<{ para: string | null; mapa: Map<string, Carta> }>({
    para: null,
    mapa: SIN_IMAGENES,
  })
  const trayendo = !!abierto && traidas.para !== `${abierto.id}:${vueltaCartas}`

  useEffect(() => {
    if (!abierto || !cartas || cartas.length === 0) return
    let vigente = true
    const cual = `${abierto.id}:${vueltaCartas}`
    void (async () => {
      const encontradas = await porLote([...new Set(cartas.map((c) => c.nombre))])
      if (vigente) setTraidas({ para: cual, mapa: encontradas })
    })()
    return () => {
      vigente = false
    }
  }, [abierto, cartas, vueltaCartas])

  async function nuevo() {
    const nombre = window.prompt('¿Cómo se llama el mazo?')?.trim()
    if (!nombre) return
    const id = await crearMazo(idUsuario, nombre, 'Casual')
    recargar()
    if (id) setAbiertoId(id)
  }

  async function guardarCambios(evento: FormEvent) {
    evento.preventDefault()
    if (!borrador) return
    await guardarMazo(borrador)
    setEditando(false)
    recargar()
  }

  async function quitar() {
    if (!abierto) return
    if (!window.confirm(`¿Seguro que borras «${abierto.nombre}»? No se puede deshacer.`)) return
    await borrarMazo(abierto.id)
    setAbiertoId(null)
    recargar()
  }

  async function ponerPortada(nombre: string) {
    if (!abierto) return
    await guardarMazo({ ...abierto, portadaId: null, portadaNombre: nombre })
    recargar()
  }

  // ---- un mazo abierto ----
  if (abierto) {
    return (
      <section className="tarjeta">
        <div className="mazo__cabecera">
          <button
            type="button"
            className="boton boton--plano"
            onClick={() => {
              setAbiertoId(null)
              setEditando(false)
            }}
          >
            ← Mis mazos
          </button>
          <h2 className="mazo__nombre">{abierto.nombre}</h2>
          <span className="mazo__formato">{abierto.formato}</span>
          <button
            type="button"
            className="boton boton--plano"
            onClick={() => {
              setBorrador(abierto)
              setEditando((v) => !v)
            }}
          >
            {editando ? 'Dejarlo' : 'Editar'}
          </button>
        </div>

        {editando && borrador && (
          <>
            <form onSubmit={guardarCambios} className="mazo__forma">
              <label className="campo">
                <span className="campo__nombre">Nombre</span>
                <input
                  type="text"
                  value={borrador.nombre}
                  onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                  maxLength={80}
                  required
                />
              </label>
              <label className="campo campo--corto">
                <span className="campo__nombre">Formato</span>
                <input
                  type="text"
                  value={borrador.formato}
                  onChange={(e) => setBorrador({ ...borrador, formato: e.target.value })}
                  maxLength={40}
                />
              </label>
              <label className="campo">
                <span className="campo__nombre">Notas</span>
                <textarea
                  value={borrador.notas}
                  onChange={(e) => setBorrador({ ...borrador, notas: e.target.value })}
                  rows={2}
                />
              </label>
              <button type="submit" className="boton boton--principal">
                Guardar
              </button>
              <button type="button" className="boton boton--plano" onClick={quitar}>
                Borrar el mazo
              </button>
            </form>

            <h3 className="zona__titulo">Importar</h3>
            <Importar
              guardar={async (leidas) => {
                await guardarCartas(abierto.id, leidas)
                setVueltaCartas((v) => v + 1)
              }}
            />
          </>
        )}

        {abierto.notas && !editando && <p className="mazo__notas">{abierto.notas}</p>}
        {trayendo && <p className="cargando">Trayendo las cartas…</p>}

        {cartas?.length === 0 && (
          <p>Este mazo todavía no tiene cartas. Dale a «Editar» y pega la lista.</p>
        )}

        {cartas &&
          ZONAS.map(({ zona, nombre, explicacion }) => {
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
                      imagen={trayendo ? undefined : traidas.mapa.get(carta.nombre.toLowerCase())}
                      esPortada={abierto.portadaNombre === carta.nombre}
                      ponerDePortada={() => ponerPortada(carta.nombre)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
      </section>
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
          <button
            key={mazo.id}
            type="button"
            className="mazo"
            onClick={() => setAbiertoId(mazo.id)}
          >
            <span className="mazo__portada">
              {mazo.portadaNombre && (
                <img src={direccionDePortada(mazo.portadaNombre, 'art_crop')} alt="" loading="lazy" />
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
