# JAXINDUSTRIES — Sistema Web de Gestión y Control Financiero

Proyecto académico (5.º Perito en Informática) desarrollado siguiendo el
SDLC. Esta es la **versión final** del sistema: una aplicación web completa
de finanzas personales, con backend en Node.js/Express/PostgreSQL y
frontend en Angular, que cubre autenticación, dashboard, ingresos, gastos,
categorías, notificaciones, presupuestos, ahorro y reportes.

## Módulos del sistema

| Módulo | Pantalla (frontend) | Backend / origen de datos |
|---|---|---|
| Autenticación | Login, Registro | API real: registro, login, login con Google, JWT, `/api/auth/me`, actualizar perfil |
| Dashboard | `/dashboard` | API real (`/api/dashboard/metrics`) + datasets de ejemplo para los rangos Semana/Mes/Año de la gráfica comparativa |
| Ingresos | `/ingresos` | API real (`/api/incomes`), CRUD completo |
| Gastos | `/gastos` | API real (`/api/expenses`), CRUD completo |
| Categorías | `/categorias` | API real (`/api/categories`), CRUD completo |
| Notificaciones | Campana en el header | API real (`/api/notifications`) |
| Presupuestos | `/presupuestos` | Límite mensual guardado en `localStorage` del navegador (no tiene tabla ni endpoint propio en el backend) |
| Ahorro | `/ahorro` | Total e historial de movimientos guardados en `localStorage` del navegador (no tiene tabla ni endpoint propio en el backend) |
| Reportes | `/reportes` | Se calculan en el frontend a partir de los ingresos y gastos reales obtenidos de la API (no hay endpoint `/api/reports`) |
| Configuración | `/configuracion` | Perfil de usuario vía API real; preferencias (moneda, tema, alertas) en el frontend |

> **Nota para el siguiente incremento:** Presupuestos, Ahorro y Reportes ya
> están completamente maquetados y funcionales del lado del cliente, pero
> sus datos no persisten en PostgreSQL ni se sincronizan entre
> dispositivos/navegadores. Para completarlos a nivel de base de datos
> haría falta agregar tablas `budgets` y `savings_movements`, sus
> repositorios/controladores/rutas en `backend/src/modules/`, y reemplazar
> las llamadas a `localStorage` en `budgets.component.ts` y
> `savings.service.ts` por `HttpClient`.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Angular 17 (standalone components), TypeScript, CSS puro |
| Gráficas | SVG generado dinámicamente en los componentes (sin Chart.js/Recharts/ECharts) |
| Backend | Node.js + TypeScript + Express |
| Base de datos | PostgreSQL |
| Administración BD | pgAdmin 4 |
| Autenticación | JWT firmado con JWS (HS256), hash de contraseñas con bcryptjs |
| Login social | Google OAuth 2.0 (`google-auth-library`) |
| Gestor de paquetes | pnpm (backend y frontend) |
| Control de versiones | Git + GitHub |
| Gestión del proyecto | Trello |

## Requisitos previos

- Node.js 18 o superior y pnpm.
- PostgreSQL 14 o superior (y pgAdmin 4, opcional pero recomendado).
- Git.
- Credenciales OAuth 2.0 de Google (Client ID y Client Secret) si se quiere
  usar el inicio de sesión con Google.

## Estructura del proyecto

