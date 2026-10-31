import { useEffect, useState, type FormEvent } from 'react'

import { idiomaElegido } from './ajustes'
import { useConsultas } from './consultas'
import { leerNombres, leerSenas } from './ocr'
import { adivinar, buscar, porNumero, type Carta } from './scryfall'

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
  /** Lo que el lector ha sacado de la foto, acierte o no. */
  const [leido, setLeido] = useState<string[]>([])

  // Al llegar una foto, se intenta leer el nombre y buscarla sola. Si no
  // sale, no pasa nada: la foto se queda ahí y el buscador está al lado.
  useEffect(() => {
    if (!foto) return
    let vigente = true
    setLeyendo(true)
    setFallo(null)
    void (async () => {
      // PRIMERO LAS SEÑAS DE ABAJO A LA IZQUIERDA, no el nombre (Héctor,
      // 31/10/2026). Son dígitos y mayúsculas de palo sobre fondo liso, o
      // sea lo único que un lector de texto hace bien, y dan la carta
      // EXACTA: esa edición y ese número, no «una que se llama parecido».
      // Además valen igual con una carta en japonés.
      for (const senas of await leerSenas(foto)) {
        if (!vigente) return
        try {
          const carta = await porNumero(senas.edicion, senas.numero, idiomaElegido())
          if (!vigente) return
          consultas.apuntar(carta, true)
          setAbierta(carta)
          setLeyendo(false)
          return
        } catch {
          // Esa combinación no existe. Se prueba la siguiente, y si no
          // queda ninguna se pasa a leer el nombre, que es lo que vale
          // para las cartas de antes de 2015: no llevan número.
        }
      }
      if (!vigente) return

      const candidatos = await leerNombres(foto)
      if (!vigente) return
      // SE ENSEÑA SIEMPRE LO LEÍDO, acierte o no. Si falla, es lo único
      // que dice si el problema es que lee mal o que busca mal, y además
      // te deja corregir una letra y darle a Buscar en vez de teclear el
      // nombre entero (Héctor, 29/10/2026: «no pilla ni una»).
      setLeido(candidatos)
      if (candidatos[0]) setEscrito(candidatos[0])

      if (candidatos.length === 0) {
        setLeyendo(false)
        setFallo('No he sabido leer nada. Míralo en la foto y búscalo aquí.')
        return
      }
      // Se prueban en orden hasta que una sea una carta de verdad: no hay
      // forma de saber cuál de las líneas leídas es el nombre, y el que
      // sabe qué es una carta es Scryfall, no el lector.
      for (const candidato of candidatos) {
        const carta = await adivinar(candidato, idiomaElegido())
        if (!vigente) return
        if (carta) {
          consultas.apuntar(carta, true)
          setAbierta(carta)
          setLeyendo(false)
          return
        }
      }
      if (vigente) {
        setLeyendo(false)
        setFallo('He leído esto, pero no encuentro ninguna carta así:')
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

      {leido.length > 0 && !abierta && (
        <ul className="leido">
          {leido.map((linea) => (
            <li key={linea}>
              <button type="button" className="leido__linea" onClick={() => setEscrito(linea)}>
                «{linea}»
              </button>
            </li>
          ))}
        </ul>
      )}

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
