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
   infección, cartas en mano y cementerio, turno y fase, y quién empieza.
3. **Pegatinas arrastrables encima del vídeo**: +1/+1, −1/−1, vínculo vital,
   arrolla, volar, toque mortal, tapado/destapado, señalar una carta («esta»)
   y fichas genéricas. Que se muevan, cambien de valor y se borren, y que la
   posición aguante aunque el otro mueva un poco la cámara.

---

## Las fases

| Fase | Qué se hace | Estado |
|---|---|---|
| **0** | El terreno: carpeta, repositorio, web vacía publicada en HTTPS, comprobaciones del aparato | **Hecha** (26/10/2026) |
| **1** | La puerta: usuario y clave, registro cerrado, dos cuentas | **Hecha** (26/10/2026) |
| **2** | La mesa: Worker, Durable Object, encontrarse con un código | **Hecha** (27/10/2026) |
| **3** | El vídeo: WebRTC, credenciales TURN, cortar, diagnóstico | **Hecha** (27/10/2026), falta el relé |
| **4** | Los contadores, por el canal de datos | **Hecha** (27/10/2026) |
| **5** | Las pegatinas arrastrables | **Hecha** (27/10/2026) |
| **6** | Leer las cartas: tocar una carta, foto de alta resolución, ampliar, Scryfall y OCR | **Hecha** (28/10/2026), falta el OCR |
| **7** | Mazos: zona propia, portada, elegir mazo para jugar | |
| **8** | Historial: declarar ganador, aceptar, y qué sale del registro | **Hecha** (30/10/2026) |
| **9** | El remate: PWA, pantalla que no se apaga, atajos | **Hecha** (30/10/2026) |

**Supabase solo se toca en la fase 1 y en la 7.** De la 2 a la 6, todo
Cloudflare.

### La pantalla de partida, al estilo SpellTable (Héctor, 28/10/2026)

Después de jugar de verdad con el andamio, Héctor pidió copiar el reparto
de SpellTable, y tiene razón: **lo que importa es ver las cartas**, y las
tarjetas apiladas dejaban el vídeo del tamaño de un sello.

La partida es ahora **una capa fija que ocupa la pantalla**, en tres zonas:

| Zona | Qué lleva |
|---|---|
| **Izquierda**, estrecha, se abre al pasar el ratón | Lo que **no** es de la partida: cámara, micrófono, cortar imagen, cambiar de cámara, el código y salir |
| **Centro** | La imagen del rival, lo más grande posible. La tuya, pequeña en una esquina, solo para encuadrar |
| **Derecha** | Lo que **sí** es de la partida, en dos pestañas: «Partida» (vidas, turno, pegatinas) y «Cartas» (ver de cerca y buscar) |

Dos decisiones que no son de adorno:

- **Dentro de la partida no se desplaza la página** (lo pidió él). La capa
  es fija y se le quita el desplazamiento al cuerpo; lo único que se mueve
  por dentro es el panel de la derecha. Si la página bailara con la rueda
  del ratón, la imagen bailaría con ella.
- **El panel de la derecha va en pestañas** porque la columna es estrecha:
  con todo apilado, lo de abajo no se ve nunca.

Y arriba a la derecha, fuera de la partida, **el menú de la cuenta**:
mazos (pendiente, fase 7), cambiar la clave y cerrar sesión.

### Lo que cambió después de jugar (Héctor, 28/10/2026)

Cinco cosas que solo se ven jugando, y las cinco tenía razón:

- **Encuadrar, no tocar.** Pulsar una carta «solo amplía una sección
  aleatoria»: con la cámara a un metro de la mesa, acertar con un dedo es
  imposible. Ahora **se arrastra un recuadro** y se amplía lo encuadrado.
  Eso quita de en medio el problema de adivinar dónde está la carta, y deja
  el OCR como lo que siempre fue: un acelerador, no una vía.
- **Pulsar la imagen pequeña la cambia por la grande.** Era la única forma
  de poner pegatinas en tu propia mesa: en el recuadro de la esquina no se
  ve nada. Pegas, y vuelves a cambiar.
- **Un solo buscador.** Nada de una casilla para el nombre y otra para el
  número: se mira lo escrito. Si son tres o cuatro letras, un espacio y un
  número, es `NEO 123`; lo demás es un nombre. El ejemplo va en el propio
  hueco del campo.
- **Fuera los párrafos de explicación.** «Cada uno lleva sus números…»,
  «Conectado con…», «Sale en medio de la imagen…». Lo que hay que explicar
  cada vez que se mira, sobra; el porqué vive aquí.
- **Los botones, de una palabra:** «Scryfall» y «Enviar».

La lección de fondo: **esto se diseñó sobre el papel y se cayó al primer
contacto con una mesa de verdad.** Ninguno de los cinco se podía haber
visto compilando.

### ⚠ Lo que se ve ahora NO es el aspecto final (Héctor, 27/10/2026)

> «Entiendo que esta versión actual es de prueba, porque cambiaría
> absolutamente todo (tamaño de la webcam… muchas cosas).»

Exacto, y conviene decirlo aquí para que nadie pierda el tiempo puliendo
pantallas que se van a tirar. Lo que hay ahora es **un andamio**: cada fase
añade su trozo debajo del anterior, en tarjetas sueltas, para poder probarlo
por separado.

**El aspecto de verdad se monta en la fase 9**, cuando ya se sepa todo lo
que tiene que caber a la vez: el vídeo grande, los contadores al lado, las
pegatinas encima de la imagen y el lateral de consultas. Hasta entonces, las
tarjetas se quedan como están y **no se discuten tamaños ni colocación**.

Lo único que sí se cuida desde ya es que cada pieza funcione y que el estado
viaje bien entre los dos navegadores, porque eso no se rehace en la fase 9.

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

## Fase 1: lo que quedó montado (26/10/2026)

### En la base de datos

**Migración `magic_001_esquema_y_jugadores`.** Ensayada antes en una
transacción con `rollback`, y comprobado después que el `rollback` no había
dejado nada a medias.

- Esquema `magic`, con `magic.jugadores` (id que apunta a `auth.users`,
  nombre, creado).
- **`anon` no entra en `magic`.** La guía oficial de Supabase dice de dar
  permiso a `anon`, `authenticated` y `service_role`; aquí solo a los dos
  últimos, porque sin sesión no se ve nada. Comprobado: sin sesión la API
  responde `401 permission denied for schema magic`.
- RLS en `jugadores`: los dos se ven el nombre (hace falta para el dado y el
  historial), cada uno edita solo su ficha.

### En el panel de Supabase

- **Esquema `magic` expuesto** en Data API → Settings → Exposed schemas.
- **Registro público cerrado.** Comprobado desde fuera: un `POST` a
  `/auth/v1/signup` responde `422 signup_disabled`.
- **Site URL** cambiada de `http://localhost:3000` (el valor por defecto, que
  nadie había tocado) a `https://magic-mesa.duelo.workers.dev`, y añadida esa
  misma dirección a Redirect URLs. **Sin esto, el enlace del correo de
  invitación habría llevado a ninguna parte.**
- Cuenta de Héctor creada **por invitación**, no escribiendo una clave: la
  clave la pone él desde el correo. **Aquí no se manejan claves de nadie.**
  Falta la del amigo, que necesita su correo.

### ⚠ La trampa del contador «Exposed tables»

El panel dice **«0 of 3 tables exposed»**, y entre esas tres están
`public.marcas` y `public.puntos`, **que funcionan perfectamente** en la web
de Pokémon. O sea que ese contador **no mide lo que parece**.

Los permisos de verdad, mirados en la base, son estos:

| Tabla | `anon` | `authenticated` |
|---|---|---|
| `public.marcas` | SELECT, INSERT, UPDATE, DELETE | nada útil |
| `public.puntos` | SELECT, INSERT, UPDATE | nada útil |
| `magic.jugadores` | **nada** | SELECT, INSERT, UPDATE, DELETE |

**No tocar ese selector de tablas.** Guardar con él podría reescribir los
permisos de `marcas` y `puntos` y dejar la web de Pokémon muerta. Lo que hacía
falta era exponer el **esquema**, y con eso basta.

**Cómo se guardó sin riesgo:** se tomó una referencia antes (`marcas` y
`puntos` respondían `200 []`, o sea permisos bien y RLS bloqueando) y se
repitió después de guardar. Siguieron dando `200 []`. Si hubieran dado 401, se
habrían restaurado los permisos, que estaban apuntados.

### En la web

- `src/supabase.ts`: el cliente, con el esquema `magic` fijado, y los errores
  de Supabase traducidos a castellano llano.
- `src/sesion.ts`: lleva la sesión y la ficha. El estado `cargando` existe
  para que a quien ya entró no le parpadee la pantalla de entrada delante.
- `src/PantallaEntrada.tsx`: correo, clave y recuperar clave. **No hay botón
  de crear cuenta**, a propósito.
- `src/PantallaDentro.tsx`: pide el nombre la primera vez, y luego las
  comprobaciones del aparato, que ahora viven detrás de la puerta.
- **La clave publicable está en el código y a la vista, y está bien.** Está
  pensada para ir dentro de la web; lo que protege los datos es RLS. La que
  no puede salir de Supabase nunca es la de servicio (`service_role`), y esa
  no está ni va a estar.

---

## Fase 2: la mesa (27/10/2026)

Uno crea la mesa, le dicta un código de cuatro caracteres al otro, y los dos
aparecen ahí. **Todavía sin vídeo:** esto solo sirve para encontrarse.

### Las credenciales TURN se mudan a la fase 3

Estaban en la fase 2 y no pintan nada aquí: **un relé de vídeo no sirve de
nada mientras no haya vídeo**. Van con la fase 3, que es cuando se pueden
probar de verdad.

### Cómo se comprueba la sesión, y por qué importa

**Supabase firma los tokens de este proyecto con ES256 y publica la clave
pública** en `/auth/v1/.well-known/jwks.json`. Así que el Worker comprueba la
firma él solo:

- **No guarda ningún secreto.** Nada que rotar, nada que se pueda filtrar.
- **No le pregunta nada a Supabase** una vez tiene la clave en memoria (se
  guarda una hora). O sea que **una partida en marcha no se cae si Supabase
  se duerme**, que es justo la regla número 1 del proyecto.
- Si no consigue refrescar las claves pero tiene unas viejas, las sigue
  usando: más vale una clave de hace dos horas que dejar a los dos fuera.

Se comprueban la firma, la caducidad (con 30 segundos de margen por los
relojes) y **que el emisor sea este Supabase y no otro cualquiera**.

### El token no viaja en la dirección

Se manda en el **primer mensaje**, ya dentro del websocket, no como
`?token=…`. Una dirección acaba en registros de servidor y en el historial
del navegador, y una sesión no tiene por qué acabar ahí. La mesa no admite
ningún otro mensaje hasta que te identificas.

### Detalles que costaron tiempo y no hay que volver a descubrir

- **`new_sqlite_classes`, no `new_classes`.** En el plan gratis los Durable
  Objects solo existen con almacenamiento SQLite.
- **`run_worker_first: ["/api/*"]` en `wrangler.jsonc`.** Sin eso, el
  `not_found_handling: single-page-application` se come las rutas de `/api/`
  y devuelve el `index.html`: el Worker no llegaría a ejecutarse nunca.
- **El alfabeto del código no lleva `O`, `0`, `I` ni `1`.** El código se
  dicta por teléfono.
- **Hibernación** (`ctx.acceptWebSocket`): Cloudflare descarga la mesa de
  memoria mientras nadie habla. Una partida de dos horas apenas gasta.
- Si el mismo jugador vuelve a entrar (recargó, se le fue la cobertura), se
  le cierra la conexión vieja en vez de dejarle dos plazas ocupadas.

### Probado el 27/10/2026

Con el Worker en local, cuatro intentos de colarse, **los cuatro
rechazados**:

| Intento | Resultado |
|---|---|
| Token inventado | rechazado, cierre 1008 |
| **Token con forma de JWT, `kid` correcto y emisor correcto** | **rechazado: la firma no cuela** |
| Hablar sin identificarse | rechazado |
| Mandar una señal sin identificarse | rechazado |

Y las rutas: `/` sirve la web, `/api/codigo` devuelve códigos, `/api/mesa/X`
sin websocket da 426, lo que no existe da 404.

**Y repetido contra la web publicada**, no solo en local: el websocket de
`wss://magic-mesa.duelo.workers.dev/api/mesa/…` acepta la conexión y rechaza
un token falso con el mismo mensaje en castellano. **Los Durable Objects
funcionan en el plan gratis**, que era la duda.

