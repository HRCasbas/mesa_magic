# Mesa Magic — ruta de tareas

La memoria del proyecto. Qué se decidió, por qué, y qué toca ahora.
**Cuando algo se decida, se descubra o se cambie, se escribe aquí en el mismo
commit.** Lo que se sabe y no se escribe, se pierde.

Arrancado el 26/10/2026.

---

## Qué es esto

Una web para que Héctor y un amigo jueguen a Magic a distancia, mesa contra
mesa por webcam. **No es Commander:** partidas de dos, formatos normales tipo
Modern, Standard o Limited. Nada de daño de comandante ni zona de mando.

Tres cosas:

1. **Vídeo en vivo de las dos mesas**, con el menor retardo posible.
2. **Panel de contadores compartido**: vidas, veneno, energía, experiencia,
   infección, cartas en mano y cementerio, turno y fase, quién empieza, la
   tirada, y el marcador de la serie (partida 1 de 3).
3. **Pegatinas arrastrables encima del vídeo**: +1/+1, −1/−1, vínculo vital,
   arrolla, volar, toque mortal, tapado/destapado, señalar una carta («esta»)
   y fichas genéricas. Que se muevan, cambien de valor y se borren, y que la
   posición aguante aunque el otro mueva un poco la cámara.

---

## Las fases

| Fase | Qué se hace | Estado |
|---|---|---|
| **0** | El terreno: carpeta, repositorio, web vacía publicada en HTTPS, comprobaciones del aparato | **Hecha** (26/10/2026) |
| **1** | La puerta: usuario y clave, registro cerrado, dos cuentas | Siguiente |
| **2** | La mesa: Worker de Cloudflare, señalización, credenciales TURN | |
| **3** | El vídeo: WebRTC, cámara propia y del otro, cortar, diagnóstico | |
| **4** | Los contadores, por el canal de datos | |
| **5** | Las pegatinas arrastrables | |
| **6** | Leer las cartas: foto de alta resolución, congelar y ampliar, Scryfall | |
| **7** | Mazos: zona propia, portada, lista privada, elegir mazo para jugar | |
| **8** | Historial de partidas: registro automático al terminar, y qué sale de él | |
| **9** | El remate: PWA, pantalla que no se apaga, atajos, al mejor de tres | |

**Supabase solo se toca en la fase 1 y en la 7.** De la 2 a la 6, todo
Cloudflare.

---

## La arquitectura, en dos capas

Esta es la decisión que ordena todo lo demás.

### Capa 1 — la partida en vivo, sin base de datos

Vídeo, vidas, veneno, contadores, turno, fase y pegatinas van **de navegador
a navegador** por WebRTC. La base de datos no está en el camino de nada que
se vea en directo.

**Y no es solo por ahorrar: meter los contadores en una base de datos los
haría más lentos, no más fiables.** Un contador que va a Irlanda y vuelve son
60–80 ms por cada toque, y si la base falla te quedas sin poder apuntar que
te han quitado tres vidas.

### Capa 2 — solo lo que merece sobrevivir a la partida

Historial (fecha, resultado, quién ganó, mazo usado) y mazos. Y nada más.

### Por qué la señalización no va en Supabase

Antes de que exista la conexión directa, los dos navegadores tienen que
intercambiarse una tarjeta de presentación. Eso es justo **lo que tiene que
funcionar en el segundo en que el amigo dice «dale»**, así que no puede
depender de un proyecto de Supabase que se pausa a los 7 días y tarda minutos
en despertar.

Va en un **Worker de Cloudflare con un Durable Object**: gratis y no se pausa
nunca. El mismo Worker emite las credenciales temporales del TURN, así que no
hace falta ninguna función de Supabase.

---

## Mazos y registro de partidas (pedido por Héctor el 26/10/2026)

> «Para jugar una partida hay que elegir un mazo de un usuario. Cada usuario
> tiene que tener una zona para poder listar sus mazos y poder poner una
> carta de imagen principal del mazo para que sea fácil reconocible.»

### La regla que lo ordena todo

**No se empieza una serie sin que los dos hayan elegido mazo.** No es una
pega burocrática: es lo único que hace que el historial valga algo. Un
registro de partidas sin saber con qué se jugó no sirve para nada.

El mazo se elige **al empezar la serie, no partida a partida**: en un al
mejor de tres se juega con el mismo mazo las tres.

