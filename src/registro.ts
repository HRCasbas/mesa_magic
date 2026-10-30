// El código que hace falta para crearse una cuenta.
//
// POR QUÉ ESTÁ ESTO AQUÍ. La regla 3 decía «el registro va cerrado, las
// cuentas se crean a mano». Héctor pidió el 28/10/2026 el registro
// completo, así que se abre, pero no de par en par: esta web enciende
// cámaras, y una dirección pública con un botón de «crear cuenta» es una
// dirección por la que entra cualquiera.
//
// ⚠ HASTA DÓNDE PROTEGE ESTE CÓDIGO, DICHO CLARO: para en seco a quien pase
// por delante, y no para a quien sepa mirar el código de la página, porque
// esto viaja al navegador como todo lo demás. El cierre de verdad es el
// interruptor de Supabase (Authentication → Sign In / Providers → «Allow
// new users to sign up»). Si algún día hace falta cerrarlo del todo, se
// apaga ahí y esta pantalla lo dirá sola, porque Supabase devuelve
// «signups not allowed» y eso ya está traducido.
//
// Lo que SÍ protege del todo, pase lo que pase: nadie entra en vuestra mesa
// sin el código de la mesa, que lo dictáis vosotros y cambia cada partida.
// Una cuenta de más no puede ver vuestra partida ni encender nada vuestro.

// Cambiado el 30/10/2026: el anterior, 'MAGIC-MESA', se adivinaba solo
// con leer el nombre de la web.
export const CODIGO_DE_INVITACION = 'Con23dedos'

/**
 * Da igual cómo lo escriba: con mayúsculas o sin ellas, vale.
 *
 * Un código se dicta por teléfono o se manda por un mensaje, y el que lo
 * recibe no sabe dónde van las mayúsculas. Afinar eso no añade ni una
 * pizca de seguridad y sí una vuelta más a quien está entrando.
 */
export function valeElCodigo(escrito: string): boolean {
  return escrito.trim().toLowerCase() === CODIGO_DE_INVITACION.toLowerCase()
}