> **Cuidado al comprobar un despliegue: Cloudflare cachea el `index.html`.**
> Nada más desplegar, la página puede seguir dando el archivo anterior
> durante un rato. Para ver la de verdad hay que pedirla con algo que salte
> la caché (`?v=<lo que sea>`). Se perdió un rato creyendo que el despliegue
> no había llegado cuando sí.

### ⚠ Lo que NO se ha podido probar

**Que los dos entren a la vez.** Hace falta **dos cuentas confirmadas
distintas**, y ahora mismo solo existe la de Héctor y sin confirmar. La misma
cuenta no vale: entrar dos veces con el mismo usuario cierra la conexión
vieja a propósito, para que nadie ocupe las dos plazas sin querer.

Queda pendiente de probar en cuanto haya dos cuentas.

---

## Fase 3: el vídeo (27/10/2026)

Cuando estáis los dos en la mesa aparece el botón de encender la cámara. El
vídeo va **directo de un navegador al otro**, cifrado, sin pasar por ningún
servidor nuestro. La mesa solo sirvió para pasaros las primeras cartas de
presentación y se queda al margen.

### Lo que se le pide a la cámara, y por qué es al revés de lo normal

`1920 × 1080` pero **solo 24 fotogramas por segundo**. Aquí hay que leer
texto impreso quieto encima de una mesa, no seguir movimiento: con 24
imágenes sobra, y lo que se ahorra ahí se gasta en nitidez.

Y `contentHint = 'detail'` en la pista de vídeo. **Sin eso, al mover una
carta el texto se emborrona durante medio segundo**, porque el códec da por
hecho que lo que importa es la fluidez.

Tope de calidad: 3 Mbps. Por encima no mejora lo legible.

### El choque de ofertas, resuelto sin hablarlo

Si los dos encienden la cámara a la vez, los dos hacen una oferta y se
pisan. Uno tiene que ceder, y se decide **comparando los identificadores de
los dos jugadores**: el menor cede. Los dos navegadores llegan a la misma
conclusión por su cuenta, sin un mensaje de más.

### El relé es opcional a propósito

`/api/servidores` devuelve siempre STUN público, y **añade el relé solo si
hay credenciales configuradas**. Sin ellas no falla: devuelve STUN y dice por
qué no hay relé, y la aplicación funciona igual para la mayoría.

Comprobado en local: sin credenciales responde
`{"hayRele":false,"motivo":"No hay credenciales de relé configuradas…"}`.

**El día que se pongan las credenciales empieza a funcionar para el resto sin
tocar una línea de código.**

### ⚠ Las credenciales del relé las tiene que poner Héctor

No las puede poner Claude: son un token de API, y **escribir claves o tokens
en un formulario es algo que Claude no hace**. Los pasos:

1. Panel de Cloudflare → **Realtime** → **TURN** → crear una clave.
2. Apuntar el **Key ID** y el **API token** (el token solo se enseña una vez).
3. Worker `magic-mesa` → **Settings** → **Variables and Secrets**, y añadir
   dos **secretos**:
   - `TURN_CLAVE_ID` → el Key ID
   - `TURN_TOKEN` → el API token
4. Volver a desplegar (o esperar al siguiente empujón a `main`).

Para comprobarlo: `/api/servidores` tiene que pasar a decir `"hayRele":true`,
y el panel de diagnóstico de la web lo enseña.

**1.000 GB al mes gratis**, y una partida de dos horas por el relé gasta unos
4,5 GB: caben unas 200 partidas al mes.

### El panel de diagnóstico

Se prometió desde el principio y aquí está: camino (**directo** o **relé**),
estado de la conexión, resolución que recibes, fotogramas por segundo, kbps e
ida y vuelta real del vídeo.

No es un lujo: es lo que permite que Héctor diga «va borroso» y se sepa por
qué, en vez de adivinar.

### Audio

Se ha incluido micrófono, con cancelación de eco y botón de silenciar.
**No lo pidió nadie**, pero una videollamada sin voz obliga a tener el
teléfono al oído toda la partida. Si estorba, se quita quitando `audio` de
`LO_QUE_SE_PIDE` en `src/video.ts`.

### ⚠ El enlace se abre con la mesa, NO con la cámara (arreglado 27/10/2026)

**El primer montaje estaba mal y dejaba a los dos colgados.** El enlace
WebRTC solo se creaba cuando *tú* encendías la cámara. Lo que vio Héctor al
probarlo: «en el móvil no me ha pedido nada de la cámara y no veo en el PC
la recepción».

Por qué pasaba: el que encendía primero mandaba su oferta a un lado que
todavía no tenía nada escuchando, así que **se perdía sin más**. Cuando el
otro encendía, mandaba la suya; el primero la recibía con su propia oferta a
medias y, si le tocaba ser el «maleducado», la rechazaba por la regla del
choque de ofertas. Pero su oferta ya se había perdido y nada le hacía volver
a proponer. **Bloqueo seco y sin ningún error en pantalla.**

Cómo queda:

- **El enlace se abre en cuanto estáis los dos en la mesa**, encienda o no
  alguien la cámara. Así no se pierde ninguna señal.
- **Cada cámara se cuelga del enlace cuando su dueño la enciende**
  (`addTrack`), y WebRTC renegocia solo. Se puede **recibir sin enviar**: si
  uno enciende y el otro no, el que no ha encendido ve la mesa del otro.
- Al abrir el enlace, cada lado manda un `{listo:true}`. El que lo recibe,
  si ya tenía la cámara encendida, vuelve a proponer. Es el seguro contra la
  carrera de antes.
- **La tarjeta del vídeo se ve desde que entras en la mesa, aunque estés
  solo.** Dos ventajas: puedes encuadrar mientras esperas, y puedes
  comprobar que el navegador te da el permiso sin depender del otro.
- El panel de diagnóstico añade **«Imagen que envías»** (de `outbound-rtp`).
  Sin ese dato no se puede distinguir «no me llega su imagen» de «no sale la
  mía», que es justo la duda que hubo aquí.

### La cámara de atrás, en el móvil

`facingMode: { ideal: 'environment' }`. En un teléfono la cámara de delante
no sirve para nada aquí: lo que hay que apuntar es la mesa. Con `ideal` y no
`exact`, un ordenador se queda con la única que tenga.

Y un botón de **cambiar de cámara**, que recorre las del aparato por
`deviceId`. Se hizo así y no con `facingMode: 'exact'` porque `exact` falla
en un ordenador con dos webcams. Ojo: **las cámaras no se pueden contar
hasta que hay permiso dado**, así que el botón solo aparece después de
encender.

### Probado y funcionando (Héctor, 27/10/2026)

Con el arreglo puesto, PC contra móvil. Lo que marcó el panel:

| Dato | Medido |
|---|---|
| Camino | **directo** |
| Estado | `connected` |
| Imagen que envía el PC | 1920 × 1080 |
| Imagen que recibe del móvil | **1080 × 1920** |
| Fotogramas | 14 por segundo |
| Calidad | 2521 kbps |
| Ida y vuelta | **5 ms** |

Cómo se leen estos números, que no es evidente:

- **5 ms no es la cifra real de una partida.** Los dos aparatos estaban en
  la misma casa, así que ni salió a internet. Con el amigo lejos lo normal
  serán entre 20 y 60 ms. Sigue siendo diez veces menos que una emisión
  normal, que es de lo que se trataba.
- **1080 × 1920 es el móvil en vertical**, no un fallo. Se pide
  `1920 × 1080` y la cámara da esa cantidad de píxeles, pero girados. Para
  una mesa hay que **poner el móvil de lado**: en vertical cabe un tercio
  de mesa y las cartas salen más pequeñas.
- **14 fotogramas en vez de 24** es la cámara defendiéndose de la poca luz:
  con poca luz alarga la exposición y da menos imágenes. Aquí da igual,
  porque lo que se mira está quieto, pero **más luz sobre la mesa da más
  nitidez**, y la nitidez sí importa.
- **2521 kbps** está justo por debajo del tope de 3000 que se puso. O sea
  que el tope manda y no se dispara el gasto.

### ⚠ Lo que sigue sin probarse

- **Una partida de verdad, con el amigo lejos.** Lo de arriba fue dentro de
  la misma casa. Falta saber si la conexión directa aguanta entre dos casas
  distintas, que es justo el caso en el que haría falta el relé.
- **El relé**, que no tiene credenciales puestas todavía.
- Claude no puede probar nada de esto: hace falta iniciar sesión, y eso es
  escribir contraseñas. **Por eso el bloqueo de arriba llegó a producción**
  y lo encontró Héctor. La lección está apuntada al final.

---

## La puerta, completa (28/10/2026)

Héctor: *«Haz lo del login completo: registrarse, iniciar sesión, he
olvidado la contraseña»*. Eso **cambia la regla 3**, que decía registro
cerrado y cuentas a mano, y la escribió él mismo. Se le dijo antes de
hacerlo, y aun así se hace, porque es su decisión.

### Lo que había y por qué no valía

Lo de antes tenía un agujero que no se veía hasta usarlo: **entrar no es
tener clave**.

- A `troil` lo metió por **invitación**. Ese enlace identifica, pero no deja
  clave puesta. El día que cerrara sesión, fuera de su propia cuenta.
- Y el botón de **«he olvidado la clave»** mandaba el correo, el enlace
  metía dentro… y no había ninguna pantalla donde escribir la clave nueva.
  **Prometía algo que no cumplía**, que es peor que no estar.

### Lo que hay ahora

- **Entrar**, **crear cuenta** y **he olvidado la clave**, en tres pestañas
  de la misma puerta.
- **`PantallaClave`**, que faltaba, y sirve para los dos casos: vienes del
  correo, o entraste por invitación y nunca pusiste una. Desde dentro está
  en «Tu cuenta».
- Al crear cuenta: clave de **ocho** mínimo, repetida, y **código de
  invitación**.

### El código de invitación: hasta dónde llega

Se dice en `src/registro.ts` y aquí, porque es fácil creerse más protegido
de lo que uno está: **el código para a quien pase por delante, y no para a
quien sepa mirar el código de la página.** Viaja al navegador como todo lo
demás. El cierre de verdad es el interruptor de Supabase (*Authentication →
Sign In / Providers → Allow new users to sign up*), y si se apaga, esta
pantalla lo dice sola, porque el error ya está traducido.

Lo que sí protege del todo, pase lo que pase: **sin el código de la mesa**,
que se dicta y cambia cada partida, una cuenta de más no ve vuestra partida
ni enciende nada vuestro.

### Los ajustes de Supabase: ya estaban (comprobado el 28/10/2026)

Se dijo que había dos cosas que tocar. **Se fue a mirar y las dos ya
estaban bien**, de la fase 1:

1. *Authentication → Sign In / Providers*: **«Allow new users to sign up»
   encendido**, y «Confirm email» también.
2. *Authentication → URL Configuration*: Site URL
   `https://magic-mesa.duelo.workers.dev` y, en Redirect URLs,
   `https://magic-mesa.duelo.workers.dev/**`.

**Y eso deja una cosa clara que conviene no olvidar:** el registro de
Supabase **nunca estuvo cerrado**. Lo único que faltaba era el botón. O
sea que, desde la fase 1, cualquiera que supiera pedirlo podía crearse una
cuenta en el proyecto. No ha pasado nada porque una cuenta suelta no puede
tocar nada (ni Pokémon ni vuestras partidas), pero **«no hay botón» no es
«está cerrado»**, y durante dos días se escribió como si lo fuera.

⚠ Y un cabo suelto que se vio de paso: el **Site URL** del proyecto apunta
a Magic, no a Pokémon. Si la web de Pokémon llegara a mandar correos de
recuperar clave, volverían a Magic. Hoy no molesta; si algún día Pokémon
usa esos correos, hay que mirarlo.

Y un aviso que conviene no olvidar: **este proyecto de Supabase lo comparte
con la web de Pokémon**. Abrir el registro abre cuentas en el proyecto
entero. No es grave —ya se comprobó el 26/10 que `authenticated` no tiene
ningún permiso ni política sobre `marcas` ni `puntos`, así que una cuenta
nueva no puede tocar nada de Pokémon—, pero hay que saberlo.

### Detalles pensados

- Al pedir clave nueva se contesta **lo mismo exista o no la cuenta**.
  Decir «ese correo no está» le cuenta a cualquiera quién tiene cuenta aquí.
- `VENIMOS_DE_RECUPERAR` se mira **antes de crear el cliente** de Supabase,
  arriba del todo de `supabase.ts`. Al crearse, Supabase lee ese trozo de la
  dirección y lo borra; mirarlo después sería mirar un sitio vacío.
- Al **salir** se olvida que veníamos a recuperar, o el siguiente que entre
  en ese navegador se encontraría la pantalla de poner clave sin pedirla.