### Un mazo

- Nombre, formato (Modern, Standard, Limited, Pioneer, Casual…), notas.
- **Carta de portada**, para reconocerlo de un vistazo.
- **Lista de cartas, privada.**
- Activo o retirado.

**El rival ve el nombre, el formato y la portada. La lista de cartas no.**
En Magic no se enseña el mazo al contrario, y esto no es un detalle técnico
sino una regla del producto.

### La portada: se guarda el identificador, no la imagen

Se busca la carta por nombre en Scryfall y se guarda **su identificador y el
nombre de la carta**, nunca el archivo. La imagen se le pide a Scryfall al
pintarla. Por tres razones:

1. El almacenamiento del proyecto es 1 GB y **está compartido con la web de
   Pokémon**. Las imágenes de cartas lo llenarían a tontas y a locas.
2. Las ilustraciones son de Wizards. Scryfall las sirve; copiarlas a un sitio
   propio abre una pregunta que no hace falta abrirse.
3. Si Scryfall no responde, se pinta el nombre de la carta y el mazo se sigue
   reconociendo. Por eso se guarda también el nombre, y no solo el id.

### Borrar un mazo no puede dejar el historial cojo

**El historial guarda el nombre y la portada del mazo tal como estaban el día
de la partida**, no solo un enlace al mazo. Así se puede borrar o renombrar un
mazo sin que las partidas viejas queden en blanco ni mientan.

Es la misma regla que en Cashtor: *un dato que cambia con el tiempo lleva el
tiempo dentro*. Y permite cumplir la otra: *toda lista donde algo aparece por
primera vez tiene que dejar borrarlo*.

### El registro es automático, y eso es el 90 % del valor

**Al jugador no se le pide un formulario al acabar.** La aplicación lleva el
panel, así que ya sabe casi todo:

- Fecha y hora de inicio y de fin, y cuánto ha durado.
- Los dos mazos (nombre y portada congelados) y los dos jugadores.
- **Quién empezó cada partida.**
- En qué turno terminó.
- Vidas finales de los dos, y veneno si lo hubo.
- El marcador de la serie.
- El formato.

Solo hay que preguntar dos cosas, y una se propone sola:

- **Quién ha ganado.** Si unas vidas llegan a 0 o el veneno a 10, se propone
  y basta con confirmar.
- **Cómo ha terminado:** vidas a 0, veneno, sin cartas en la biblioteca,
  concesión, otra.

Y una línea de notas, opcional.

### Lo que sale de ahí, que es lo que de verdad se mira

- **El cruce de mazos:** «mi Rojo Agresivo contra tu Control Azul, 4-2».
  Es la consulta que un jugador hace de verdad.
- **Qué tal te va empezando tú y empezando él.** En Magic jugar primero es
  una ventaja real y medible, y **nadie la apunta a mano jamás**. Aquí sale
  gratis porque el panel ya sabe quién empezó. De todo el historial, esto es
  lo que más va a sorprender.
- Cuántos turnos dura de media cada enfrentamiento.
- Rachas, y cuánto hace que no juegas con un mazo.

### Dos detalles que hay que resolver al implementarlo

- **Quién escribe la fila.** Al acabar, los dos navegadores tienen el mismo
  estado; si escriben los dos, salen dos partidas. **Escribe el que creó la
  mesa**, el otro solo lee. Y la fila lleva el identificador de la serie con
  una restricción única, para que un reintento no duplique.
- **Si alguien se va sin cerrar**, la partida queda *sin terminar* y se puede
  cerrar luego a mano desde el historial. **No se inventa un resultado.**

### Lo que leen los dos

Una partida la pueden leer **los dos que la jugaron**. Los mazos, solo su
dueño, salvo el nombre, el formato y la portada, que el rival necesita ver.

---

## Lo que no se negocia

- **No se crea un proyecto nuevo de Supabase.** El plan gratis da dos
  proyectos activos **por cuenta, no por organización**, y los dos están
  cogidos: `gestor-gastos` (Cashtor) y `cartas-pokemon`.
- **Magic vive en un esquema `magic` dentro de `cartas-pokemon`**
  (ref `jwumnclmdsvcdkbsvikq`, eu-west-1, Irlanda).
- **No se toca `public.marcas` ni `public.puntos`**, que son de la web de
  Pokémon y están en uso.
