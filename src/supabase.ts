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
    return 'El registro está cerrado. Las cuentas se crean a mano.'
  }
  if (texto.includes('email rate limit') || texto.includes('too many requests')) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'
  }
  if (texto.includes('failed to fetch') || texto.includes('networkerror')) {
    return 'No se ha podido contactar con el servidor. Mira tu conexión.'
  }
  return original || 'Algo ha ido mal y no sabemos qué. Vuelve a intentarlo.'
}
