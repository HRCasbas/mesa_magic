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
export const VENIMOS_DE_RECUPERAR = window.location.hash.includes('type=recovery')

// Este proyecto de Supabase lo comparte Magic con la web de Pokemon de
// Hector. Lo de Magic vive en el esquema `magic`; `public` es de Pokemon y
// no se toca. Fijando el esquema aqui, ninguna consulta se despista.
export const supabase = createClient(DIRECCION, CLAVE_PUBLICABLE, {
  db: { schema: 'magic' },
  auth: {
    // Que la sesion aguante un cierre de navegador: no se entra cada vez.
    persistSession: true,
    autoRefreshToken: true,
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