- **No se toca nada de `gestor-gastos`** ni de la carpeta
  `C:\Users\hecso\develop\gestor_gastos`. Son otra aplicación.
- **Toda migración se prueba antes en una transacción con `rollback`.**
- **Los datos de Héctor se miran con su usuario puesto**, nunca con permisos
  de servidor.
- **Todo gratis.** Si una decisión obliga a pagar, se busca otra.

---

## Compartir Auth con Pokémon: comprobado y despejado (26/10/2026)

Era el punto bloqueante de la fase 1: los usuarios de Auth son compartidos
con la web de Pokémon, así que quien se registre para Magic existirá también
allí. **Comprobado, y no hay que tocar nada.**

- `public.marcas` y `public.puntos` tienen RLS activo.
- **Todas sus políticas están concedidas solo al rol `anon`.** No hay ni una
  para `authenticated`.
- Y en Postgres **`authenticated` no es miembro de `anon`**: son hermanos,
  los dos colgando de `authenticator`. Así que las políticas de `anon` no le
  aplican.

Con RLS activo y sin política que le aplique, a un usuario con sesión se le
deniega el acceso. **Un usuario de Magic no puede leer ni escribir los datos
de Pokémon.**

Se miró con una consulta de **metadatos** (`pg_class`, `pg_policies`,
`pg_auth_members`), sin leer ni una fila de datos.

> **Apunte que no es cosa de Magic.** La web de Pokémon se protege con una
> clave fija que el navegador manda en una cabecera, comprobada por la
> función `clave_correcta()`. Como esa web es pública, la clave viaja en su
> JavaScript y cualquiera que la abra puede leerla. Son 162 marcas de una
> colección, así que el daño posible es ninguno, **y Magic no lo empeora en
> nada**. Queda anotado porque se vio, no porque haya que arreglarlo desde
> aquí. Esas tablas no se tocan.

**El registro público se queda desactivado** y las dos cuentas se crean a
mano. Un registro abierto no solo mete a desconocidos en la mesa: también les
abre la puerta del proyecto de Pokémon.

**El latido hace falta desde la fase 1.** Es la acción programada que consulta
los dos proyectos para que Supabase no los pause; la monta otra sesión, en el
repositorio `latido-supabase`. Con cuentas desde el principio, entrar depende
de que `cartas-pokemon` esté despierta. La fase 0 no lo necesita.

---

## Lo que ya se sabe y no hay que volver a investigar

### El vídeo

- **WebRTC punto a punto es la única respuesta.** Dos jugadores, una
  conexión, sin servidor de medios. Retardo de 30 a 120 ms. Cualquier cosa
  tipo emisión (HLS, Twitch) da entre 2 y 10 segundos y no sirve.
- **Va cifrado siempre** (DTLS-SRTP). No existe forma de usarlo sin cifrar.
- **STUN público de Google: gratis.** Resuelve cerca del 80 % de los casos.
- **TURN hace falta para el resto** (CGNAT, datos del móvil, cortafuegos).
  **Cloudflare da 1.000 GB al mes gratis**, luego 0,05 $/GB. Una partida de
  dos horas con los dos vídeos por el relé gasta unos 4,5 GB: caben unas 200
  partidas al mes dentro de lo gratis.
- **Open Relay de Metered no es fiable:** las fuentes se contradicen entre
  50 GB, 20 GB y 500 MB al mes. No apostar por él.
- Punto a punto significa que **cada uno ve la IP del otro**. Es inherente.
  Si molestara, `iceTransportPolicy: 'relay'` fuerza que todo pase por
  Cloudflare, a cambio de algo más de retardo. Dejarlo como interruptor.

### Leer una carta del otro: el problema de verdad

Una carta mide 63 × 88 mm. Para encuadrar la mesa hacen falta unos 60 cm de
ancho. A 1080p son 32 píxeles por centímetro:

- La carta entera: unos 200 px de ancho.
- El nombre: unos **10 px de alto**. Al límite.
- Una línea del texto de reglas: unos **6 px**. **Ilegible, siempre.**

**Ningún ajuste de WebRTC arregla esto.** Lo que sí funciona, por orden de
rentabilidad:

1. **Foto fija a resolución nativa por el canal de datos.** Un fotograma a la
   resolución máxima de la cámara (4K si la tiene), como JPEG de 200 a 800 KB,
   y el otro lo amplía. **Esto sí se lee**, y es la función que más valor da
   por lo que cuesta. Fase 6.