### Probado el 28/10/2026

Las tres pestañas pintan lo suyo; el código equivocado, la clave corta y las
dos claves distintas dan cada uno su recado; el código vale en minúsculas; y
la pantalla de clave nueva se ve bien. **Sin probar: crear una cuenta de
verdad y los dos correos**, que dependen de los dos ajustes de Supabase de
arriba.

---

## Fase 4: los contadores (27/10/2026)

**Vidas, veneno y energía**, más el turno y la fase. Y nada más. Van **por
el canal de datos del enlace**, el mismo camino directo que el vídeo. Ni
base de datos ni Worker: si Supabase está dormida, los números siguen
funcionando.

### ⚠ Lo que se quitó el mismo día, y por qué

La primera versión traía además **cartas en mano**, **cementerio** y
**experiencia**. Héctor las tiró en cuanto las vio:

> «No vamos a estar sumando y restando cartas cada vez que jugamos,
> robamos… sería una tortura jugar.»

Tiene toda la razón, y es una regla que vale para todo lo que venga
después: **un contador que hay que corregir en cada acción de la partida no
lo lleva nadie al día**. Las cartas de la mano cambian al robar y al jugar,
o sea constantemente; el cementerio igual. Y lo que no se lleva al día deja
de ser información: es un número que miente.

Regla, entonces: **si se puede contar mirando la mesa por la cámara, no se
apunta.** Las cartas de la mano y las del cementerio se ven.

La experiencia se fue por otra razón: **es de Commander**, y aquí se juega
de dos.

Se quedan las tres que cambian **solo cuando una carta lo dice**: vidas,
veneno y energía. Son pocas veces por partida y son deliberadas.

La energía se quedó por mi cuenta, por si acaso, y acertó: **Héctor tiene un
mazo de energía.**

### La decisión que ordena todo: cada uno lleva SUS números

Los del rival se ven pero **no se tocan**. Así se juega en una mesa de
verdad: le dices «te quito tres» y los baja él.

Y no es solo fidelidad. **Quita de un plumazo el problema de los dos tocando
el mismo número a la vez.** De cada número manda uno solo, así que no hay
nada que resolver: ni versiones, ni relojes, ni «gana el último». Era eso o
montar un mecanismo de mezcla para un caso que entre dos amigos casi no
pasa y que, cuando pasa, se arregla hablando.

Lo único que es de los dos es **el turno y la fase**, porque ahí sí hay una
sola verdad. Eso lleva un contador de cambios (`secuencia`) y se acepta lo
que llega solo si trae más cambios que lo que tienes. **Sin eso, dos
pulsaciones casi a la vez se devuelven el turno una a otra sin parar.**

### Los turnos son de uno, no de los dos (Héctor, 27/10/2026)

> «Hay que tener en cuenta que los turnos no son 1 - 2 - 3 - 4… Es turno 1
> usuario A, turno 1 usuario B, turno 2 usuario A…»

Exacto, y es la forma de contar de Magic: un turno **es de alguien**. Se
guarda **un solo número**, `turnoEnJuego`, que cuenta los turnos de los dos
seguidos: 1, 2, 3, 4… Y de ahí sale todo sin guardar nada más:

| Quieres saber | Se saca así |
|---|---|
| De quién es el turno | del que empieza si `turnoEnJuego` es impar, del otro si es par |
| Qué número es **para él** | `turnoEnJuego / 2`, redondeando hacia arriba |
| Cuántos turnos lleva la partida | `turnoEnJuego - 1` |

**Un solo número y ninguna forma de que las dos cuentas se descuadren.** La
alternativa era llevar un contador por jugador y quién juega, que son tres
cosas que hay que mantener de acuerdo entre dos navegadores.

Esto es además lo que pidió Héctor para el historial: **los turnos jugados
salen de aquí**, sin apuntar nada aparte. Fase 8.

### El turno solo lo mueve quien lo juega (Héctor, 27/10/2026)

> «Con el PC paso el turno de los 2 jugadores, solo debería dejar pasar si
> es mi turno.»

«Siguiente fase» y «Pasar turno» están apagados cuando no te toca, **y la
comprobación está dentro de la función, no solo en el botón**. Dos razones:
la barra espaciadora no pasa por el botón, y así se mira contra el estado
del momento y no contra el que hubiera cuando se pintó la pantalla.

**«Turno atrás» lo tienen los dos a propósito.** Si pasas turno sin querer,
el turno deja de ser tuyo; sin esta excepción no podrías deshacer tu propio
error y tendrías que pedírselo al otro.

### Por su nombre, nunca «ti» (Héctor, 27/10/2026)

> «Pone "turno X de ti", prefiero turno X de Troil (aunque sea yo mismo).»

«Turno 17 de ti» obliga a parar medio segundo a pensar de quién habla.
«Turno 17 de Héctor» no. En la columna de los contadores sí se queda «Tú»,
porque ahí la pregunta es otra: cuáles son mis números.

### Quién empieza: dos botones, de momento

Hace falta saberlo para contar los turnos, así que hay dos botones
(«Empiezo yo» / «Empieza X») hasta que esté la **moneda con los avatares**,
que es lo que lo decidirá de verdad en la fase 7. El botón de «Partida
nueva» lo borra, para volver a elegir.

### La barra espaciadora pasa turno

Es la tecla que más se usa en una partida, y así no hay que soltar las
cartas para buscar el ratón.

Dos detalles que costaron una vuelta:

- **Se le quita el espacio a los botones.** Un botón se activa con el
  espacio, así que si acabas de pulsar «Turno atrás» con el ratón, ese
  botón se queda con el foco y el siguiente espacio volvería a ir atrás.
  Cortando el espacio en `keydown` se evita, porque el botón se activa al
  soltar. **El espacio significa pasar turno siempre, mire donde mire el
  foco.** Comprobado en el navegador.
- **Dentro de un campo de texto el espacio es un espacio**, y punto.
- Mientras estés en una mesa, el espacio **ya no baja la página**. Es el
  precio, y con la pantalla de la fase 9 (todo a la vista, sin desplazar)
  dejará de notarse.

Y hay **«Turno atrás»**, porque una barra espaciadora se pulsa sin querer.

### ⚠⚠ El que llega primero habla solo (arreglado 27/10/2026)

**Este es el fallo de verdad, y se había arreglado mal dos veces antes.**
Héctor: «no veo la imagen del contrario, y solo puedo pasar el 1º turno y
el otro no lo ve, **es como si fueran mesas diferentes con el mismo
código**».

La causa, por fin entera: **los dos lados tardan lo suyo en abrir su
enlace**, porque antes preguntan a `/api/servidores`, que es una ida y
vuelta a la red. El que termina primero manda su oferta y sus candidatos a
una mesa donde todavía no hay nadie escuchando. Se pierden. Y como después
se queda esperando respuesta (`have-local-offer`), **ya no vuelve a
proponer**: los seguros que había miraban `signalingState === 'stable'`, y
el suyo ya no lo estaba.

Hasta la fase 3 esto no se notaba porque **la oferta solo se creaba al
pulsar «Encender la cámara»**, mucho después de que los dos estuvieran
montados. En la fase 4 el canal de datos hace que la oferta salga sola, al
instante: justo cuando la carrera está más apretada.

Cómo queda arreglado, de una vez:

- **Se guarda todo lo que se le manda al otro**, en orden. Cuando llega su
  `{listo:true}`, si no nos ha contestado nunca (`currentRemoteDescription`
  vacío) **se le repite entero**. No importa quién llegó primero ni cuánto
  tardó.
- **Las señales que llegan se atienden de una en una**, encadenadas. Antes
  cada una corría por su cuenta y un candidato podía adelantarse a la
  descripción a la que pertenece, que es justo lo que pasa al repetir
  varias de golpe.

**Probado de verdad, no supuesto** (27/10/2026): dos enlaces en la misma
página, con uno montándose **800 ms más tarde a propósito** para reproducir
la carrera. Con el código de antes los dos se quedaban en `—` y el canal
cerrado después de cuatro segundos. Con el arreglo, los dos llegan a
`connected`, el canal se abre y los datos viajan en los dos sentidos.

**Cómo se prueba esto sin dos sesiones:** `useEnlace` recibe el envío y la
recepción de señales como parámetros, así que se le pueden poner dos
instancias en una página y un relé de mentira entre ellas. Los
`RTCPeerConnection` son de verdad y se conectan por candidatos locales.

### ⚠ El canal de datos no se abría (arreglado 27/10/2026)

Héctor lo vio en la primera prueba: los dos en la mesa, pero «no se ven las
vidas del contrario» y el aviso rojo de *todavía no hay camino directo*.

**Era el mismo fallo de la fase 3, otra vez, en otro sitio.** El seguro que
se puso allí (`{listo:true}`: cuando el otro avisa de que ya escucha,
vuelves a proponer) tenía una condición de más:

```
if (!pc.getSenders().some((e) => e.track)) return   // ← mal
```

O sea: **solo volvía a proponer si había una cámara encendida.** Sin
cámaras, el único que tenía algo que ofrecer era el que abre el canal de
datos, y si justo su oferta se perdía, no volvía a proponerla nunca. Los
contadores se quedaban cada uno en su casa.

Arreglado preguntando por lo que de verdad hay que ofrecer: **una cámara o
el canal de datos.** Queda además bien repartido: el que abre el canal lo
tiene desde el principio y es quien vuelve a proponer; el otro no propone
nada vacío, porque todavía no tiene nada.

**La lección, que ya van dos veces:** al añadir una cosa nueva que viaja por
el enlace, hay que preguntarse si los seguros que ya había la cuentan. Un
seguro que mira solo lo que existía cuando se escribió no protege lo de
después.

### El canal de datos lo abre uno solo

`createDataChannel` lo llama **el «maleducado»**, el mismo que no cede en
los choques de ofertas; el otro lo recoge por `ondatachannel`. Si lo abren
los dos hay dos canales y una renegociación de más, con choque garantizado
nada más empezar.

Y como el enlace se abre al estar los dos en la mesa (ver fase 3), **los
contadores funcionan sin que nadie encienda la cámara**.

### Lo que se guarda y lo que no

- **Tus números se guardan en el navegador**, por mesa
  (`magic:contadores:CÓDIGO`). Una recarga sin querer en mitad de una
  partida no te pone las vidas a veinte otra vez.
- **El turno y la fase no se guardan**, y no hace falta: al abrir el canal
  cada uno manda un `hola`, el otro contesta con su estado, y como su
  `secuencia` es mayor que la tuya recién empezada, se recupera solo.
- **Nada de esto va a Supabase.** Lo que sobrevive a la partida es el
  historial, y eso es la fase 8.

### Detalles pensados, por si alguien los cambia sin saber

- **Las vidas pueden bajar de cero.** Estar a cero no es perder (regla 6) y
  hay cartas que lo aprovechan. Los demás contadores se paran en cero.
- **El veneno se para en diez** y se pone en rojo. Se marca y ya: **la
  aplicación no dice que nadie haya perdido**, igual que con las vidas.
- **Veneno e infección son el mismo contador.** En Magic la infección pone
  contadores de veneno; dos casillas distintas serían dos sitios donde
  apuntar lo mismo, que es justo lo que prohíbe la regla 9.
- **Nada de daño de comandante ni nada de Commander**: aquí se juega de dos.
- **Antes de añadir un contador nuevo, la pregunta es cuántas veces hay que
  tocarlo en una partida.** Si la respuesta es «en cada turno», sobra.

### Probado el 27/10/2026

Montando el panel suelto en el navegador, sin sesión: suben y bajan las
vidas, el veneno se para en diez y se pone rojo, las fases avanzan y al
pasar de la última cambia el turno, y lo guardado aguanta una recarga (16
vidas y 10 de veneno seguían ahí). En móvil las dos columnas se apilan y los
botones salen grandes.

**Y el 27/10 se probaron los dos lados a la vez**, montando los dos paneles
en la misma página con un canal de mentira entre ellos. Comprobado: las
vidas de uno salen en el panel del otro, el turno se ve igual en los dos,
los botones de turno se apagan en el lado al que no le toca y la barra
espaciadora solo mueve el turno de quien lo juega.

**Y el canal de datos de verdad también está probado** (27/10/2026): dos
`RTCPeerConnection` reales en una página, uno llegando tarde a propósito,
llegan a `connected` y se pasan datos en los dos sentidos. Ver «El que llega
primero habla solo».

**Lo único que sigue sin probarse es entre dos máquinas distintas**, con la
mesa de Cloudflare de por medio. Eso hace falta sesión en dos sitios.

### Truco al probar en el navegador

