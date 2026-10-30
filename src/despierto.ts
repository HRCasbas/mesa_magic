import { useEffect } from 'react'

/**
 * Mantener la pantalla encendida mientras se juega.
 *
 * SIN ESTO NO SE PUEDE JUGAR CON EL MÓVIL. Un teléfono apuntando a la
 * mesa está quieto: nadie lo toca durante minutos, y a los treinta
 * segundos se apaga la pantalla y con ella se va la cámara. Daba igual lo
 * bien que fuera todo lo demás.
 *
 * El navegador solo lo concede **mientras la pestaña está delante**, y lo
 * suelta solo al cambiar de aplicación. Por eso hay que volver a pedirlo
 * cada vez que se vuelve: sin esa segunda parte, basta con mirar un
 * mensaje a media partida para quedarse sin ello.
 *
 * No está en todos los navegadores. Donde no está, no pasa nada: se juega
 * igual y la pantalla se apaga como siempre.
 */
export function usePantallaDespierta(activo: boolean) {
  useEffect(() => {
    if (!activo || !('wakeLock' in navigator)) return

    let vivo = true
    let permiso: WakeLockSentinel | null = null

    async function pedir() {
      if (!vivo || document.visibilityState !== 'visible') return
      try {
        permiso = await navigator.wakeLock.request('screen')
      } catch {
        // El navegador puede negarse (batería baja, por ejemplo). No es
        // grave: solo significa que la pantalla se apagará como siempre.
      }
    }

    function alVolver() {
      if (document.visibilityState === 'visible') void pedir()
    }

    void pedir()
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', alVolver)
      void permiso?.release()
    }
  }, [activo])
}