2. **Buscar la carta por nombre en Scryfall** (API gratuita, sin clave).
3. `contentHint = 'detail'` en la pista de vídeo, 1080p a 15–24 fps en vez de
   30, y subir el tope de bitrate con `setParameters` (2,5 a 4 Mbps). Menos
   fotogramas y más nitidez: el texto aguanta bastante mejor.
4. La convención de siempre: acercar la carta a la cámara.

**No perseguir la carta legible desde la mesa. Perseguir que pedir una carta
sea un gesto.**

### Las pegatinas y el movimiento de cámara

Van en **coordenadas normalizadas (0 a 1)** sobre el fotograma, nunca en
píxeles: así aguantan cambiar el tamaño de la ventana, girar el móvil, o que
uno juegue en PC y el otro en tableta.

Lo que **no** aguantan es que se mueva la cámara. De barato a caro:

- Cámara fija y no tocarla. Es lo que funciona.
- **Botón de recalibrar:** arrastrar todas las pegatinas de una vez, como un
  grupo. Un gesto, poco código, resuelve casi todos los golpes.
- **Zonas en vez de puntos:** el tapete se divide en filas y la pegatina se
  pega a una casilla. Mover la cámara deja de importar.
- Marcas impresas en las esquinas del tapete (ArUco) y homografía con
  OpenCV.js. Funciona de verdad, pero come procesador, depende de la luz y se
  cae en cuanto se tapa una esquina. **Esto es lo que se come un fin de
  semana y luego va el 70 % de las veces.** Solo si lo anterior no basta.

Reconocer automáticamente qué carta es cada una queda **fuera de alcance**:
poco fiable, y SpellTable lleva años peleándose con ello.

### La cámara, que es un problema físico

- **El soporte.** Una webcam encima del monitor no ve la mesa. Hace falta un
  brazo o un cuello de cisne con pinza, 15–25 €.
- **El enfoque.** Las webcams baratas persiguen el enfoque sobre un tapete
  plano y uniforme. Mejor enfoque fijo.
- **La cámara del móvil es mucho mejor que cualquier webcam de ese precio.**
  Lo más rentable es usar el móvil como webcam del PC (DroidCam, Iriun): el PC
  la ve como una cámara normal y **la aplicación no necesita ni una línea
  extra**. Meter el móvil como cámara dentro de la propia web obliga a una
  malla de cuatro conexiones; dejarlo para mucho más adelante.

---

## Decisiones técnicas tomadas

- **React 19 + TypeScript + Vite.** Arrastrar pegatinas con precisión encima
  de un `<video>` es exactamente lo que el HTML hace de fábrica. Flutter
  sería la herramienta equivocada aquí, aunque Héctor lo conozca de Cashtor.
- **La web se publica en un Worker de Cloudflare**, llamado `magic-mesa`. El
  nombre lo eligió Héctor el 26/10/2026: la primera dirección era
  `hrcasbas.github.io/mesa_magic/` y no le gustaba llevar su usuario dentro.
  En github.io eso no se puede quitar, porque la dirección es siempre
  `usuario.github.io/repositorio/`; en Cloudflare el nombre del proyecto
  **es** la dirección y se elige.
- **Worker y no Pages, y no es un capricho.** Cloudflare ya empuja los
  proyectos nuevos a Workers y deja Pages en mantenimiento, pero la razón de
  peso es otra: **los Durable Objects solo existen en Workers.** Son justo la
  pieza que la fase 2 necesita para que los dos jugadores se encuentren en la
  misma mesa. Yendo por Pages habría habido que montar un Worker aparte, en
  otro dominio, con permisos entre dominios de por medio. Así la web y el
  servidor de la mesa son **el mismo proyecto y el mismo dominio**.
  Se descubrió cuando Héctor mandó una captura del formulario: había caído en
  el de Workers y parecía un error. No lo era.
- **`wrangler.jsonc` es la configuración de ese Worker.** Hoy solo reparte
  los archivos de `dist`; en la fase 2 crecerá con un `main` (el código) y un
  `durable_objects`.
