# Mesa Magic

Web para jugar a Magic: The Gathering a distancia, mesa contra mesa por
webcam. **Partidas de dos, no Commander.** Corre en navegador, en PC y en
móvil.

---

## Antes de tocar nada

**Lee `DIRECTRICES/ruta-de-tareas.md` entero.** Es la memoria del proyecto:
las fases, el porqué de cada decisión, lo que no se negocia y lo que ya se
investigó y no hay que volver a investigar. Dice también qué toca ahora.

**Cuando tomes una decisión, la descubras o la cambies, actualiza ese
documento en el mismo commit.** Lo que se sabe pero no se escribe, se pierde.

---

## Con quién trabajas

**Héctor no es programador y no sabe PowerShell.** En cada entrega hay que
darle los comandos completos, para copiar y pegar, sin dar nada por hecho.

**Plan antes de código.** Quiere entender el alcance y decidir él: explícale
las opciones con sus pegas y recomiéndale una, en vez de empezar a escribir
archivos.

**Es muy bueno detectando problemas de uso reales.** Cuando dice que algo no
se entiende, tiene razón.

**La web se explica sola, sin párrafos.** Lo pidió el 29/10/2026: «que con
los títulos, opciones y botones se autoexplique, minimalista». Si hace
falta un párrafo para explicar un botón, el botón está mal puesto o mal
escrito: primero se arregla el botón. El porqué va a `DIRECTRICES/`.

**Respuestas cortas.** Lo pidió el 27/10/2026: *«Sé más directo, no me hagas
leer toda la conversación, dime novedades y qué tengo que hacer o probar».*
Tres bloques y poco más: **qué hay nuevo**, **qué tiene que hacer él**, **qué
tiene que probar**. El porqué de las decisiones va a `DIRECTRICES/`, que para
eso está; en el chat solo si lo pregunta.

Escribe en **castellano**, sin anglicismos innecesarios, y en el código
también: nombres de variables, de funciones y comentarios en castellano. Los
textos que ve el usuario, con sus acentos puestos.

---

## Lo que no se negocia

- **No crear un proyecto nuevo de Supabase.** El plan gratis da dos proyectos
  activos por cuenta y los dos están cogidos. Magic vive en un esquema
  `magic` dentro de `cartas-pokemon` (ref `jwumnclmdsvcdkbsvikq`).
- **No tocar `public.marcas` ni `public.puntos`**: son de su web de Pokémon y
  están en uso.
- **No tocar nada de `gestor_gastos`.** Es otra aplicación suya, la de los
  gastos de la familia. Ni la carpeta ni su proyecto de Supabase.
- **Toda migración se prueba antes en una transacción con `rollback`.**
- **Sus datos se miran con su usuario puesto**, nunca con permisos de
  servidor.
- **Todo gratis.** Si una decisión obliga a pagar, se busca otra.

---

## Reglas de producto

1. **La partida en vivo no depende de la base de datos.** Vídeo, contadores y
   pegatinas van de navegador a navegador. Si Supabase está dormida, se juega
   igual.
2. **La cámara no se enciende sin sesión y sin mesa**, y siempre con un botón
   de cortar a la vista.
3. **El registro va con código de invitación** (Héctor, 28/10/2026, cambia
   la regla anterior de «registro cerrado»). Cualquiera no se crea una
   cuenta: hace falta el código de `src/registro.ts`, que él reparte. Ese
   código **para a quien pase por delante, no a quien sepa mirar el código
   de la página**; el cierre de verdad sigue siendo el interruptor de
   Supabase. Lo que sí protege del todo: sin el código de la mesa, que se
   dicta y cambia cada partida, una cuenta de más no ve ni enciende nada.
4. **Las pegatinas en coordenadas normalizadas**, nunca en píxeles.
5. **No se empieza una partida sin que los dos hayan elegido mazo.** Es lo
   único que hace que el historial valga algo. **No hay series:** hay un
   botón de finalizar, y al acabar se precarga el mismo mazo.
6. **La aplicación nunca declara un ganador.** Uno lo declara y el otro
   acepta. Estar a 0 vidas no es perder: hay cartas que lo impiden, y Magic
   tiene demasiadas casuísticas para adivinar.
7. **Un mazo lleva lista de cartas, pero no se teclea: se importa.** Nombre,
   formato, portada, notas y la lista, sacada del fichero que exporta otra
   aplicación. Y **el rival ve el mazo entero durante la partida**: lo
   decidió Héctor el 27/10/2026, porque en torneos las listas son públicas y
   entre ellos acaban preguntándoselas igual.
8. **El historial guarda el nombre y la portada del mazo tal como estaban el
   día de la partida**, para que borrar un mazo no deje las partidas viejas
   en blanco.
