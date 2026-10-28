import { useState, type FormEvent } from 'react'

import { useConsultas } from './consultas'
import { IDIOMAS, porNombre, porNumero, type Carta } from './scryfall'

function Grande({
  carta,
  puedeCompartir,
  compartir,
}: {
  carta: Carta
  puedeCompartir: boolean
  compartir: () => void
}) {
  const [compartida, setCompartida] = useState(false)

  return (
    <div className="carta">
      {carta.imagen ? (
        <img className="carta__imagen" src={carta.imagen} alt={carta.nombre} />
      ) : (
        <p className="carta__sinimagen">Esta carta no tiene imagen en Scryfall.</p>
      )}

      <div className="carta__datos">
        <h3 className="carta__nombre">{carta.nombre}</h3>
        {carta.nombreImpreso && <p className="carta__impreso">Impresa como «{carta.nombreImpreso}»</p>}
        <p className="carta__edicion">
          {carta.edicionNombre} · {carta.edicion} {carta.numero}
        </p>
        <div className="carta__botones">
          <a className="boton boton--plano" href={carta.pagina} target="_blank" rel="noreferrer">
            Leerla en Scryfall
          </a>
          {puedeCompartir && (
            <button
              type="button"
              className="boton boton--plano"
              onClick={() => {
                compartir()
                setCompartida(true)
                setTimeout(() => setCompartida(false), 2000)
              }}
            >
              {compartida ? 'Enviada' : 'Enseñársela'}
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

  const [porNumeroAhora, setPorNumeroAhora] = useState(false)
  const [nombre, setNombre] = useState('')
  const [edicion, setEdicion] = useState('')
  const [numero, setNumero] = useState('')
  const [idioma, setIdioma] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<Carta | null>(null)

  async function buscar(evento: FormEvent) {
    evento.preventDefault()
    setFallo(null)
    setBuscando(true)
    try {
      const carta = porNumeroAhora
        ? await porNumero(edicion, numero, idioma)
        : await porNombre(nombre)
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
      <p>
        Lo que mires aquí <strong>es tuyo y no lo ve nadie</strong>, igual que no se ve lo que
        piensas. Si quieres enseñarle una a {nombreDelOtro ?? 'tu rival'}, hay un botón para eso.
      </p>

      <div className="consultas__modos">
        <button
          type="button"
          className={porNumeroAhora ? 'boton boton--plano' : 'boton boton--principal'}
          onClick={() => setPorNumeroAhora(false)}
        >
          Por el nombre
        </button>
        <button
          type="button"
          className={porNumeroAhora ? 'boton boton--principal' : 'boton boton--plano'}
          onClick={() => setPorNumeroAhora(true)}
        >
          Por el número
        </button>
      </div>

      <form onSubmit={buscar} className="consultas__forma">
        {porNumeroAhora ? (
          <>
            <label className="campo campo--corto">
              <span className="campo__nombre">Edición</span>
              <input
                type="text"
                value={edicion}
                onChange={(e) => setEdicion(e.target.value.toUpperCase())}
                placeholder="NEO"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>
            <label className="campo campo--corto">
              <span className="campo__nombre">Número</span>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="123"
                maxLength={8}
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>
            <label className="campo campo--corto">
              <span className="campo__nombre">Idioma</span>
              <select value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                {IDIOMAS.map((i) => (
                  <option key={i.codigo} value={i.codigo}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className="campo">
            <span className="campo__nombre">Nombre de la carta</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Lightning Bolt"
              required
            />
          </label>
        )}

        <button type="submit" className="boton boton--principal" disabled={buscando}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      <p className="aviso aviso--suelto">
        {porNumeroAhora ? (
          <>
            Abajo a la izquierda de la carta: <strong>el número y las letras de la edición</strong>.
            Son los mismos en todos los idiomas, así que esto vale para una carta japonesa aunque no
            sepas cómo se llama. Las cartas de antes de 2003, más o menos, no lo llevan.
          </>
        ) : (
          <>
            Perdona <strong>un</strong> fallo al escribir, no dos. Si no sale, prueba por el número.
          </>
        )}
      </p>

      {fallo && <p className="recado recado--mal">{fallo}</p>}

      {abierta && (
        <Grande
          carta={abierta}
          puedeCompartir={enlazado}
          compartir={() => consultas.compartir(abierta)}
        />
      )}

      {consultas.lista.length > 0 && (
        <>
          <h3 className="consultas__cabecera">Lo que has mirado</h3>
          <ul className="consultas">
            {consultas.lista.map((c) => (
              <li key={c.id} className={c.mia ? 'consulta' : 'consulta consulta--suya'}>
                <button
                  type="button"
                  className="consulta__abrir"
                  onClick={() => setAbierta(c.carta)}
                >
                  {c.carta.imagen && (
                    <img className="consulta__miniatura" src={c.carta.imagen} alt="" />
                  )}
                  <span className="consulta__nombre">
                    {c.carta.nombre}
                    {!c.mia && (
                      <span className="consulta__quien">
                        te la enseñó {nombreDelOtro ?? 'tu rival'}
                      </span>
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
          <button type="button" className="boton boton--plano" onClick={consultas.limpiar}>
            Vaciar la lista
          </button>
        </>
      )}
    </section>
  )
}