Una captura puede adelantarse al repintado de React y hacer creer que una
pulsación no ha entrado. Aquí pasó: once clics en el veneno parecían dos. No
era un fallo, era la foto. **Antes de dar por roto algo así, volver a mirar
un segundo después.**

---

## Fase 5: las pegatinas (27/10/2026)

Nueve clases: `+1/+1`, `−1/−1`, ficha, tapada, vuela, arrolla, toque mortal,
vínculo vital y «esta carta». Las tres primeras llevan número. Viajan por el
canal de datos, como los contadores.

### Sobre el fotograma, no sobre la caja del vídeo

La regla 4 dice coordenadas normalizadas (0 a 1), y hay un detalle que no
está en la regla pero la hace cierta: con `object-fit: contain`, **un móvil
en vertical deja dos franjas negras a los lados**. Si el 0 a 1 se midiera
sobre la caja, la pegatina caería varios centímetros más allá de donde la
pusiste. Así que la capa se coloca sobre **el fotograma pintado**, calculado
con el `videoWidth`/`videoHeight` real y un `ResizeObserver`.

### El arrastre se escucha en la ventana

Lo primero que se probó fue `setPointerCapture`, que suena a lo correcto, y
**no movía nada**. Escuchando `pointermove` en la ventana desde el
`pointerdown` funciona siempre: aunque el dedo se salga de la pegatina
—que es lo normal al mover deprisa—, aunque pase por encima de otra y
aunque React repinte en medio.

Y `touch-action: none` en la pegatina, o arrastrar con el dedo movería la
página en vez de la pegatina.

### Mover todas de una vez

Es lo que ya decía la investigación para cuando alguien da un golpe a la
cámara: en vez de recolocar pegatina por pegatina, se arrastra **el grupo
entero de esa mesa** de un gesto. Está como un botón que se queda puesto.

### Cada uno puede pegar en las dos mesas

Hay un selector de **«pegar en»**. Marcar tus criaturas es lo normal, pero
señalar una carta del rival con «esta» también, y en una mesa de verdad se
señala con el dedo.

### Mientras arrastras, el otro no te mueve la pegatina

Lo que llega del otro se acepta entero salvo la que tengas cogida en ese
momento, que mantiene tu posición. Y mientras arrastras **se manda como
mucho una vez cada 60 ms**: a sesenta fotogramas por segundo serían sesenta
mensajes y no hace ninguna falta.

### Probado el 27/10/2026

Dos lados en la misma página con un canal de mentira entre ellos: pegar,
arrastrar (cae en las coordenadas exactas), subir y bajar el número, quitar,
mover todas a la vez (las dos se desplazan lo mismo) y que todo eso se vea
igual en el otro lado, en los dos sentidos. Y la tarjeta del vídeo montada
con la paleta, comprobando que cada pegatina cae en la mesa elegida.

**Sin probar:** con dos navegadores de verdad y con cámara encendida, que es
donde se ve si el fotograma calculado cuadra con la imagen.

---

## Fase 6: leer las cartas (28/10/2026)

Tres cosas, y las tres hechas: **la foto de cerca**, **buscar por nombre** y
**buscar por número de colección**, con el lateral de consultas.

### La foto: se le pide al otro, no se amplía la que te llega

Pulsas «Tocar una carta» y tocas la carta en la mesa del rival. Su navegador
recorta **ese trozo de su imagen a resolución nativa** y te lo manda.

Ampliar el vídeo que te llega no serviría de nada: ya viene comprimido y
reducido. La imagen buena solo existe en el otro lado, y por eso la foto se
pide allí. **Esto es lo que gana la partida, antes que ningún OCR.**

- Recorte: **26 % del ancho** del fotograma, y el alto sale de la proporción
  real de una carta (63 × 88 mm), no de un número inventado. Con eso cabe la
  carta entera aunque hayas tocado descentrado.
- Va **en trozos de 16 000 letras** por el canal de datos, porque un mensaje
  no puede ser tan grande como una foto, y se vuelve a juntar al llegar.
- Si el otro tiene la cámara apagada, lo dice; si no contesta en diez
  segundos, también. Nunca se queda girando.

**Probado el 28/10/2026** con un lienzo de 1920 × 1080 haciendo de cámara:
pidiendo el punto (0,6, 0,52) llega un recorte de **499 × 697** centrado
justo en la carta que se pidió, repartido en dos trozos. Así se prueba todo
el camino sin encender ninguna cámara.

### Las dos búsquedas

- **Por número de colección** (`NEO 123`): exacta, y vale para una carta
  japonesa aunque no sepas cómo se llama, porque el número es el mismo en
  todos los idiomas. Probado: `NEO 123` en japonés devuelve *Tatsunari, Toad
  Rider* y, debajo, el nombre impreso `カエル乗り、達成`.
- **Por nombre**: perdona **un** fallo al escribir, no dos. Está medido más
  arriba y en la pantalla se dice tal cual, sin prometer de más.

### El lateral de consultas, privado

Lo que miras **no viaja**. Si el rival viera tus consultas sabría qué cartas
no conoces y cuáles te preocupan, y eso es información de partida. Para
enseñarle una hay un botón, **una por una y a mano**. Las que te enseña él
se distinguen por el borde.

Se guardan en el navegador mientras dura la partida.

### El OCR, puesto el 28/10/2026

Encuadras una carta, llega la foto, **se lee el nombre y se busca sola**.

- Corre sobre **la franja de arriba del recorte** (el 16 %), que es donde
  está el nombre, no sobre la carta entera.
- La franja se dibuja **al triple de tamaño y en blanco y negro duro**
  antes de pasarla por Tesseract.
- `tessedit_char_whitelist` con solo letras y `pageseg_mode 7` (una sola
  línea), que es lo que dispara el acierto.
- **Se carga al usarlo, no al abrir la web.** Son unos 4-5 MB la primera
  vez y queda en caché. En la compilación va en su propio trozo.

**Si falla no pasa nada, y eso es parte del diseño**: la foto sigue ahí y
el buscador está justo debajo. Es un acelerador, no una vía.

**Probado el 28/10/2026** con una cámara de mentira que pinta cartas con su
banda de nombre: encuadrando la segunda llega la foto, lee *Hinterland
Harbor* y devuelve **«Puerto interior»**, la impresión española. Todo el
camino, de un arrastre.

### El idioma se elige una vez (Héctor, 28/10/2026)

> «En la sección de cartas nunca preguntes el idioma, siempre español y
> punto. Como mucho, en ajustes de cuenta, preferencia de idioma. Pero el
> idioma se elige una vez, no decenas de veces.»

Es la regla 9 otra vez: **una pregunta que hay que contestar cada vez es
una pregunta mal puesta.** Está en el menú de la cuenta → Ajustes, por
defecto español, guardado en el navegador.

Y resuelve lo que de verdad hacía falta con las cartas en idiomas raros:
**no es ampliarlas, es traducirlas.** Sea como sea como se encuentre la
carta (por nombre, por número o leyéndola de la foto), después se pide su
impresión en tu idioma por `oracleid`, que es el identificador que no
cambia de un idioma a otro. Si esa carta nunca se imprimió así, se enseña
la que haya: mejor la inglesa que nada.

### ⚠⚠ La foto llegaba en negro (arreglado 28/10/2026)

Héctor probó el OCR con una carta de verdad y no leyó nada. **Y no era el
OCR: la foto llegaba completamente en negro**, con la imagen del vídeo
perfecta al lado. No había nada que leer.

La causa: para sacar el recorte se creaba un `<video>` suelto, **sin
colgarlo de la página**, y se dibujaba en un lienzo. Un vídeo que no está
en la página el navegador puede decidir no descodificarlo, y entonces
`drawImage` pinta negro. Con el lienzo de las pruebas funcionaba —la
imagen ya estaba hecha— y con una cámara de verdad no.

Dos arreglos, los dos necesarios:

1. **El vídeo se cuelga de la página**, fuera de la pantalla y de dos
   píxeles, y se quita en cuanto se ha pintado el fotograma.
2. **Se espera a un fotograma de verdad** con `requestVideoFrameCallback`,
   no a `loadeddata`: eso solo dice que hay metadatos, no que haya imagen.

**La lección:** una cámara de mentira hecha con un lienzo **no prueba el
camino de una cámara de verdad**. Sirve para la lógica —el recorte, los
trozos, el reensamblado—, y se quedó corta justo en el único punto donde
el navegador decide por su cuenta si se molesta en descodificar.

Comprobado después del arreglo: la foto llega con imagen (brillo medio
143 sobre 255, no 0) y la carta sale identificada.

### El OCR no puede dar por hecho dónde está el nombre (29/10/2026)

Con la foto ya buena, seguía sin leer: «con definición muy buena no
detecta el nombre de la carta».

El fallo era **suponer que el nombre está en el 16 % de arriba del
recorte**. Eso solo se cumple si encuadras la carta clavada. Encuadrando
con margen —que es lo normal y lo que hace cualquiera— ese 16 % es mesa
negra, no nombre.

Tres cambios, y el tercero es el que importa:

1. Se mira **el tercio de arriba** (38 %), no una rendija.
2. Modo **bloque de texto**, no «una sola línea», para sacar todo lo que
   haya ahí.
3. **No se elige el nombre: se prueban las líneas una por una contra
   Scryfall** hasta que una resulta ser una carta. El que sabe qué es una
   carta es Scryfall; el lector solo sabe leer. Antes se apostaba por una
   línea y, si fallaba, se acabó.

Y se quitó el blanco y negro forzado con un umbral a ojo: se pasa a grises
y se deja que Tesseract decida el corte mirando la imagen, que lo hace
mejor que un número escrito a mano.

**Probado el 29/10/2026 encuadrando ancho a propósito**, con la carta
ocupando menos de la mitad del recuadro y negro alrededor: lo acierta
igual.

### Dos cosas más de ese mismo día

- **El recuadro ya no se queda pegado a la imagen.** Se dejó puesto el día
  antes para ver qué habías encuadrado, y estorbaba: tapaba la mesa y, al
  cambiar las imágenes de sitio, aparecía dibujado sobre la otra. Lo que
  encuadraste ya se ve en la foto.
- **Al pulsar «Ampliar una carta», la mesa del rival se pone delante.** Es
  la que vas a encuadrar, y en el recuadro de la esquina no se puede
  encuadrar nada.

### ⚠⚠ Era la banda oscura (resuelto el 29/10/2026)

En cuanto se enseñó en pantalla lo leído, el dato llegó en un mensaje:
foto **perfecta** de una *Ghalta the Unstoppable*, y el lector había sacado
**`a - a SEN a`**. No era «lee regular»: no leía nada.

La causa, y es de libro: **Tesseract da por hecho texto oscuro sobre fondo
claro.** En Magic la banda del nombre es muchas veces al revés —letras
claras sobre banda oscura—, y con esas cartas no lee nada en absoluto.

**Y por eso tres arreglos seguidos fallaron:** las cartas pintadas de las
pruebas tenían letra oscura sobre banda clara, que es justo el único caso
que ya funcionaba. La prueba confirmaba lo que no había que confirmar.

Arreglado con **dos pasadas, tal cual y con los colores del revés**, y
juntando las líneas de las dos. Además:

- **Se estira el contraste** antes de leer, que una foto con brillos sale
  apagada.
- **Se tiran las líneas que no tienen ni una palabra de cuatro letras**,
  que es exactamente lo que era `a - a SEN a`.

**Probado el 29/10/2026** con una carta de banda oscura y letra clara:
lee *Ghalta the Unstoppable* y devuelve **«Ghalta, la Imparable»**.

### Lo que se hizo antes de saberlo (29/10/2026)

«No pilla ni una carta bien con el OCR.» Y aquí hay que parar y decirlo:
**se han hecho tres arreglos a ciegas**, cada uno razonable, y ninguno ha
resuelto el problema de verdad, porque **nunca se ha visto qué lee el
lector con una carta de verdad**. Las pruebas son con cartas pintadas:
tipografía limpia, de frente, sin grano. Una carta real lleva una letra
con remates muy marcada, brillo del plástico, grano de la cámara y algo
de ángulo.

Lo que se ha hecho, en vez de un cuarto arreglo a ciegas:

1. **Se enseña en pantalla lo que ha leído**, acierte o falle. Es lo único
   que distingue «lee mal» de «lee bien y busca mal», y sin eso se seguiría
   adivinando.
2. **Lo leído se deja escrito en el buscador.** Aunque falle, corriges una
   letra y le das a Buscar: mucho menos trabajo que teclear el nombre.
3. **Se busca perdonando más.** `fuzzy` aguanta un fallo y un OCR comete
   más, así que si falla se tira de **autocompletar** de Scryfall con el
   principio del nombre y con la palabra más larga, que perdona todo lo
   que venga detrás.