9. **Un número que necesita una explicación para no confundir, sobra.**

---

## Arquitectura

```
src/
  main.tsx            arranque de React
  App.tsx             decide si hay sesión y nada más
  PantallaEntrada.tsx la puerta: entrar, crear cuenta, clave olvidada
  PantallaClave.tsx   poner una clave nueva: del correo o desde dentro
  registro.ts         el código de invitación, y hasta dónde protege
  PantallaDentro.tsx  lo que se ve con sesión
  PantallaMesa.tsx    crear mesa, entrar con código, ver quién está
  Tapete.tsx          una mesa vista por la cámara, con sus pegatinas
  BarraPartida.tsx    la barra de la izquierda: cámara, micro, salir
  LateralPartida.tsx  el panel de la derecha, en dos pestañas
  PantallaContadores.tsx  vidas, veneno, turno y fase
  sesion.ts           lleva la sesión y la ficha del jugador
  mesa.ts             la conexión con la mesa
  enlace.ts           el camino directo entre los dos: vídeo y datos
  contadores.ts       los números de la partida, y cómo viajan
  mazos.ts            tus mazos y sus cartas, de la base de datos
  importar.ts         leer una lista de cartas pegada tal cual
  PantallaMazos.tsx   verlos, con las cartas apiladas
  partidas.ts         terminar una partida y el historial
  FinDePartida.tsx    declarar ganador y que el otro lo acepte
  PantallaHistorial.tsx  las partidas jugadas y el balance por mazo
  Moneda.tsx          quien empieza
  avatar.ts           un avatar de mentira hasta que haya de verdad
  ajustes.ts          lo que eliges una vez, como el idioma
  despierto.ts        que no se apague la pantalla mientras juegas
  pegatinas.ts        las pegatinas sobre el vídeo, en coordenadas 0-1
  CapaPegatinas.tsx   la capa que las pinta y deja arrastrarlas
  fotos.ts            pedirle al otro una foto de una carta, a su resolución
  scryfall.ts         preguntar qué carta es: por nombre o por número
  consultas.ts        lo que has mirado, privado, y compartir una
  PantallaConsultas.tsx  buscar una carta y la lista de lo mirado
  supabase.ts         el cliente, y los errores en castellano
  comprobaciones.ts   si este aparato sirve para jugar
  index.css           hoja de estilo única; los colores en :root
worker/
  index.ts            rutas del Worker, y el paso a la mesa
  mesa.ts             el Durable Object: una mesa de dos plazas
  jwt.ts              comprobar la sesión sin preguntar a Supabase
public/               lo que se copia tal cual
DIRECTRICES/          la memoria del proyecto
wrangler.jsonc        el Worker de Cloudflare que sirve la web
.node-version         la version de Node con la que compila Cloudflare
.github/workflows/    publicar.yml: la red de seguridad en GitHub Pages
```

- **React 19 + TypeScript + Vite.** TypeScript no es un capricho: el estado
  de la partida viaja entre los dos navegadores y los dos lados tienen que
  entenderlo igual.
- **`vite.config.ts` lleva `base: './'`**, o sea rutas relativas, para que la
  misma compilación valga colgada de la raíz (Cloudflare Pages) y de una
  subcarpeta (GitHub Pages). El día que la web tenga varias direcciones por
  dentro, lo relativo deja de valer y hay que poner la ruta buena.
- **Un solo tema, oscuro, y no se puede elegir.** Esta web se mira al lado
  del vídeo de una mesa; una pantalla blanca deslumbra y hace perder el
  detalle de las cartas.

---

## Comandos

```powershell
# Ir al proyecto (siempre primero)
cd $env:USERPROFILE\develop\mesa_magic

# Arrancar en local
npm run dev

# Comprobar antes de entregar
npm run build
npm run lint

# Probar el Worker y la mesa en local (hay que compilar antes)
npm run build
npx wrangler dev

# Si se toca wrangler.jsonc, regenerar los tipos
npx wrangler types
```

Node.js está en `C:\Users\hecso\develop\.tools\node` (portátil, v24.22.1 LTS)
y en el PATH de usuario. No hay instalación en Archivos de programa. El
archivo `.node-version` le dice a Cloudflare que use esa misma versión, para
que compile igual que aquí.

**Publicar es empujar a `main`.** Cloudflare compila y publica solo en un par
de minutos, en **https://magic-mesa.duelo.workers.dev**.

---

## Comprobar antes de entregar

Nada se da por bueno sin ejecutarlo:

```powershell
npm run build
npm run lint
```

Los dos tienen que salir limpios. `npm run build` incluye el repaso de
TypeScript, así que si compila, los tipos cuadran.
