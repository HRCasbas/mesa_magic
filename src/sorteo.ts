// La tirada de quién empieza, sin que ninguno de los dos pueda hacer
// trampa.
//
// EL PROBLEMA. Si un navegador saca el número y le manda al otro «he
// ganado yo», el otro no tiene más remedio que creérselo. Entre dos amigos
// da igual, pero arreglarlo cuesta poco y así la moneda es de verdad.
//
// CÓMO SE ARREGLA, QUE ES VIEJO COMO EL MUNDO: lo mismo que apostar
// escribiendo cada uno su número en un papel, doblarlo y ponerlo sobre la
// mesa antes de destaparlos. Aquí el papel doblado es una **huella**: un
// resumen del número del que no se puede volver atrás.
//
// 1. Cada uno saca su número y manda la HUELLA, no el número.
// 2. Cuando tienes la huella del otro, mandas tu número.
// 3. Al llegar el suyo, compruebas que su huella cuadra con él.
// 4. Se suman los dos números: par empieza uno, impar el otro.
//
// Nadie puede elegir su número sabiendo el del otro, porque se compromete
// antes. Y nadie puede cambiarlo después, porque la huella no cuadraría.

/** Un número de los nuestros: grande, para que no se repita por azar. */
export function numeroAlAzar(): string {
  const trozos = crypto.getRandomValues(new Uint32Array(4))
  return Array.from(trozos, (n) => n.toString(16).padStart(8, '0')).join('')
}

/** La huella de un número. Del resumen no se saca el número. */
export async function huellaDe(numero: string): Promise<string> {
  const bytes = new TextEncoder().encode(numero)
  const resumen = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Quién empieza, con los dos números ya destapados.
 *
 * Los identificadores se ordenan para que el resultado sea el mismo
 * calculado desde cualquiera de los dos lados. Sin ordenarlos, cada uno
 * sacaría un ganador distinto y la moneda sería inútil.
 */
export function quienEmpieza(unId: string, otroId: string, unNumero: string, otroNumero: string): string {
  const [primero, segundo] = [unId, otroId].sort()
  // Se suma el último dígito de cada número, que ya es azar suficiente, y
  // se mira si el total es par. Con cuentas pequeñas no hay desbordes.
  const suma = parseInt(unNumero.slice(-1), 16) + parseInt(otroNumero.slice(-1), 16)
  return suma % 2 === 0 ? primero : segundo
}
