import { useEffect, useState, type FormEvent } from 'react'

import { idiomaElegido } from './ajustes'
import { useConsultas } from './consultas'
import { leerNombre } from './ocr'
import { buscar, type Carta } from './scryfall'

function Grande({
  carta,
  puedeCompartir,
  compartir,
}: {
  carta: Carta
  puedeCompartir: boolean
  compartir: () => void
}) {
  const [enviada, setEnviada] = useState(false)

  return (
    <div className="carta">
      {carta.imagen && <img className="carta__imagen" src={carta.imagen} alt={carta.nombre} />}
      <div className="carta__datos">
        {/* Si la tienes en tu idioma, manda el nombre impreso; el inglés
            va debajo, que es el que sirve para buscar en cualquier sitio. */}
        <h3 className="carta__nombre">{carta.nombreImpreso ?? carta.nombre}</h3>
        {carta.nombreImpreso && <p className="carta__edicion">{carta.nombre}</p>}
        <p className="carta__edicion">
          {carta.edicion} {carta.numero}
        </p>
        <div className="carta__botones">
          <a className="boton boton--plano" href={carta.pagina} target="_blank" rel="noreferrer">
            Scryfall
          </a>
          {puedeCompartir && (
            <button
              type="button"
              className="boton boton--plano"
              onClick={() => {
                compartir()
                setEnviada(true)
                setTimeout(() => setEnviada(false), 2000)
              }}
            >
              {enviada ? 'Enviada' : 'Enviar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function PantallaConsultas({
  codigo,
  enlazado,
  nombreDelOtro,
  enviarDato,
  alRecibirDato,
  apuntando,
  alternarApuntar,
  foto,
  esperandoFoto,
  falloFoto,
  cerrarFoto,
}: {
  codigo: string
  enlazado: boolean
  nombreDelOtro: string | null
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
  apuntando: boolean
  alternarApuntar: () => void
  foto: string | null
  esperandoFoto: boolean
  falloFoto: string | null
  cerrarFoto: () => void
}) {
  const consultas = useConsultas({ codigo, enviarDato, alRecibirDato })

  const [escrito, setEscrito] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<Carta | null>(null)
  const [leyendo, setLeyendo] = useState(false)

  // Al llegar una foto, se intenta leer el nombre y buscarla sola. Si no
  // sale, no pasa nada: la foto se queda ahí y el buscador está al lado.
  useEffect(() => {
    if (!foto) return
    let vigente = true
    setLeyendo(true)
    setFallo(null)
    void (async () => {
      const nombre = await leerNombre(foto)
      if (!vigente) return
      if (!nombre) {
        setLeyendo(false)
        setFallo('No he sabido leer el nombre. Míralo en la foto y búscalo aquí.')
        return
      }
      try {
        const carta = await buscar(nombre, idiomaElegido())
        if (!vigente) return
        consultas.apuntar(carta, true)
        setAbierta(carta)
      } catch {
        if (vigente) setFallo(`He leído «${nombre}», pero no encuentro esa carta.`)
      } finally {
        if (vigente) setLeyendo(false)
      }
    })()
    return () => {
      vigente = false
    }
    // `consultas.apuntar` es estable; meterlo aquí repetiría la lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto])

  async function alBuscar(evento: FormEvent) {
    evento.preventDefault()
    setFallo(null)
    setBuscando(true)
    try {
      const carta = await buscar(escrito, idiomaElegido())
      consultas.apuntar(carta, true)
      setAbierta(carta)
    } catch (error) {
      setFallo(error instanceof Error ? error.message : 'No ha salido.')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Las cartas</h2>

      <button
        type="button"
        className={apuntando ? 'boton boton--principal' : 'boton boton--plano'}
        onClick={alternarApuntar}
      >
        {apuntando ? 'Encuadra la carta…' : 'Ampliar una carta'}
      </button>
      {apuntando && (
        <p className="aviso aviso--suelto">Arrastra un recuadro alrededor de la carta.</p>
      )}
      {esperandoFoto && <p className="cargando">Pidiéndola…</p>}
      {leyendo && <p className="cargando">Leyendo el nombre…</p>}
      {falloFoto && <p className="recado recado--mal">{falloFoto}</p>}
      {foto && (
        <div className="foto">
          <img className="foto__imagen" src={foto} alt="La carta, de cerca" />
          <button type="button" className="boton boton--plano" onClick={cerrarFoto}>
            Quitar
          </button>
        </div>
      )}

      <form onSubmit={alBuscar} className="consultas__forma">
        <input
          type="text"
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          placeholder="Lightning Bolt — o — NEO 123"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <button type="submit" className="boton boton--principal" disabled={buscando}>
          {buscando ? '…' : 'Buscar'}
        </button>
      </form>

      {fallo && <p className="recado recado--mal">{fallo}</p>}

      {abierta && (
        <Grande
          carta={abierta}
          puedeCompartir={enlazado}
          compartir={() => consultas.compartir(abierta)}
        />
      )}

      {consultas.lista.length > 0 && (
        <ul className="consultas">
          {consultas.lista.map((c) => (
            <li key={c.id} className={c.mia ? 'consulta' : 'consulta consulta--suya'}>
              <button type="button" className="consulta__abrir" onClick={() => setAbierta(c.carta)}>
                {c.carta.imagen && (
                  <img className="consulta__miniatura" src={c.carta.imagen} alt="" />
                )}
                <span className="consulta__nombre">
                  {c.carta.nombre}
                  {!c.mia && (
                    <span className="consulta__quien">de {nombreDelOtro ?? 'tu rival'}</span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="tecla"
                onClick={() => consultas.quitar(c.id)}
                aria-label="Quitar de la lista"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