**La lección, y van tres:** cuando un arreglo a ciegas falla dos veces, el
siguiente trabajo no es otro arreglo, es **conseguir ver el dato**.

Si con esto se ve que lee basura, la salida ya está escrita más arriba y
es el **número de colección**: ASCII puro, lista blanca de dígitos y
mayúsculas, y resultado exacto.

### ⚠ El OCR queda en el banquillo (Héctor, 29/10/2026)

> «Nada, ya lo dejaremos para el final y si no funciona quitamos la
> función.»

Después del arreglo de la banda oscura **sigue sin acertar con cartas de
verdad**. Se deja como está y se decide al final: o se arregla con el
número de colección, o **se quita**.

Y quitarlo no sería un fracaso: **lo que de verdad resolvía el problema
era la foto ampliada y el buscador**, y las dos funcionan. El OCR siempre
fue un acelerador. Lo que no puede quedarse es a medias, prometiendo algo
que no cumple.

Si se retoma, lo que hay que probar primero es **el número de colección**
en vez del nombre: dígitos y tres letras, lista blanca, y resultado
exacto. Está medido más arriba.

### ⚠ Lo que sigue sin probarse del OCR

**Una carta de verdad, por una cámara de verdad.** Lo probado es una carta
pintada: letras perfectas, de frente y con todo el contraste del mundo. En
una mesa hay ángulo, sombras y la carta puede estar girada. Las dos trampas
apuntadas arriba (carta tapada y perspectiva) **siguen sin resolver**, y es
posible que el acierto baje mucho.

Si baja, la salida no es pelearse con Tesseract: es **el número de
colección**, que ya está medido y es ASCII puro. Entonces se lee la franja
de abajo en vez de la de arriba y se busca por número, que además da
resultado exacto.

### Una corrección a lo que estaba escrito

Las notas decían que Scryfall pide identificarse con un `User-Agent` propio.
**Desde un navegador eso no se puede cumplir**: es una de las cabeceras que
el navegador no deja tocar. Lo que sí está en nuestra mano es el ritmo, y se
respeta: las peticiones van en cola, de una en una, con 120 ms entre ellas.

---

## Fase 7: la base de los mazos (29/10/2026)

Aplicada la migración `magic_002_mazos_y_cartas`. Dos tablas y una columna
nueva, probadas antes en una transacción con `rollback` como manda el
proyecto.

### Qué se creó

| Tabla | Qué guarda |
|---|---|
| `magic.mazos` | nombre, formato, notas, portada (identificador y nombre), activo, creado, tocado |
| `magic.cartas_del_mazo` | nombre, cantidad, identificador de Scryfall, si va en la **reserva**, y el orden |

Y `magic.jugadores` tiene ya una columna `avatar`, vacía de momento, para
cuando se monte lo de la imagen y la moneda.

### La decisión que importa: el mazo del rival NO se lee de la base

La regla 7 dice que el rival ve tu mazo durante la partida. **Eso no se
hace abriendo permisos**, se hace mandando el mazo elegido **por el canal
de datos**, como todo lo demás de la partida.

Dos cosas se ganan con eso: los permisos se quedan en lo simple —lo tuyo
es tuyo y nadie más lo ve— y, sobre todo, **el mazo se ve aunque Supabase
esté dormida**, que es la regla 1.

### Detalles del diseño

- **De la portada se guarda el identificador y el nombre, no la imagen.**
  La imagen se le pide a Scryfall al pintarla. Ya estaba decidido y no
  cambia.
- **`reserva`** para el banquillo, que en Magic se cambia entre partidas.
- **Borrar un jugador se lleva sus mazos, y borrar un mazo sus cartas**
  (`on delete cascade`). Lo que no se puede llevar por delante es el
  historial: por eso la regla 8 dice que la partida guarda su propia copia
  del nombre y la portada.
- Permisos: solo `authenticated`, nada para `anon`. Comprobado.

> ⚠ Supabase, por sus permisos por defecto del esquema, le da a
> `authenticated` también `TRUNCATE`, `TRIGGER` y `REFERENCES`, que no se
> pidieron. No es alcanzable desde la API (PostgREST no expone `TRUNCATE`)
> y viene de la fase 1, pero conviene saberlo y no tocarlo a la ligera:
> este proyecto lo comparte con la web de Pokémon.

### El formato del export (visto el 29/10/2026)

Héctor pasó sus quince mazos. El formato es el de Moxfield/Arena y es
sencillo, pero tiene tres trampas:

```
2 Ambrosia Whiteheart
1 Counterspell (FCA) 4
15 Island (EOE) 269

// MAYBEBOARD
1 Soul Swallower (tercera copia)
```

- **Una carta por línea: `cantidad nombre`.**
- **La edición y el número son opcionales**, entre paréntesis y detrás:
  `(FCA) 4`.
- **`// MAYBEBOARD` separa** lo que no va en el mazo principal.
- ⚠ **Trampa:** hay paréntesis que NO son la edición, como
  `(tercera copia)`. Solo vale como edición si son **de dos a seis letras o
  números entre paréntesis seguidos de un número**; lo demás es parte del
  nombre o una nota.
- Las líneas en blanco se ignoran.

### Tres zonas, no dos (Héctor, 29/10/2026)

Se preguntó si el *maybeboard* era la reserva, y no lo es. Ahora una carta
está en una de tres:

| Zona | Qué es |
|---|---|
| `principal` | El mazo con el que juegas |
| `banquillo` | El *sideboard*: lo que cambias entre partidas |
| `posibles` | El *maybeboard*: lo que te planteas meter y no está |

Migración `magic_003_tres_zonas_del_mazo`. Los quince mazos importados
venían del `// MAYBEBOARD` del export, así que esos pasaron a `posibles`.

### La pantalla de mazos, a dos columnas (Héctor, 30/10/2026)

Iba todo en una columna de 44 rem y «desaprovechas media pantalla», con
las cartas de cuatro en cuatro. Ahora, con un mazo abierto:

- **La página se ensancha** (`pagina--ancha`), que esto no se juega en el
  móvil y no hay por qué apretarlo.
- **A la izquierda los datos** —portada grande, nombre, formato, notas,
  añadir carta, importar y borrar—, y **pegada arriba** (`sticky`) para
  que no se vaya al desplazar.
- **A la derecha las cartas**, que con el ancho pasan de cuatro por fila a
  siete u ocho.

### Tocar las cartas una a una

- **Se añade escribiendo el nombre**, con el sitio donde va al lado. Si la
  carta ya está, sube la cantidad en vez de repetirla.
- **El botón derecho abre un menú**: «Quitar una» o «Quitar todas». Una ×
  en cada carta era una × tapando el dibujo de todas.
- **Importar está detrás de un botón**, en un diálogo. No se importa todos
  los días, y tener el cuadro de texto siempre abierto le robaba sitio a
  lo que sí se mira.
- Lo que tocas se ve al momento: se trabaja sobre una copia en memoria y
  se guarda detrás, sin esperar a la ida y vuelta.

### ⚠ Las fotos se piden por lo que hay, no por un contador

Al reemplazar las cartas no aparecían las fotos nuevas. La culpa era de
pedirlas con **un contador de vueltas** que había que acordarse de subir.

Ahora la petición va **atada a los propios nombres**: se junta la lista en
una cadena y, si esa cadena cambia, se piden otra vez. No hay nada que
acordarse de subir, porque **la condición es el dato**.

### ⚠⚠ El buscador se inventaba cartas (arreglado el 30/10/2026)

Héctor encuadró **un cuadro negro** y la web le contestó, muy segura,
«Zhang He, Wei General». El lector había sacado `EIGEN Ly` y el apaño de
autocompletar se tragó eso como si fuera un nombre.

**Una carta inventada con seguridad es peor que no dar ninguna**, porque
el que la mira se la cree. Dos cierres, los dos necesarios:

1. **No se lee un trozo liso.** Antes de pasar nada al lector se mira si
   hay algo que leer: si casi todos los píxeles son del mismo tono, no hay
   texto y se para ahí. Se mira **antes** de estirar el contraste, que
   estirar le saca relieve hasta al ruido.
2. **La sugerencia tiene que parecerse a lo leído.** Autocompletar
   devuelve algo casi siempre, le des lo que le des. Ahora se exige que
   más de la mitad de las letras de lo leído aparezcan, en orden, en la
   sugerencia.

**Probado el 30/10/2026:**

| Se lee | Antes | Ahora |
|---|---|---|
| `EIGEN Ly` | Zhang He, Wei General | **nada** |
| `a - a SEN a` | algo | **nada** |
| `Ghalta the Unstoppble` | — | Ghalta the Unstoppable |
| `Canopv Vista` | — | Canopy Vista |

O sea: deja de inventar **sin** perder la tolerancia a las erratas, que
era lo que había que conseguir.

### Más pegas de uso (Héctor, 30/10/2026)

- **Los desplegables venían con el estilo de Windows**, blancos y azules,
  cantando al lado del resto. Ahora llevan el de la web, con la flecha
  dibujada a mano, que es lo único que deja hacer `appearance: none`.
- **Fuera las fases del turno.** «No lo vamos a usar»: en una mesa de
  verdad las fases se cantan y se ven, y llevarlas en pantalla era un
  botón más que tocar cada turno para no enterarse de nada nuevo.
- **La sección de mazos desaparece al empezar la partida.** Ya se sabe con
  qué juega cada uno, y lo que hacía era robarle sitio a lo que sí se toca
  cada turno.
- **«Reiniciar mis contadores» → «Reiniciar»**, y los botones planos con
  fondo, que parecían texto.
- **El panel de la derecha no se desplaza.** Lo que se toca en cada turno
  no puede estar debajo de la línea del agua. Con las fases fuera, los
  mazos escondidos y todo más apretado, cabe; el desplazamiento se queda
  solo en la pestaña de cartas, que es una lista sin tope.

### ⚠ Menos texto: que se explique sola (Héctor, 29/10/2026)

> «Intenta hacer la web como una web, no hecha por IA, sin tantas
> explicaciones, que con los títulos, opciones y botones se autoexplique.
> Minimalista.»

Es la crítica más útil que ha hecho, y describe un vicio: **explicar en
pantalla lo que ya dice el botón**. Un párrafo debajo de cada cosa
tranquiliza a quien lo escribe y estorba a quien lo usa.

Lo que se quitó en el repaso:

- Los párrafos de la puerta, los ajustes, la clave, la mesa, la paleta y
  la importación.
- «Lo que falta» y «El plan» con las fases: era andamio de desarrollo
  puesto en la cara del usuario.
- Las comprobaciones del aparato pasan a ir **plegadas**: hacen falta una
  vez, el día que algo no va.
- El pie del turno se queda en lo mínimo: «Te toca · 3 turnos».

**La regla, de aquí en adelante:** si hace falta un párrafo para explicar
un botón, el botón está mal puesto o mal escrito. Primero se arregla el
botón. El porqué va a estas directrices, que para eso están.

### Elegir mazo y la moneda (29/10/2026)

- **No se juega sin que los dos hayan elegido mazo** (regla 5). Hasta que
  los dos no eligen, no aparecen los contadores.
- **El mazo elegido viaja por el canal de datos**, no se lee de la base:
  el rival lo ve aunque Supabase esté dormida.
- **La moneda** sustituye al dado: una cara por jugador, no puede empatar.
  **El resultado se decide antes de girar**; la animación es solo eso, y
  así no hay forma de que lo que se ve cambie lo que sale.
- La tira cualquiera de los dos y vale la primera que llegue. Entre dos
  amigos basta; el apaño de los números tapados sigue escrito por si algún
  día hace falta.
- Las caras son la inicial del nombre **hasta que haya avatares**.

### Editar e importar (29/10/2026)

- **Mazo nuevo**, cambiar nombre, formato y notas, y **borrar** el mazo.
- **Importar pegando la lista** tal y como la saca su programa. Reemplaza
  todas las cartas del mazo: se borra y se mete lo nuevo, en vez de
  comparar carta por carta. Son sesenta cartas que llegan de golpe; la
  comparación costaría más código y más fallos que volver a escribirlo.
- **La portada se elige pulsando una carta del propio mazo.** Es la que
  pidió la regla («la carta más importante»), está siempre a mano y evita
  otro buscador.
- Antes de meter nada, el formulario **dice cuántas cartas ha entendido**
  en cada zona y cuántas líneas no ha sabido leer. Así se ve si cuadra sin
  guardar a ciegas.

**Probado el 29/10/2026 con los ficheros de verdad de Héctor:**