- **La dirección es https://magic-mesa.duelo.workers.dev.** Lleva un nivel
  más que en Pages: `worker.subdominio.workers.dev`. Cloudflare puso de
  subdominio de cuenta `hrcasbas`, sacado del correo, que era justo lo que
  Héctor no quería; se cambió a `duelo` el 26/10/2026 desde
  Cómputo → Workers y Pages → Cambiar subdominio de cuenta.
  `duel`, en inglés, estaba **ocupado**: los subdominios son únicos en todo
  Cloudflare, no por cuenta, y las palabras cortas en inglés están cogidas.
  `duelo`, `tapete` y `elduelo` estaban libres. Se probaron en el propio
  formulario, que valida al momento, sin confirmar nada.
  **Cambiar el subdominio tira la dirección vieja al instante** y la nueva
  tarda unos minutos en responder. Si algún día se vuelve a tocar, avisar
  antes a quien tenga el enlace.
  Un dominio propio (~10 €/año) lo dejaría en `magicmesa.es` el día que
  apetezca, y es un ajuste de dos minutos, no una mudanza.
- **Cuota de compilación: 3.000 minutos al mes** en el plan gratis. Una
  compilación de esta web gasta menos de un minuto.
- **`vite.config.ts` lleva `base: './'`**, rutas relativas, para que la misma
  compilación valga en los dos sitios a la vez: en Cloudflare, colgando de la
  raíz, y en GitHub Pages, colgando de una subcarpeta. Así la mudanza no dejó
  ninguna de las dos en blanco ni un minuto. **Cuidado para más adelante:** en
  cuanto la web tenga direcciones por dentro (`/mesa/1234`), lo relativo deja
  de valer y hay que poner la ruta buena del sitio definitivo.
- **`.node-version` fija Node 24.22.1 para Cloudflare**, la misma de aquí.
  Es un archivo del repositorio a propósito, en vez de una variable que haya
  que escribir en el panel: así la versión viaja con el código y no hay un
  ajuste suelto que nadie recuerda.
- **GitHub Pages se queda como red de seguridad** mientras se comprueba que
  Cloudflare va bien, y se apaga después. La acción `publicar.yml` es la que
  lo mantiene vivo.
- **El repositorio es público.** No es un problema: las claves que aparecerán
  en el código (la `anon key` de Supabase) están pensadas para ser públicas y
  lo que protege los datos es RLS, no esconder la clave. Con Cloudflare se
  podría pasar a privado, que GitHub Pages gratis no lo permitía; queda como
  opción si algún día apetece.
- **Node.js portátil en `C:\Users\hecso\develop\.tools\node`** (v24.22.1 LTS,
  huella SHA-256 comprobada contra la lista oficial), añadido al PATH de
  usuario. Sin administrador y sin tocar el registro: para quitarlo se borra
  la carpeta. **El Flutter de Héctor sigue intacto en el PATH.**
- **Fondo oscuro, y a propósito.** Esta web se mira al lado del vídeo de una
  mesa, muchas veces de noche; una pantalla blanca al lado deslumbra y te
  hace perder el detalle de las cartas. Los colores salen de `:root` en
  `index.css`.

---

## Pendiente de que Héctor decida

- **El nombre visible.** «Mesa Magic» es provisional, puesto para que la fase
  0 tuviera título. La dirección ya sí está elegida: `magic-mesa.pages.dev`.
- **Cloudflare Access** (gratis hasta 50 usuarios) pondría una puerta en el
  borde, antes de que la web llegue a cargarse. Más seguro, pero añade un
  código al correo cada vez. No se ha metido.
- **La tirada de quién empieza.** Si la tira un navegador y manda el
  resultado, el otro se lo tiene que creer. Hay un truco limpio: cada uno
  manda su número tapado y solo al tener los dos se destapan y se suman.
  Media hora de trabajo.

---

## Lecciones

- **26/10/2026 — La puerta no puede ir al final.** El plan tenía las cuentas
  en la última fase, como suele hacerse. Héctor pidió que la webcam fuera
  «segura y con usuario», y tenía razón: montar el vídeo primero deja una web
  que enciende la cámara y a la que cualquiera con la dirección puede entrar.
  La autenticación se movió de la fase 7 a la fase 1 y las fases se
  renumeraron.
- **26/10/2026 — Dar por hecho el plan gratuito de un proveedor sale caro.**
  El primer análisis daba por supuesto un proyecto nuevo de Supabase. No
  había hueco: el tope de dos proyectos es **por cuenta, no por
  organización**. Comprobar los límites reales antes de dibujar la
  arquitectura, no después.
