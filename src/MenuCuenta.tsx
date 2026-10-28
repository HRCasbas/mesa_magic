import { useEffect, useRef, useState } from 'react'

import { supabase } from './supabase'

/**
 * El menú de la cuenta, arriba a la derecha.
 *
 * Aquí va todo lo que es tuyo y no de la partida: los mazos, la clave y la
 * salida. El avatar todavía no existe (fase 7), así que de momento es la
 * primera letra de tu nombre.
 */
export function MenuCuenta({
  nombre,
  cambiarClave,
  abrirAjustes,
}: {
  nombre: string
  cambiarClave: () => void
  abrirAjustes: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  // Cerrarlo al tocar fuera, que es lo que todo el mundo intenta.
  useEffect(() => {
    if (!abierto) return
    function fuera(evento: MouseEvent) {
      if (caja.current && !caja.current.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  return (
    <div className="cuenta" ref={caja}>
      <button
        type="button"
        className="cuenta__boton"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span className="cuenta__avatar" aria-hidden="true">
          {nombre.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <span className="cuenta__nombre">{nombre}</span>
      </button>

      {abierto && (
        <div className="cuenta__menu">
          <button type="button" className="cuenta__opcion" disabled>
            Mis mazos
            <span className="cuenta__pronto">pronto</span>
          </button>
          <button
            type="button"
            className="cuenta__opcion"
            onClick={() => {
              setAbierto(false)
              abrirAjustes()
            }}
          >
            Ajustes
          </button>
          <button
            type="button"
            className="cuenta__opcion"
            onClick={() => {
              setAbierto(false)
              cambiarClave()
            }}
          >
            Cambiar mi clave
          </button>
          <button
            type="button"
            className="cuenta__opcion cuenta__opcion--salir"
            onClick={() => supabase.auth.signOut()}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