| Caso | Resultado |
|---|---|
| Chocobos entero | 60 en el mazo, 12 en posibles, ninguna línea perdida |
| `Counterspell (FCA) 4` | queda `Counterspell` |
| `Island (EOE) 269` | queda `Island` |
| `Soul Swallower (tercera copia)` | se respeta tal cual: **no** se confunde con una edición |
| `Sideboard` como encabezado | va al banquillo |
| `// MAYBEBOARD` | va a posibles |

Y lo de `(tercera copia)` deja esa carta sin foto, porque ese nombre no
existe en Scryfall. Se arregla **en la búsqueda, no en el intérprete**:
las que no salen y acaban en paréntesis se piden otra vez sin él. Así el
nombre se respeta tal y como él lo escribió y la foto es la de la carta de
verdad.

### Ver un mazo: las cartas apiladas

Héctor lo pidió con una foto: de cada copia **solo asoma la banda del
nombre**, y la última se ve entera. Se cuenta cuántas llevas sin leer un
número, y ocupa una fracción de lo que ocuparían cuatro cartas sueltas.

Son dos reglas de CSS: cada copia después de la primera sube
`asoma − alto`, y el orden del HTML ya pone las de abajo por encima.

**Las imágenes, de una sola petición.** Un mazo son sesenta cartas, y
pedirlas una a una serían sesenta peticiones con su pausa: más de siete
segundos y un abuso de una API gratis. Scryfall tiene una entrada que
admite **setenta y cinco identificadores de golpe**, así que un mazo entra
en una sola.

⚠ Esas imágenes salen **en inglés**, no en el idioma elegido: esa entrada
no admite pedir idioma. Para las cartas de un mazo da igual —se miran para
reconocerlas—, y pedir sesenta en español serían sesenta peticiones.

**Probado el 29/10/2026** con el mazo de Dinosaurios: 17 pilas, 60
imágenes, todas cargadas, y la apilada igual que en la foto que mandó.

### Los quince mazos, ya dentro (29/10/2026)

Héctor pidió que se los metiera para ahorrárselo. Hecho con permisos de
servidor, que es lo que se usa para una carga de una vez, igual que una
migración; no sustituye a probar la importación de verdad cuando esté
hecha.

**Cómo se comprobó sin mirarlos uno a uno:** los quince mazos suman
**exactamente 60 cartas** en el principal. Una línea mal leída habría roto
alguno de esos sesenta.

De la portada se ha guardado solo el nombre de una carta representativa,
sin el identificador de Scryfall. **Quien pinte la portada tiene que
buscarla por nombre cuando no haya identificador.**

El formato quedó en `Casual` para todos, que es el valor por defecto:
adivinarlo habría sido peor que dejarlo para que lo cambie él.

---

## Fase 9: el remate (30/10/2026)

### ⚠ La pantalla que no se apaga es lo más importante de esta fase

**Sin esto no se puede jugar con el móvil.** Un teléfono apuntando a la
mesa está quieto: nadie lo toca durante minutos, y a los treinta segundos
se apaga la pantalla y con ella se va la cámara. Daba igual lo bien que
fuera todo lo demás.

Dos detalles que no son opcionales:

- El navegador solo concede el permiso **mientras la pestaña está
  delante**, y lo suelta solo al cambiar de aplicación. **Hay que volver a
  pedirlo al volver**; sin esa segunda parte, basta con mirar un mensaje a
  media partida para quedarse sin ello.
- Donde no exista, no pasa nada: se juega igual.

### Instalable, y sin guardar nada

Manifiesto, icono propio y pantalla completa apaisada. El navegador **no
deja instalar una web sin un trabajador de servicio**, así que hay uno,
pero **no guarda nada en caché y es a propósito**: guardar copias traería
el problema de siempre —servir una versión vieja y volverse loco buscando
por qué no se ve el cambio—, y aquí ya pasó una vez con la caché de
Cloudflare. Y sin partida no hay nada que hacer sin conexión, así que
guardar la aplicación para jugar sin internet no sirve de nada.

### Dos atajos, y solo dos

- **Espacio**: pasar turno.
- **Flecha arriba / abajo**: tus vidas.

Son las dos cosas que se tocan en cada turno. Más teclas serían más cosas
que recordar para no ahorrarse nada. Y no se explican en pantalla: van en
el `title` de los botones, que es donde se mira cuando se busca.

### Probado el 30/10/2026

Manifiesto servido y enlazado, icono servido, trabajador de servicio
registrado y permiso de pantalla disponible. Y las flechas: 20 − 1 − 1 + 1
= 19.

**Sin probar: que no se apague una pantalla de verdad** en una partida
larga, que es cosa de jugar.

---

## Fase 8: el historial (30/10/2026)

Migración `magic_004_historial_de_partidas`, probada antes con `rollback`.

### Quién decide y quién escribe

**La aplicación no decide nada** (regla 6). Uno declara —quién gana y por
qué— y al otro le sale el recado con «De acuerdo» o «No». Estar a cero
vidas no es perder, y Magic tiene demasiadas casuísticas para que un
programa se ponga a adivinar.

**La fila la escribe el que ACEPTA.** Es quien confirma que es verdad, y
así hay un solo escritor: no salen dos filas por partida ni hay que
ponerse a quitar repetidos.

### Lo que se guarda, y por qué así

La regla 8 dice que una partida vieja no puede quedarse en blanco porque
hoy borres un mazo. Así que **la partida guarda su propia copia**: el
nombre del mazo, su portada y el nombre de cada jugador **tal como estaban
ese día**. No se apunta al mazo, se copia.

Y se guardan los turnos jugados, que **salen solos** del contador
compartido (`turnoEnJuego - 1`): no hay nada que llevar al día.

Motivos: vidas, veneno, sin biblioteca, por una carta, se rindió, otra
cosa. Son los que dijo Héctor el 26/10, y ninguno lo calcula la máquina.

### No hay `update`

Una partida pasada no se edita: si está mal, se borra y se apunta otra.
Un historial que se puede retocar no sirve para discutir nada.

### Lo que sale de ahí

En «Historial»: cada partida con los dos mazos, quién ganó, por qué,
cuántos turnos y cuándo. Y arriba, **el balance de cada mazo tuyo**
(ganadas–perdidas), que es lo que de verdad se mira y lo que justificaba
obligar a elegir mazo.

### Al terminar, se vuelve a la moneda

No hay series (regla 5): al cerrar una partida se reinician los contadores
y el turno, **y el mazo elegido se queda puesto**. Si quieres cambiarlo,
hay botón.

### Probado el 30/10/2026

Los dos lados en la misma página: uno propone, al otro le sale el recado
con los dos botones y al primero «Retirarlo»; al rechazar, los dos vuelven
a «Finalizar partida».

**Sin probar: que la partida se apunte de verdad en la base**, que hace
falta sesión en dos sitios.

---

## Mazos y registro de partidas (pedido por Héctor el 26/10/2026)

> «Para jugar una partida hay que elegir un mazo de un usuario. Cada usuario
> tiene que tener una zona para poder listar sus mazos y poder poner una
> carta de imagen principal del mazo para que sea fácil reconocible.»

### La regla que lo ordena todo

**No se empieza una partida sin que los dos hayan elegido mazo.** No es una
pega burocrática: es lo único que hace que el historial valga algo. Un
registro de partidas sin saber con qué se jugó no sirve para nada.

### Partidas sueltas encadenadas, no series (Héctor, 26/10/2026)

**No hay «al mejor de tres».** Hay un **botón de elegir ganador y
finalizar**, y cuando una partida termina **se precarga el mismo mazo** para
que cada uno le dé a empezar o elija otro.

Es mejor que la serie fija que había antes: la serie metía un concepto que
había que mantener (¿y si queréis jugar cinco? ¿y si dejáis una a medias?),
y encadenar partidas sueltas no mete ninguno.

**Y se cae un contador del panel:** el «llevamos 3-2 hoy» ya no hay que
llevarlo a mano, porque **sale solo del historial**.

### Un mazo

- Nombre, formato (Modern, Standard, Limited, Pioneer, Casual…), notas.
- **Carta de portada**, para reconocerlo de un vistazo.
- **Lista de cartas** (decidido el 27/10/2026, ver abajo).
- Activo o retirado.

**Y se puede editar** (Héctor, 27/10/2026). Un mazo no se queda como se
importó: se cambian cartas entre partidas. Hay que poder tocar el nombre, el
formato, la portada, las notas y la lista. Ojo con la regla 8: **editar un
mazo no puede cambiar lo que dice el historial** de las partidas ya jugadas,
que guardan su copia del nombre y la portada de aquel día.

**El 26/10/2026 se decidió que NO llevara lista de cartas**, con un
argumento que sigue siendo verdad: mantener a mano sesenta cartas por mazo
es justo el trabajo que nadie hace dos veces.

**El 27/10/2026 Héctor lo cambió, y con una salida para ese problema:** la
lista no se escribe, **se importa del fichero que exporta otra aplicación**
que él ya usa. Si no hay que teclearla, el argumento de arriba desaparece.

> «Si la idea es tener un export de una aplicación que ya te daré en su
> momento y que la web lo traduzca al mazo.»

**⚠ El fichero todavía no lo ha dado.** Hasta verlo no se sabe el formato,
así que la importación **no se puede diseñar de verdad todavía**. Lo que sí
se sabe: sea cual sea el formato, al final hay que convertir cada línea en
una carta de Scryfall, y eso ya está medido más abajo («Hasta dónde perdona
Scryfall»). Conviene además dejar siempre la vía de **pegar texto a mano**,
que funciona con cualquier aplicación del mundo y no depende de un formato
concreto.

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

### El ganador se declara y el otro acepta. Nada se adivina

**Corrección de Héctor, 26/10/2026, y tiene toda la razón:**

> «El cómo ha terminado no puede ser automático porque hay cartas que
> imposibilitan la victoria aunque estés a cero, Magic es enorme, hay muchas
> casuísticas.»

Es exacto. Estar a 0 vidas **no es perder** si hay una Platinum Angel en
juego, o Phyrexian Unlife, o cualquiera de las decenas de cartas que cambian
las condiciones de derrota. Una aplicación que mire el contador de vidas y
declare un ganador se va a equivocar, y se va a equivocar en la partida que
más rabia dé.

Así que **la aplicación no propone nada**:

1. Uno pulsa **«Gana él» o «Gano yo»** y finaliza.
2. **El otro acepta.** Hasta que no acepta, no se registra nada.
3. **Opcionalmente**, motivo de la victoria: vidas, veneno, sin biblioteca,
   **por carta** (las que te hacen ganar o perder directamente), u otra.
   Opcional de verdad: se puede dejar en blanco.
4. Una línea de notas, también opcional.

Esto es además lo que ya hacéis en la mesa: lo acordáis entre los dos. La
aplicación solo lo apunta.

**Si el otro no acepta**, la partida queda pendiente y quien la declaró puede
retirarla o corregirla. **No se inventa un resultado nunca.**

### Los turnos jugados (Héctor, 27/10/2026)

Se apuntan en el historial, y **no hay que llevar nada aparte**: salen del
contador compartido de la fase 4 (`turnoEnJuego - 1`). Al dar la partida por
terminada se guarda ese número y ya está.

Cuidado con una cosa al contarlos: un turno de A y un turno de B son **dos
turnos**, no uno. Si en el historial se quiere «vueltas de mesa», se parte
por dos; pero lo que se guarda es el número de turnos, que es lo que no
necesita explicación.

### Lo que sí se apunta solo

Todo esto la aplicación ya lo sabe porque lleva el panel, y no hay que
preguntarlo:

- Fecha y hora de inicio y de fin, y cuánto ha durado.
- Los dos mazos (nombre y portada congelados) y los dos jugadores.
- **Quién empezó**, que sale del dado.
- En qué turno terminó.
- Vidas y veneno finales de los dos, como dato, **no como veredicto**.
- El formato.

### Lo que sale de ahí, que es lo que de verdad se mira

- **El cruce de mazos:** «mi Rojo Agresivo contra tu Control Azul, 4-2».
  Es la consulta que un jugador hace de verdad.
- **Qué tal te va empezando tú y empezando él.** En Magic jugar primero es
  una ventaja real y medible, y **nadie la apunta a mano jamás**. Aquí sale
  gratis porque el panel ya sabe quién empezó. De todo el historial, esto es
  lo que más va a sorprender.
- Cuántos turnos dura de media cada enfrentamiento.
- Rachas, y cuánto hace que no juegas con un mazo.

### El dado de quién empieza (Héctor, 26/10/2026)