```
Gestion_Gastos/
├── backend/
│   ├── src/
│   │   ├── config/env.ts              # Carga y valida variables de entorno
│   │   ├── db/
│   │   │   ├── pool.ts                # Conexión a PostgreSQL
│   │   │   └── schema.sql             # Tablas: users, categories, incomes, expenses, notifications
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # requireAuth (valida el JWT)
│   │   │   └── errorHandler.ts
│   │   ├── modules/
│   │   │   ├── auth/                  # Registro, login, login con Google, perfil
│   │   │   ├── users/                 # Modelo y repositorio de usuarios
│   │   │   ├── categories/            # CRUD de categorías
│   │   │   ├── incomes/               # CRUD de ingresos
│   │   │   ├── expenses/              # CRUD de gastos
│   │   │   ├── notifications/         # Notificaciones del usuario
│   │   │   └── dashboard/             # Métricas agregadas para el panel principal
│   │   ├── utils/                     # JWT, hash de contraseñas, errores propios
│   │   ├── app.ts                     # Configuración de Express y montaje de rutas
│   │   └── server.ts                  # Punto de entrada
│   ├── scripts/create-test-user.ts    # Script de desarrollo para crear un usuario de prueba
│   ├── .env.example
│   └── package.json
└── frontend/
    └── src/
        ├── app/
        │   ├── core/
        │   │   ├── guards/auth.guard.ts
        │   │   ├── interceptors/auth.interceptor.ts   # Adjunta el JWT a cada petición
        │   │   ├── models/auth.models.ts
        │   │   └── services/
        │   │       ├── auth.service.ts
        │   │       ├── finance.service.ts     # Ingresos, gastos, categorías, dashboard (HTTP real)
        │   │       ├── savings.service.ts     # Ahorro (localStorage)
        │   │       ├── notification.service.ts
        │   │       ├── currency.service.ts
        │   │       ├── theme.service.ts
        │   │       └── inactivity.service.ts
        │   ├── features/
        │   │   ├── login/
        │   │   ├── register/
        │   │   ├── dashboard/
        │   │   ├── incomes/
        │   │   ├── expenses/
        │   │   ├── categories/
        │   │   ├── budgets/            # Presupuesto mensual (localStorage)
        │   │   ├── savings/            # Ahorro
        │   │   ├── reports/            # Reportes calculados en el cliente
        │   │   └── settings/           # Perfil y preferencias
        │   ├── app.component.ts
        │   └── app.routes.ts
        ├── assets/                    # Íconos y logos de la marca JAXINDUSTRIES
        ├── environments/
        └── styles.css
```

Documentos adicionales incluidos en la raíz del proyecto:
`Maquetado_Ingresos.pdf`, `Maquetado_Gastos.pdf`, `Maquetado_Categorias.pdf`,
`Maquetado_Presupuestos.pdf`, `Maquetado_Ahorro.pdf`,
`Maquetado_Reportes.pdf` y `Maquetado_Configuracion.pdf`: manuales de
maquetado de cada módulo con la marca JAXINDUSTRIES.

## 1. Configurar PostgreSQL

1. Crea la base de datos:

   ```sql
   CREATE DATABASE sistema_financiero;
   ```

2. Ejecuta el script que crea las tablas (`users`, `categories`, `incomes`,
   `expenses`, `notifications`) y siembra las categorías iniciales:

   ```bash
   psql -U <tu_usuario> -d sistema_financiero -f backend/src/db/schema.sql
   ```

   (También puedes abrir el archivo desde el "Query Tool" de pgAdmin 4
   apuntando a la base `sistema_financiero`).

3. (Opcional) Para tener datos de ejemplo en el dashboard, usa
   `backend/src/db/insert-demo-data.sql` reemplazando `'TU_USER_ID'` por el
   `id` del usuario que crearás en el siguiente paso.

## 2. Configurar el backend

```bash
cd backend
pnpm install

// crea el .env y copia lo del .env.example tal y como esta, replaza las seccion de PostgreSQL por tus datos relaes 
```

Abre `.env` y completa tus propios valores (nunca reutilices los del
ejemplo en un entorno real):

```
PORT=3000
CORS_ORIGIN=http://localhost:4200

DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_financiero
DB_USER=postgres
DB_PASSWORD=tu_contraseña_real

JWT_SECRET=una_cadena_larga_y_aleatoria
JWT_EXPIRES_IN=8h

GOOGLE_CLIENT_ID=tu_client_id_de_google
GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
```

> **Seguridad:** el `backend/.env.example` del proyecto trae un
> `JWT_SECRET` y credenciales de Google ya rellenadas a modo de ejemplo.
> Antes de subir el repositorio a un lugar público o de desplegarlo,
> reemplázalas por valores propios y confirma que el archivo real `.env`
> esté en `.gitignore`.

### Crear un usuario de prueba

Con el `.env` configurado y las tablas ya creadas:

```bash
pnpm run db:create-test-user correo@ejemplo.com "Usuario de Prueba" contraseña
```

Esto guarda en PostgreSQL un usuario con la contraseña ya hasheada (nunca
en texto plano). Si no pasas argumentos, usa valores por defecto.

### Iniciar el backend

```bash
pnpm run dev
```

Deberías ver:

```
Conexión a PostgreSQL verificada correctamente.
Servidor backend escuchando en http://localhost:3000
```

