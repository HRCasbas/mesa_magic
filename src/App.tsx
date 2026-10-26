import { PantallaDentro } from './PantallaDentro'
import { PantallaEntrada } from './PantallaEntrada'
import { useSesion } from './sesion'

/**
 * Lo unico que decide esta pantalla es si hay sesion o no.
 *
 * Sin sesion no se pinta nada de dentro, ni siquiera a medias: no es que
 * este escondido, es que no llega a existir. Y lo que de verdad protege los
 * datos no es esto, es RLS en la base; esto solo evita ensenar una pantalla
 * vacia a quien no ha entrado.
 */
export function App() {
  const { cargando, sesion, jugador, recargarJugador } = useSesion()

  // Un instante, mientras Supabase recupera la sesion guardada. Sin esto, a
  // quien ya habia entrado le parpadearia la pantalla de entrada delante.
  if (cargando) {
    return (
      <main className="entrada">
        <p className="cargando">Abriendo…</p>
      </main>
    )
  }

  if (!sesion) {
    return <PantallaEntrada />
  }

  return (
    <PantallaDentro
      idUsuario={sesion.user.id}
      jugador={jugador}
      recargarJugador={recargarJugador}
    />
  )
}
