import { createClient } from '@supabase/supabase-js'

// La direccion y la clave publicable viven aqui, a la vista, y no pasa nada:
// la clave publicable esta PENSADA para ir dentro de la web, igual que la
// direccion. Lo que protege los datos no es esconderla, es RLS en la base,
// que decide fila a fila quien puede ver que. Si esta clave se filtrara, un
// desconocido no podria hacer mas de lo que ya puede hacer abriendo la web.
//
// La clave que NO puede salir de Supabase nunca es la de servicio
// (`service_role`), que se salta RLS. Esa no esta aqui ni va a estarlo.
const DIRECCION = 'https://jwumnclmdsvcdkbsvikq.supabase.co'
const CLAVE_PUBLICABLE = 'sb_publishable_dtVvuYMqKCN-omXiBQrEZg_M3hUrA_K'

/**
 * Si hemos llegado pulsando el enlace de «clave nueva» del correo.
 *
 * Se mira AQUI ARRIBA, antes de crear el cliente, y no mas tarde: al
 * crearse, Supabase lee ese trozo de la direccion y lo borra. Si se mirara
 * despues ya no habria nada que mirar, y no sabriamos que la persona viene
 * a cambiar la clave.
 */
const LO_QUE_TRAE_LA_DIRECCION = `${window.location.hash.slice(1)}&${window.location.search.slice(1)}`

export const VENIMOS_DE_RECUPERAR = LO_QUE_TRAE_LA_DIRECCION.includes('type=recovery')

/**
 * El fallo que trae el enlace del correo, si lo trae.
 *
 * Supabase, cuando un enlace no vale, NO avisa: devuelve a la web con el
 * motivo escondido en la direccion. Sin leerlo aqui, la persona pulsa el
 * enlace del correo y acaba en la pantalla de entrada sin que nadie le
 * diga por que. Paso de verdad el 28/10/2026.
 */
export const FALLO_DEL_ENLACE: string | null = (() => {
  const trozos = new URLSearchParams(LO_QUE_TRAE_LA_DIRECCION)
  const codigo = trozos.get('error_code') ?? ''
  const explicacion = trozos.get('error_description') ?? trozos.get('error') ?? ''
  if (!codigo && !explicacion) return null

  if (codigo.includes('otp_expired') || explicacion.toLowerCase().includes('expired')) {
    return 'Ese enlace ya no vale: ha caducado o se ha usado antes. Pide otro y pulsalo cuanto antes.'
  }
  if (codigo.includes('access_denied')) {
    return 'Ese enlace no vale. Pide otro correo y pulsa el enlace nuevo.'
  }
  return `El enlace del correo ha fallado: ${explicacion || codigo}`
})()

// Este proyecto de Supabase lo comparte Magic con la web de Pokemon de
// Hector. Lo de Magic vive en el esquema `magic`; `public` es de Pokemon y
// no se toca. Fijando el esquema aqui, ninguna consulta se despista.
export const supabase = createClient(DIRECCION, CLAVE_PUBLICABLE, {
  db: { schema: 'magic' },
  auth: {
    // Que la sesion aguante un cierre de navegador: no se entra cada vez.
    persistSession: true,
    autoRefreshToken: true,
    // POR QUE `implicit` Y NO EL DE FABRICA (28/10/2026). El moderno (PKCE)
    // guarda media llave en el navegador DESDE EL QUE SE PIDIO el correo, y
    // el enlace solo funciona en ese mismo navegador. Pero un enlace de un
    // correo se abre donde le pille a uno: en el movil, en otro navegador,
    // en el visor del correo. Cuando eso pasa, el enlace no vale y
    // Supabase te devuelve a la puerta sin decir nada.
    // Con `implicit`, el enlace se basta solo y funciona abra donde se
    // abra, que es lo que hace falta aqui. A cambio, la llave viaja en la
    // direccion; para esta web, con dos cuentas, es un cambio que merece
    // la pena.
    flowType: 'implicit',
  },
})

/** Pasa los errores de Supabase, que vienen en ingles, a castellano llano. */
export function mensajeDeError(error: { message?: string } | null): string {
  const original = error?.message ?? ''
  const texto = original.toLowerCase()

  if (texto.includes('invalid login credentials')) {
    return 'El correo o la clave no son correctos.'
  }
  if (texto.includes('email not confirmed')) {
    return 'Falta confirmar el correo. Mira el mensaje que te mandamos.'
  }
  if (texto.includes('signups not allowed') || texto.includes('signup_disabled')) {
    return 'El registro está cerrado en el servidor. Hay que abrirlo en Supabase.'
  }
  if (texto.includes('user already registered') || texto.includes('already been registered')) {
    return 'Ese correo ya tiene cuenta. Entra con él, o pide una clave nueva.'
  }
  if (texto.includes('password should be at least') || texto.includes('weak password')) {
    return 'La clave es demasiado corta. Pon al menos seis letras o números.'
  }
  if (texto.includes('new password should be different')) {
    return 'Esa es la clave que ya tenías. Pon una distinta.'
  }
  if (texto.includes('unable to validate email') || texto.includes('invalid email')) {
    return 'Ese correo no tiene buena pinta. Míralo otra vez.'
  }
  if (texto.includes('same_password')) {
    return 'Esa es la clave que ya tenías. Pon una distinta.'
  }
  if (texto.includes('email rate limit') || texto.includes('too many requests')) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'
  }
  if (texto.includes('failed to fetch') || texto.includes('networkerror')) {
    return 'No se ha podido contactar con el servidor. Mira tu conexión.'
  }
  return original || 'Algo ha ido mal y no sabemos qué. Vuelve a intentarlo.'
}