Puedes probar que el servidor responde visitando
`http://localhost:3000/api/health` (debe devolver `{"status":"ok"}`).

### Endpoints disponibles

| Recurso | Rutas |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/me`, `PUT /api/auth/profile` |
| Gastos | `GET/POST /api/expenses`, `PUT/DELETE /api/expenses/:id` |
| Ingresos | `GET/POST /api/incomes`, `PUT/DELETE /api/incomes/:id` |
| Categorías | `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id` |
| Notificaciones | `GET/POST /api/notifications`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications/:id` |
| Dashboard | `GET /api/dashboard/metrics` |

Todas las rutas anteriores, salvo `register`, `login` y `google`, requieren
el header `Authorization: Bearer <token>` (lo agrega automáticamente el
`auth.interceptor.ts` del frontend una vez que el usuario inicia sesión).

## 3. Configurar y ejecutar el frontend

En otra terminal:

```bash
cd frontend
pnpm install
pnpm start
```

Esto levanta Angular en `http://localhost:4200`.

La URL del backend que usa el frontend está en
`frontend/src/environments/environment.development.ts`
(`apiUrl: "http://localhost:3000/api"`). Si cambias el puerto del backend,
actualiza este archivo.

Si se quiere usar el inicio de sesión con Google, el `GOOGLE_CLIENT_ID`
también debe configurarse en el frontend (mismo valor que en el `.env` del
backend).

## 4. Recorrido de la aplicación

1. Con PostgreSQL, el backend (`pnpm run dev`) y el frontend (`pnpm start`)
   corriendo, abre `http://localhost:4200`. Se te redirige a `/login`.
2. Puedes **registrarte** desde `/register`, iniciar sesión con
   correo/contraseña, o usar **"Iniciar sesión con Google"**.
3. Tras autenticarte llegas al **Dashboard**, con tarjetas de resumen
   (Balance, Ingresos, Gastos, Ahorro), gráfica de líneas Ingresos vs
   Gastos (pestañas Semana/Mes/Año), gráfica de dona por categoría, tabla
   de gastos recientes y campana de notificaciones.
4. Desde el sidebar puedes navegar a **Ingresos**, **Gastos** y
   **Categorías** (CRUD completo contra la API), **Presupuestos** y
   **Ahorro** (persistidos en el navegador) y **Reportes** (calculados a
   partir de tus ingresos/gastos reales, con exportación a CSV/impresión).
5. En **Configuración** puedes editar tu perfil (nombre, correo, avatar,
   estado de sincronización con Google) y tus preferencias del sistema
   (moneda, presupuesto límite, tema claro/oscuro, alertas).
6. Casos de error a probar en el login: contraseña incorrecta, correo
   inexistente (mismo mensaje genérico por seguridad), campos vacíos
   (validación en el propio formulario), backend apagado y PostgreSQL
   apagado.

## Características destacadas del dashboard

- **100% Angular + TypeScript + CSS puro**: las gráficas de líneas, la
  dona y los sparklines de las tarjetas están hechas con SVG generado
  dinámicamente en el componente, sin librerías externas de gráficas ni
  dependencia de internet para renderizarse.
- **Sidebar** con menú de navegación completo (Dashboard, Gastos,
  Ingresos, Presupuestos, Categorías, Reportes, Ahorro, Configuración),
  resaltado del ítem activo y botón para colapsar la barra a solo íconos.
- **Header** con saludo, buscador en vivo sobre "Gastos Recientes",
  selector de fecha, campana de notificaciones (conectada a la API) y menú
  de usuario con cierre de sesión.
- **Totalmente responsivo**: de escritorio (4 columnas) a tablet (2
  columnas) y móvil (1 columna), con el sidebar colapsándose
  automáticamente en pantallas angostas.

## Qué queda pendiente para un siguiente incremento

- Persistir **presupuestos** y **movimientos de ahorro** en PostgreSQL
  (tablas + módulo backend + reemplazo de `localStorage` en el frontend).
- Endpoint dedicado de **reportes** en el backend (hoy se calculan en el
  cliente a partir de `/api/expenses` e `/api/incomes`).
- Recuperación de contraseña.
- Despliegue en producción (hoy el proyecto está pensado para correr en
  `localhost`).
- Rotar y externalizar correctamente el `JWT_SECRET` y las credenciales de
  Google del `.env.example` antes de cualquier entorno compartido o
  público.