> **⚠ Sustituido el 27/10/2026 por una moneda con los dos avatares.** Lo de
> abajo se deja porque el razonamiento sigue valiendo entero; solo cambia el
> dibujo que se ve. Ver «Avatar del jugador, y la moneda en vez del dado».

> «Al iniciar salen los dos usuarios y una mini animación de un dado de 6
> caras, y si hay empate repite; si no, gana el dado más alto y directamente
> se apunta como jugador inicial. La app ya no hace nada más.»

**Mejor que lo que había**, que era un apaño de criptografía (cada uno manda
su número tapado y se destapan a la vez) para un problema que entre dos
amigos no existe. Un dado que ven los dos rodar se entiende sin que nadie lo
explique.

Cómo se hace:

- Salen los dos jugadores en pantalla y ruedan los dos dados.
- **Empate, repite** automáticamente.
- El más alto empieza, y **queda apuntado**. Fin. La aplicación no hace nada
  más con eso.

**Una mejora que no cuesta nada y conviene hacer:** que **cada navegador
aporte un número al azar** y el resultado salga de los dos combinados. Así
ninguno de los dos puede decidir la tirada por su cuenta, aunque quisiera.
Se ve exactamente igual, cuesta tres líneas y quita para siempre la duda de
«es que tu móvil tira mejor».

### Dos detalles que hay que resolver al implementarlo

- **Quién escribe la fila.** Al acabar, los dos navegadores tienen el mismo
  estado; si escriben los dos, salen dos partidas. **Escribe el que creó la
  mesa**, cuando el otro acepta. La fila lleva el identificador de la partida
  con una restricción única, para que un reintento no duplique.
- **Si alguien se va sin cerrar**, la partida queda *sin terminar* y se puede
  cerrar luego a mano desde el historial.

### Lo que leen los dos

Una partida la pueden leer **los dos que la jugaron**. Un mazo lo edita solo
su dueño, pero lo **ve** el rival entero: sin lista de cartas, un mazo son
tres datos y no hay nada que esconder.

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

## Identificar una carta tocándola (idea de Héctor, 27/10/2026)

> «Pulsar en la carta y que aparezca en un lado la imagen ampliada.
> Tesseract.js lee el nombre de arriba o el código de edición, y la API
> gratuita de Scryfall.»

Va en la dirección correcta: ataca el único problema del proyecto que no
tenía buena solución. Pero **el cuello de botella no es el OCR, son los
píxeles**, y eso cambia el orden en que hay que montarlo.

### Los números

Con el tapete encuadrado a 1080p, una carta ocupa unos 200 px de ancho y
**el nombre mide unos 10 px de alto**. Tesseract necesita 30 px o más por
carácter para ir fino. **El código de edición de abajo es todavía más
pequeño**: a esa resolución, inviable.

### El orden correcto: primero la foto, después el OCR

1. Se toca la carta en el vídeo.
2. Se le pide al navegador del otro **una foto de esa zona a resolución
   nativa** (4K si su cámara lo da). Ya estaba planeado en la fase 6 y llega
   por el canal de datos en menos de un segundo.
3. **Esa foto, ampliada, ya se lee.** Aquí ya se ha ganado, sin OCR.
4. El OCR corre **sobre esa foto**, no sobre el vídeo.

**El OCR es un acelerador, nunca la única vía.** Así nunca te quedas sin
nada, que es la diferencia entre una función que se usa y una que se
abandona a la tercera vez que falla.

### Cartas en japonés o chino (Héctor, 27/10/2026)

> «A veces están en chino o japonés y desconocemos el nombre de la carta.»

Esto **rompe la vía del nombre**: Tesseract con datos de inglés no lee
japonés, y cargar `jpn` o `chi_sim` son megas más y mucha menos fiabilidad
sobre una foto en ángulo.

**La salida es el número de colección**, y es mejor que el nombre en todo:

- Abajo a la izquierda de toda carta moderna hay `123/281` y el código de la
  edición (`NEO`, `MH3`…).
- **Es idéntico en todos los idiomas.** Una carta japonesa lleva el mismo
  número que la inglesa.
- Es **ASCII puro**: dígitos, barra y tres o cuatro letras mayúsculas. A
  Tesseract se le puede decir que **solo acepte esos caracteres**
  (`tessedit_char_whitelist`), y eso dispara el acierto. Es de lo más fácil
  que existe para un OCR, mucho más que leer japonés.
- El resultado es **exacto, no aproximado**: `/cards/neo/123`.
- Y se puede pedir **en el idioma que se quiera**: `/cards/neo/123/ja`
  devuelve el nombre impreso japonés **y** el nombre en inglés.

Comprobado el 27/10/2026 contra la API de verdad: `/cards/neo/123` devuelve
*Tatsunari, Toad Rider*, y `/cards/neo/123/ja` devuelve
`カエル乗り、達成` junto al nombre inglés.

**Pega:** las cartas anteriores a 2003 aproximadamente no llevan número de
colección. Para esas, la vía del nombre o la mano.

### Hasta dónde perdona Scryfall (medido, no supuesto)

En la primera versión de esta nota se dijo que la búsqueda difusa perdonaba
los fallos del OCR. **Se midió y aguanta menos de lo que se dijo:**

| Lo que se le pide | ¿Encuentra «Lightning Bolt»? |
|---|---|
| `Lightnig Bolt` (falta una letra) | **sí** |
| `Lightning Bol` (falta una letra) | **sí** |
| `L1ghtning Bolt` (una letra cambiada) | **sí** |
| `Lighming Bol` (dos fallos) | **no** |
| `Liqhtninq Bolt` (dos `g` por `q`) | **no** |

**Aguanta un fallo, no dos.** Y `rn`→`m` o `g`→`q` son justo las confusiones
que comete un OCR. Otra razón para preferir el número de colección, que da
resultado exacto.

### Lo que pesa (medido el 27/10/2026, no de memoria)

| Pieza | Tamaño |
|---|---|
| `tesseract.js` 7.0.0 | 1,35 MB |
| Núcleo wasm (se baja uno) | 2–3 MB |
| Datos del inglés, versión **rápida** | **1,89 MB** |
| Datos del inglés, versión buena | 10,42 MB |

Unos **4–5 MB la primera vez**, y luego cacheado. **Se carga solo al pulsar
«identificar», nunca al abrir la web.** Con la versión rápida basta: el
nombre de una carta es texto grande, limpio y con mucho contraste.

### Dos trampas conocidas

- **Cartas tapadas:** el nombre queda en vertical. Hay que girar la imagen y
  probar las dos orientaciones.
- **Perspectiva:** la cámara mira en ángulo y el texto sale inclinado.
  Tesseract quiere texto horizontal.

### Las tres vías, y las tres se montan

Héctor, 27/10/2026: *«tu solución no la deseches, añádela»*. Ninguna sobra,
porque cada una cubre el hueco de las otras.

| Vía | Para qué | Resultado |
|---|---|---|
| **A · Número de colección** | Cualquier idioma, incluido japonés | **Exacto** |
| **B · Nombre** | Inglés y español; cartas viejas sin número | Aproximado, un fallo |
| **C · A mano** | Cuando las dos fallan | Infalible, cero megas |

Y **por debajo de las tres, siempre, la foto ampliada**. Si ninguna
identifica la carta, la foto sigue ahí y se lee. Nunca te quedas a cero.

**Lo único que no tiene solución:** una carta japonesa, sin número legible y
que no conocéis. Ahí solo queda la ilustración ampliada. Hay que decirlo y no
prometer magia.

### El lateral de consultas (Héctor, 27/10/2026)

> «Molaría que cada usuario tenga sus consultas en un lateral.»

Una columna al lado con las cartas que **tú** has consultado en esta partida,
la última arriba. Tocar una la vuelve a abrir grande.

**Privado para cada uno, y no es solo por simplificar:** si tu rival ve qué
cartas consultas, sabe cuáles no conoces y cuáles te preocupan. **Eso es
información de partida.** Privado por defecto es lo correcto también para
jugar.

Con un **botón de compartir** una consulta concreta: «mira, es esta», y le
aparece a él. Voluntario, nunca automático.

**En el móvil va como cajón deslizable, no como columna.** La pantalla ya
lleva dos vídeos y el panel de contadores; una columna fija se come lo que
importa.

Se guarda en el navegador mientras dura la partida. Guardarlas para siempre
sería base de datos, y se puede añadir después sin rehacer nada.

Scryfall es gratis y sin clave, pero pide identificarse con un
`User-Agent` propio y dejar 50–100 ms entre peticiones. Se respeta.

---

## Lo nuevo que pidió Héctor el 27/10/2026 (apuntado, sin implementar)

Todo esto es de la fase 7 (los mazos) y la 8 (el historial). Se apunta aquí
para no perderlo y para que la fase 7 se diseñe sabiéndolo.

### Avatar del jugador, y la moneda en vez del dado

> «Imagen de avatar, que podemos utilizar para decidir quién empieza en una
> mini animación de una moneda y cada cara es el avatar de cada uno.»

Esto **sustituye al dado de seis caras** de la idea del 26/10, y es mejor:
una moneda con una cara por jugador es más corta, **no puede empatar** y se
entiende sin explicarla. El dado obligaba a repetir las tiradas empatadas.

Lo que no cambia: **el resultado se apunta como jugador inicial y la
aplicación no hace nada más**. Y sigue en pie el problema de confianza de
«Pendiente de que Héctor decida»: si la moneda la tira un navegador, el otro
se lo tiene que creer. El truco de los dos números tapados sirve igual para
la moneda.

Guardar el avatar: igual que la portada del mazo, **el archivo no va en la
base de datos**. Supabase Storage da 1 GB en el plan gratis, que para dos
avatares sobra de largo. Se decide en la fase 7.

### Cartas dentro del mazo, y ver el mazo del rival en partida

> «Un usuario tendrá mazos y las cartas que van en esos mazos.»
> «Molaría que en plena partida se pueda examinar el mazo del oponente.»

Las dos pegas que se pusieron, y cómo quedaron las dos **decididas el
27/10/2026**:

1. **Meter las cartas a mano es el trabajo que mata la aplicación.**
   Resuelto: **se importan de un export**, no se teclean. Ver «Un mazo».
2. **En Magic de verdad no ves el mazo del rival**, y verlo cambia el juego:
   sabes si le queda el remate en la biblioteca. **Héctor lo elige a
   propósito, y con razones:**

   > «En torneos se saben todas las cartas contra las que te enfrentas,
   > además me los sé de memoria los mazos y al final terminamos
   > preguntándonos y revelamos nuestras intenciones.»

   Es cierto: en torneo las listas son públicas, y entre dos que juegan
   siempre juntos la información oculta ya no existe. **El mazo del rival se
   ve entero durante la partida**, y no hace falta ningún interruptor de
   abierto/cerrado. Si algún día juegan con alguien de fuera, se añade.

### Estadísticas del jugador

Ya estaba previsto y no cambia nada: **salen solas del historial**, no hay
que llevarlas a mano. Ver «Lo que sale de ahí, que es lo que de verdad se
mira».

---

## Repaso del 30/10/2026 (pegas de Héctor probando en el móvil)

Cuatro pegas de una sentada, y la tercera decide algo que llevaba semanas
abierto.

**La moneda la veía girar solo quien la tiraba.** Solo viajaba el
resultado (`compartido.empieza`), no la tirada. Ahora quien pulsa manda
`{que:'moneda', gana}` por el canal de datos y **los dos giran a la vez**,
con el mismo ganador y la misma duración. Sigue apuntando el resultado
**solo quien tira**: si lo apuntaran los dos serían dos cambios del estado
compartido para decir lo mismo. El detalle que lo hace funcionar en los dos
lados sin más código: cada uno tiene **su propia cara delante**, así que
`gana === tuId ? 0 : 180` sale bien mirado desde donde se mire.

**La franja roja del borde izquierdo: dos clases con el mismo nombre.**
`.partida` era a la vez la capa a pantalla completa de la partida en curso
(línea 1095) y **una fila del historial** (línea 2275), que lleva
`border-left: 3px solid var(--mal)` para marcar las derrotas. Como la del
historial se declara después, ganaba, y pintaba una raya roja de arriba
abajo en todas las partidas. La del historial pasó a llamarse `.jugada`.
**La lección:** un nombre de clase es un nombre global; `.partida` para una
pantalla y para una fila de una lista era un choque esperando a pasar.

**La pantalla de un mazo nunca fue ancha.** Se escribió `.pagina--ancha`
(100rem) el 30/10/2026 para que el mazo abierto usara toda la pantalla,
pero `PantallaDentro` siempre ponía `.pagina` a secas (44rem): la clase
existía y no se aplicaba a nada. Ahora la sección de mazos la lleva. Y las
cartas crecen con la ventana: `--ancho: clamp(8rem, 12vw, 13rem)`, con el
alto y lo que asoma de cada copia **derivados de ese ancho**, que una carta
tiene las proporciones que tiene. Una sola regla para el móvil y para la
pantalla grande.

