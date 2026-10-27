import { useState, type FormEvent } from 'react'

import { useMesa } from './mesa'

/**
 * La mesa: el sitio al que llegáis los dos.
 *
 * Todavía no hay vídeo. Lo que se comprueba aquí es que los dos os
 * encontráis y que el camino entre vosotros está abierto y es rápido. Sin
 * eso, el vídeo de la fase 3 no tendría por dónde empezar.
 */
export function PantallaMesa({ nombre }: { nombre: string }) {
  const { estado, codigo, jugadores, motivo, retardo, crear, entrar, cerrar, medirRetardo } =
    useMesa(nombre)
  const [escrito, setEscrito] = useState('')
  const [copiado, setCopiado] = useState(false)

  async function unirse(evento: FormEvent) {
    evento.preventDefault()
    await entrar(escrito)
  }

  async function copiarCodigo() {
    if (!codigo) return
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Algunos navegadores no dejan copiar sin un gesto claro. No pasa
      // nada: el código está en pantalla, se puede dictar.
    }
  }

  if (estado === 'fuera' || estado === 'caida') {
    return (
      <section className="tarjeta">
        <h2>La mesa</h2>
        <p>
          Uno de los dos crea la mesa y le dicta el código al otro. Da igual quién.
        </p>

        {motivo && <p className="recado recado--mal">{motivo}</p>}

        <div className="mesa__opciones">
          <button type="button" className="boton boton--principal" onClick={crear}>
            Crear una mesa
          </button>

          <form onSubmit={unirse} className="mesa__unirse">
            <label className="campo">
              <span className="campo__nombre">…o entrar con un código</span>
              <input
                type="text"
                value={escrito}
                onChange={(e) => setEscrito(e.target.value.toUpperCase())}
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                placeholder="ABCD"
                className="campo__codigo"
              />
            </label>
            <button type="submit" className="boton boton--plano" disabled={escrito.length < 4}>
              Entrar
            </button>
          </form>
        </div>
      </section>
    )
  }

  if (estado === 'conectando') {
    return (
      <section className="tarjeta">
        <h2>La mesa</h2>
        <p className="cargando">Buscando la mesa…</p>
      </section>
    )
  }

  const solo = jugadores.length < 2

  return (
    <section className="tarjeta">
      <h2>La mesa</h2>

      <div className="mesa__codigo">
        <span className="mesa__codigo__etiqueta">Código</span>
        <strong className="mesa__codigo__valor">{codigo}</strong>
        <button type="button" className="boton boton--plano" onClick={copiarCodigo}>
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <ul className="mesa__jugadores">
        {jugadores.map((j) => (
          <li key={j.id} className="mesa__jugador">
            <span className="mesa__jugador__punto" aria-hidden="true" />
            {j.nombre}
          </li>
        ))}
        {solo && (
          <li className="mesa__jugador mesa__jugador--hueco">
            <span className="mesa__jugador__punto mesa__jugador__punto--vacio" aria-hidden="true" />
            Esperando a tu rival…
          </li>
        )}
      </ul>

      <p className={solo ? 'resumen' : 'resumen resumen--bien'}>
        {solo
          ? 'Dícta­le el código y entrará aquí mismo.'
          : 'Estáis los dos. El camino entre vosotros está abierto.'}
      </p>

      <div className="mesa__pruebas">
        <button type="button" className="boton boton--plano" onClick={medirRetardo}>
          Probar el enlace
        </button>
        {retardo !== null && (
          <span className="mesa__retardo">
            Ida y vuelta: <strong>{retardo} ms</strong>
          </span>
        )}
      </div>

      {motivo && <p className="recado recado--mal">{motivo}</p>}

      <button type="button" className="boton boton--plano" onClick={cerrar}>
        Salir de la mesa
      </button>
    </section>
  )
}
