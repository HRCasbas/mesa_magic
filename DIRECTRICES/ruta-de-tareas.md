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
| **3** | El vídeo: WebRTC, credenciales TURN, cortar, diagnóstico | |
| **4** | Los contadores, por el canal de datos | |
| **5** | Las pegatinas arrastrables | |
| **6** | Leer las cartas: tocar una carta, foto de alta resolución, ampliar, Scryfall y OCR | |
| **7** | Mazos: zona propia, portada, elegir mazo para jugar | |
| **8** | Historial: declarar ganador, aceptar, y qué sale del registro | |
| **9** | El remate: PWA, pantalla que no se apaga, atajos | |

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
- Activo o retirado.

**Sin lista de cartas** (Héctor, 26/10/2026). Mantener a mano sesenta cartas
por mazo es justo el trabajo que nadie hace dos veces, y el mazo aquí solo
tiene que servir para **reconocerlo y apuntar con qué jugaste**. De paso
desaparece el problema de privacidad: sin lista no hay nada que esconder, y
el rival puede ver el mazo entero, que son tres datos.

Si algún día hace falta, se añade sin romper nada de lo que haya.

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
