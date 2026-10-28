import { useState, type FormEvent } from 'react'

import { useConsultas } from './consultas'
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
        <h3 className="carta__nombre">{carta.nombre}</h3>
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
}: {
  codigo: string
  enlazado: boolean
  nombreDelOtro: string | null
  enviarDato: (dato: unknown) => boolean
  alRecibirDato: (oyente: (dato: unknown) => void) => () => void
}) {
  const consultas = useConsultas({ codigo, enviarDato, alRecibirDato })

  const [escrito, setEscrito] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<Carta | null>(null)

  async function alBuscar(evento: FormEvent) {
    evento.preventDefault()
    setFallo(null)
    setBuscando(true)
    try {
      const carta = await buscar(escrito)
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
      <h2>Buscar una carta</h2>

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