**Avatar de verdad: sigue pendiente**, y ahora se nota más, porque la
moneda enseña las dos caras.

---

## El relé TURN: hace falta, y Cloudflare pide tarjeta (30/10/2026)

**La prueba que lo cerró:** Héctor puso el móvil con **datos móviles** (wifi
apagado) y el PC en su red. Es el caso más difícil que hay, porque en una
red móvil todos los clientes comparten la misma IP pública. **No entró la
imagen del otro lado.** Conclusión: sin relé, dos casas cualesquiera no
tienen por qué conectar.

**Y el relé de Cloudflare pide tarjeta.** Dar de alta Realtime lleva a un
formulario con método de pago y dirección de facturación, aunque el total
sea 0,00 € y los 1000 GB al mes entren gratis (0,05 $/GB al pasarse, y una
partida larga no llega a 2 GB). Choca de frente con «todo gratis», así que
**la decisión es de Héctor** y está sin tomar.

Lo que NO vale la pena: un relé público gratuito de los que hay por ahí. El
vídeo de los dos pasaría por un servidor de un tercero y los cupos son de
50 GB al mes.

---

## El relé, encendido (30/10/2026)

Funciona: `/api/servidores` devuelve `"hayRele":true` y los `turn:` de
Cloudflare. Tres cosas que costaron y conviene no repetir.

**Cloudflare pide método de pago aunque el total sea 0,00 €.** Se resolvió
con **PayPal**, que aparece como botón en la misma pantalla de alta. No
hace falta tarjeta. El alta no cuaja hasta que se rellena la dirección de
facturación entera y se pulsa el botón del final: a medias, el panel sigue
ofreciendo «Comenzar» y parece que no se ha hecho nada.

**⚠ LOS SECRETOS, DE TIPO «SECRETO», NUNCA «VARIABLE».** Las credenciales
se pusieron como Variables de texto plano y **el siguiente despliegue desde
git se las llevó por delante**: `wrangler deploy` manda las `vars` de
`wrangler.jsonc` y borra las que se hayan añadido a mano por el panel. Los
secretos no se tocan. El síntoma engaña: el relé deja de funcionar sin que
nadie haya tocado nada del relé.

**El nombre de un secreto no se puede cambiar.** Se escribió
`TURN_CLAVE_I` sin la D y el panel deja editar el tipo y el valor, pero no
el nombre: hay que borrarlo y crearlo otra vez.

**Y el código esperaba otra forma de respuesta.** Con las credenciales ya
puestas seguía sin haber relé: se leía `iceServers` como un objeto con
`urls` y Cloudflare devuelve una **lista**. Ahora se admiten las dos
formas, y cuando no viene nada útil el motivo dice **qué campos vinieron**
—los nombres, nunca los valores, que ahí dentro hay credenciales y el
motivo se enseña en el diagnóstico—. La lección: una llamada que devuelve
200 y un JSON que no cuadra es el fallo más caro de encontrar, porque no
parece un fallo.

**Dónde está todo:** app TURN `mesa-magic` en Realtime → TURN. El **ID** se
puede volver a ver siempre; el **token de API**, solo el día que se crea, y
si se pierde se rota desde los tres puntos de la app sin que cambie el ID.

---

## Lo rematado el 30/10/2026 (avatar, moneda, mazos)

**El avatar de verdad, hecho.** La foto se recorta en cuadrado y se encoge
a 256 px **en el navegador**, antes de subirla: una foto del móvil son
cuatro megas y de un avatar se ven ciento veinte píxeles. Vive en el
almacén `avatares` de Supabase (migración `magic_005_avatares`), público
de lectura —se enseña en la moneda, firmar cada enlace para eso no tiene
sentido— y con cada uno escribiendo solo en la carpeta de su propio
identificador. La dirección lleva `?v=` con la hora, porque el archivo se
llama siempre igual y sin eso el navegador seguiría enseñando la foto
vieja durante horas.

**La foto del rival viaja por la mesa, no por la base de datos** (regla 1),
y **el Worker solo la reparte si es una dirección de nuestro almacén**. Sin
esa comprobación, el de enfrente podría poner cualquier dirección y tu
navegador iría a pedirla: le estarías diciendo a un servidor ajeno que
estás jugando y desde dónde.

**La moneda ya no se puede amañar** (`sorteo.ts`). Cada uno manda la
**huella** de su número antes de conocer el del otro, y solo entonces se
destapan y se comprueba que cuadran. Lo arranca quien pulsa y el otro
contesta solo. Si una huella no cuadra, la moneda **se queda quieta**: es
mejor repetir la tirada que empezar una partida con una trampa dentro.

**Fuera GitHub Pages.** Publicaba una segunda web igual en
`hrcasbas.github.io/mesa_magic/` que no miraba nadie.

---

## El mazo que no era el suyo (30/10/2026)

Héctor abrió un mazo y vio **el nombre de uno y las cartas de otro**.

`useCartasDelMazo` guardaba las cartas pero no **de qué mazo eran**. Al
abrir otro, el nombre cambiaba al momento y las cartas tardaban su viaje a
la base; en ese hueco, la pantalla copiaba las del mazo anterior y se
marcaba como ya copiada, así que cuando llegaban las buenas **ya no las
cogía**. Ahora se guarda el mazo junto a sus cartas y `null` quiere decir
«todavía no se sabe», nunca «las de antes». El vaciado se hace **al pulsar
el mazo**, no en un efecto, que es donde empieza el cambio.

**Lo mismo afectaba a elegir mazo para jugar**, por el mismo camino: con
dos pulsaciones seguidas se podía mandar al rival la lista de otro mazo.
Nadie lo había visto.

**Y el orden de las cartas:** por coste de maná y **las tierras al final**
(Héctor, 30/10/2026). Es el orden en el que se piensa un mazo. El coste
sale de Scryfall, así que una carta que todavía no ha llegado se queda al
final y en su sitio: moverlas de golpe al llegar la respuesta sería peor
que no ordenarlas. El orden guardado en la base no se toca, que es el de
la lista que se importó.

**Volver, de una pulsación y siempre en el mismo sitio** (Héctor,
30/10/2026: «desde dentro de un mazo tienes que ir a Mis mazos, luego
cerrar»). Cada sección tenía su botón de salir en una esquina distinta.
Ahora hay **uno solo**, `← Atrás`, arriba a la izquierda en todas, que
sube **un** nivel; y **«La mesa» es la primera opción del menú de la
cuenta**, para volver a jugar desde donde sea sin deshacer el camino.
La columna de datos del mazo cabe entera sin desplazarla: lo que la hacía
larga era la portada a tamaño de carta, y de una portada basta con
reconocerla.

**El almacén público no abre la puerta de la API** (30/10/2026). Subir una
foto fallaba con «new row violates row-level security policy» y parecía un
problema de escritura: lo que faltaba era el permiso de **lectura**. Que un
bucket sea `public` solo abre el enlace que se pone en un `<img>`; la API
de objetos sigue mandando por seguridad de filas, y `upsert` empieza por
mirar si el archivo ya estaba. Arreglado en `magic_006_avatares_a_la_vista`.

**Un comparador tiene que ser consistente aunque falten datos.** El orden
por coste miraba a Scryfall, y con las cartas aún sin llegar devolvía
`-1` para la conocida y `1` para la otra: eso no es un orden, es una regla
que se contradice a sí misma, y la lista salía revuelta con las tierras
arriba. Ahora cada carta tiene un peso siempre: las tierras básicas se
reconocen por el nombre sin preguntar a nadie, y lo que no se sabe espera
al final con coste 99.

---

## Pendiente de que Héctor decida

- **El nombre visible.** «Mesa Magic» es provisional, puesto para que la fase
  0 tuviera título. La dirección ya sí está elegida:
  `magic-mesa.duelo.workers.dev`.
- ~~El avatar de verdad.~~ **Hecho el 30/10/2026.**
- ~~La red de seguridad de GitHub Pages.~~ **Apagada el 30/10/2026.**
- **Cloudflare Access** (gratis hasta 50 usuarios) pondría una puerta en el
  borde, antes de que la web llegue a cargarse. Más seguro, pero añade un
  código al correo cada vez. No se ha metido.
- **La tirada de quién empieza.** Si la tira un navegador y manda el
  resultado, el otro se lo tiene que creer. Desde el 30/10/2026 el otro
  **ve girar la moneda**, pero sigue sin poder comprobar nada. Hay un truco
  limpio: cada uno manda su número tapado y solo al tener los dos se
  destapan y se suman. Media hora de trabajo.
- ~~El relé TURN.~~ **Hecho el 30/10/2026**, pagando 0,00 € con PayPal.

---

## Lecciones

- **27/10/2026 — Dos lados que se tienen que encontrar no pueden depender de
  quién llegó primero.** El vídeo abría el enlace al encender la cámara, así
  que la primera oferta se mandaba a un lado que todavía no escuchaba, se
  perdía, y la regla del choque de ofertas remataba el bloqueo. Compilaba,
  el lint estaba limpio y la fontanería era correcta pieza a pieza: **el
  fallo estaba en el orden de llegada**, que es lo único que no se ve
  mirando el código de un lado solo.
  La forma de no repetirlo: **abrir el canal con el encuentro, no con el
  dato**, y que cada lado avise de que ya escucha (`{listo:true}`) para que
  el otro repita lo que se hubiera perdido.

- **27/10/2026 — Lo que se ignora en git tiene que generarse en la
  compilación.** `worker-configuration.d.ts` (los tipos de Cloudflare) se
  añadió a `.gitignore` por no meter 600 KB generados en el repositorio, pero
  `tsc` lo necesita. Aquí compilaba porque el archivo estaba en disco; en la
  máquina de Cloudflare no existía y la compilación reventó con
  `TS2688: Cannot find type definition file`. **Y falló en silencio**: la web
  siguió sirviendo la versión anterior, así que parecía que el despliegue
  tardaba, no que se había caído.
  Arreglado metiendo `wrangler types` dentro de `npm run build`, que además
  quita el pie de que los tipos se queden desfasados al tocar
  `wrangler.jsonc`.
  **Cómo se encontró:** comparando el nombre del archivo publicado con el
  recién compilado. Si no coinciden, no se ha desplegado, y hay que ir al
  registro antes de seguir esperando.

- **27/10/2026 — Tres parches al mismo fallo valen menos que entenderlo una
  vez.** El mismo problema (una señal que se pierde porque el otro todavía
  no escucha) se arregló tres veces: primero abriendo el enlace con la mesa,
  luego añadiendo `{listo:true}`, luego ampliando qué se consideraba «algo
  que ofrecer». Las tres eran ciertas y las tres se quedaban cortas, porque
  **ninguna miraba el caso de quien ya había hablado y se quedó esperando**.
  Lo que lo cerró fue dejar de parchear condiciones y **guardar lo dicho
  para poder repetirlo**: así da igual quién llegue antes.
  Y lo que lo demostró fue **montar la carrera a propósito** en una página
  de prueba, en vez de razonar sobre ella.

- **27/10/2026 — Un seguro solo protege lo que existía cuando se escribió.**
  El seguro contra la oferta perdida de la fase 3 preguntaba «¿tengo alguna
  cámara que ofrecer?». Al añadir el canal de datos en la fase 4, esa
  pregunta dejó de valer y el mismo fallo volvió, ahora sin cámaras de por
  medio. **Al meter algo nuevo por un camino que ya existe, repasar los
  seguros de ese camino uno por uno** y preguntarse si cuentan lo nuevo.
  Las dos veces lo encontró Héctor probando, no la compilación.

- **27/10/2026 — Se pueden probar los dos lados sin dos sesiones.** Montando
  los dos paneles en la misma página con un canal de mentira entre ellos se
  comprueba todo lo que es lógica: la sincronía, de quién es el turno, qué
  botones se apagan. Queda fuera solo el transporte. **Es mucho más barato
  que no probar nada por no poder probarlo todo.**

- **27/10/2026 — Un contador que hay que corregir en cada acción no lo
  lleva nadie.** Se metieron cartas en mano y en cementerio porque estaban
  en la lista de lo pedido, sin preguntarse cuántas veces habría que
  tocarlos. Héctor lo vio al primer vistazo: «sería una tortura jugar». La
  pregunta que había que hacerse antes de escribirlo: **¿cuántas veces se
  toca esto en una partida?** Si es en cada turno, sobra. Y si además se
  puede contar mirando la mesa por la cámara, sobra dos veces.

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
