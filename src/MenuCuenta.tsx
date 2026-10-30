import { useEffect, useRef, useState } from 'react'

import { avatarDe } from './avatar'
import { supabase } from './supabase'

/**
 * El menú de la cuenta, arriba a la derecha.
 *
 * Aquí va todo lo que es tuyo y no de la partida: los mazos, la clave y la
 * salida. Con la foto puesta se ve la foto; sin ella, la inicial.
 */
export function MenuCuenta({
  nombre,
  avatar,
  cambiarClave,
  abrirAjustes,
  abrirMazos,
  abrirHistorial,
}: {
  nombre: string
  avatar: string | null
  cambiarClave: () => void
  abrirAjustes: () => void
  abrirMazos: () => void
  abrirHistorial: () => void
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
        <img className="cuenta__avatar" src={avatarDe(nombre, avatar)} alt="" />
        <span className="cuenta__nombre">{nombre}</span>
      </button>

      {abierto && (
        <div className="cuenta__menu">
          <button
            type="button"
            className="cuenta__opcion"
            onClick={() => {
              setAbierto(false)
              abrirMazos()
            }}
          >
            Mis mazos
          </button>
          <button
            type="button"
            className="cuenta__opcion"
            onClick={() => {
              setAbierto(false)
              abrirHistorial()
            }}
          >
            Historial
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
