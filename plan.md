# Frontend NotifyService — Registro de Planes

> Memoria de planes del frontend. Si la sesión se cierra, este archivo conserva el contexto.
>
> **Estados:** `[PENDIENTE]` · `[EN PROGRESO]` · `[COMPLETADO]` · `[BLOQUEADO]`
> Reglas: solo un plan en `[EN PROGRESO]` a la vez. Al terminar un plan moverlo a **Historial** con `[COMPLETADO]`.
> Regla viva: cada plan actualiza este archivo en el mismo cambio que lo completa (marcar `[x]` / mover a Historial). Solo un `[EN PROGRESO]` a la vez.

---

## Planes Activos

### [COMPLETADO] F10 Dark UI Premium — toda la app (2026-09-25)
- [x] Deps: `pnpm add lucide-react` (1.47.0)
- [x] `index.html`: Inter Google Fonts 400/500/600/700 + `lang="es"` + theme-color #080B17
- [x] `tokens.css`: paleta exacta (#080B17/#0C1328/#131B33/#1A2342/#222E52/#283556, textos #F4F7FC/#9AA7C7/#6F7C99, acentos morado/azul/naranja), radios 20/14/999px, sombras + glow controlado, duraciones 180/250/200ms
- [x] `reset.css` + `index.css`: LH 140%, tracking 0..-1%, focus morado
- [x] `AppLayout`: sidebar 240px con iconos Lucide (stroke 1.75) + activo morado, navbar 72px (search pill + icon-buttons círculo + avatar), responsive
- [x] UI kit: Button/Badge/Field/DataTable/Modal/Toasts/EmptyState/Spinner + Card nuevo radius 20px/padding 24px
- [x] `DashboardPage`: KPIs 32px Bold + salud/canales/acciones, mantiene `healthApi`
- [x] `GuestLayout`/auth al mismo estilo
- [x] Verificación: `tsc -b` + `vite build` OK (2026-09-25)

### [PENDIENTE] F9 Transversal: errores, paginación server-side, i18n es, tests, build
- [x] Mapa errores 400/401/403/404/429 + toasts (`ApiError` + `Toasts`)
- [ ] Paginación TanStack Table server-side (hoy `DataTable` es client-side; activar cuando `GET /notifications` deje de ser stub)
- [ ] Vitest + README fronted
- [x] `tsc -b` + `vite build` OK (2026-09-25)

---

## Historial

### [COMPLETADO] F0 Scaffold Vite + React 19 + TS + pnpm en `fronted/` (2026-09-25)
- [x] Scaffold `react-ts` (React 19.3, Vite 8.3, TS 6.0) + `pnpm add` zustand 5 + TanStack Query 5 / Table **8.21** (v9 descartada: API incompatible) / Form 1.33 + react-router-dom 7
- [x] Alias `@ → src` en `vite.config.ts` + `tsconfig.app.json` (sin `baseUrl`, deprecado en TS6)
- [x] `VITE_API_URL` + proxy Vite `/api → localhost:3000`, `.env.example`
- [x] `tsc -b` + `vite build` OK

### [COMPLETADO] F1 Design System propio + núcleo compartido (2026-09-25)
- [x] `tokens.css` + `reset.css` (sin Tailwind/MUI)
- [x] `shared/ui`: Button, TextField, SelectField, Badge (estados/canales), Spinner, EmptyState, Modal, DataTable<T> (TanStack Table 8), Toasts
- [x] `shared/api`: `apiFetch` (Bearer + refresh 401×1), `ENDPOINTS` (31 rutas), `ApiError`
- [x] `shared/lib`: cn, formatDateTime, validators (email/slug/E.164)
- [x] `shared/model`: enums + 14 tipos espejo de TypeORM
- [x] `shared/store`: `useAuthStore` (persist) + `useToastStore`

### [COMPLETADO] F2 Auth grant_type password + registro tenant + guards (2026-09-25)
- [x] `POST oauth/token` (password) + `POST tenants` (registro público) con TanStack Form
- [x] Login/Register, `RequireAuth/RequireAdmin` (refleja `AdminGuard`: JWT `type:admin`)
- [x] Refresh `oauth/refresh` en interceptor; logout si falla

### [COMPLETADO] F3 Dashboard con agregados en cliente v1 (2026-09-25)
- [x] Salud real (`GET /health`, `/health/providers`) + tarjetas de canales + acciones frecuentes
- [ ] Agregados por estado/canal pendientes a que `GET /notifications` deje de ser stub (back)

### [COMPLETADO] F4–F8 CRUD por feature backend v1 — 31 endpoints cableados (2026-09-25)
- [x] Notifications: crear (202), detalle `GET /:id` con deliveries→attempts, `POST /deliveries/:id/retry`, listado (tolera stub)
- [x] Templates: `POST`, `GET /:code`, `PATCH :code/versions/:v/activate?language&channel`
- [x] Providers: `POST` (SES-SMTP + secret cifrado), `PUT`, `POST /:id/channels`
- [x] Applications: listar/crear/rotar (secret modal una sola vez)
- [x] Preferences (`PUT/GET /:userId`) y Devices (`POST`/`DELETE /:token`); Health

### [COMPLETADO] F11 Proveedores: 4 tipos + ejemplos JSON + estado/eliminar (2026-09-30)
- [x] Tipo limitado a EMAIL SES (SES), EMAIL SMTP (SMTP), SMS (TWILIO), WHATSAPP (WHATSAPP_CLOUD)
- [x] `PROVIDER_CONFIG_EXAMPLES`: SES/SMTP (transport smtp + host/port/secure/starttls/username/fromAddress), TWILIO (accountSid + fromNumber), WHATSAPP_CLOUD (phoneNumberId + apiVersion); el secreto va en campo Secret
- [x] Al cambiar Tipo se carga el ejemplo en Config + botón «Cargar ejemplo»; hints y labels por tipo
- [x] Columna Estado (ACTIVE/INACTIVE), toggle activar/desactivar (PUT status+isActive), eliminar con confirm (DELETE: borrado físico o soft si tiene envíos, filtra DELETED)
- [x] `toConfigFields` conserva objeto completo (antes perdía campos SMS/WhatsApp); `Provider.status` en tipos; tonos Badge ACTIVE/INACTIVE/DELETED
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F12 Aplicaciones: eliminar solo sin asociados (2026-09-30)
- [x] Modal de eliminar explica la regla (409 si tiene algo asociado)
- [x] `deleteErrorMessage`: 409 + `blocking` → «No se puede eliminar: tiene notificaciones (2), plantillas (1) asociados.»
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F13 Proveedores: 3 tipos genéricos EMAIL/SMS/WHATSAPP (2026-09-30)
- [x] Back (`NotifyService`): `ProviderType` → EMAIL/SMS/WHATSAPP; `ProviderRegistry` resuelve genéricos + alias de lectura legacy (SES/SMTP/TWILIO/WHATSAPP_CLOUD/…); swagger reescrito sin marcas (EMAIL smtp genérico, SMS genérico, WHATSAPP Meta) + `POST/PUT` solo validan los 3
- [x] Front: `TYPE_OPTIONS` EMAIL/SMS/WHATSAPP, ejemplos/hints/secrets genéricos por tipo, canal sugerido = identidad, `TYPE_LABELS` + sugeridos con alias legacy para filas antiguas; dashboard sin mención SES-SMTP
- [x] Verificación: `nest build` OK + `jest tests/unit/providers` 6/6 OK + `npm run build` front OK
- [x] Nota: reiniciar el back (`nest start --watch` lo recarga solo al guardar) para ver el swagger nuevo en `/docs`

### [COMPLETADO] F14 Proveedores: modal de eliminar en vez de `window.confirm` (2026-09-30)
- [x] Estado `deleting` + `<Modal>` «Eliminar “nombre”» con Cancelar / Eliminar (danger), mismo patrón que Aplicaciones; explica borrado físico vs marcado como eliminado
- [x] `remove.onSuccess` cierra el modal; sin `window.confirm` en toda la app
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F15 Notificaciones: filtro por aplicación en vez de sistema origen (2026-09-30)
- [x] Filtro «Sistema origen» (texto libre) → «Aplicación» (`SearchableSelect` con búsqueda, solo `isActive`, opción «Todas»)
- [x] Envía `applicationId` al `GET /notifications` + filtro en cliente por `row.applicationId`; chip activo muestra el nombre de la app
- [x] Form de crear: select «Aplicación» (activas) con `sourceSystem` = nombre de la app (el back exige ambos campos)
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F16 Crear notificación con login password (2026-10-01)
- [x] El form ya traía select de aplicación pero no enviaba `applicationId` (causa del 400); ahora lo envía + `sourceSystem` = nombre de la app
- [x] Back acepta ambos logins: client_credentials (app del JWT) y password/admin (`applicationId` del body validado contra el tenant)
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F17 Notificaciones: fecha/límite + fallback del día (2026-10-01)
- [x] Filtro «Fecha» (hoy por defecto) + «Ver» (Últimas 10/20/50/100); `GET /notifications` con `date/limit/status/applicationId`
- [x] Si hoy no hay nada (sin otros filtros): auto-fallback a últimas N con chip «Sin resultados hoy: últimas 20»; «Limpiar» vuelve a hoy
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F18 DataTable: crash `flatMap` por columna sin id (2026-10-01)
- [x] Causa: columna display con `header: ''` (ojo de detalle en Notificaciones) — TanStack v8 exige id, lanza en 1er render y el memo devuelve `undefined` en el siguiente → `TypeError: reading 'flatMap'` (reproducido en Node contra table-core 8.21.3)
- [x] `DataTable` normaliza: asigna `id: col-{i}` a display sin id/header vacío + `useMemo` + aviso en consola; fix sistémico para las 8 páginas
- [x] Verificación: repro Node OK (headers + memo estables) + `npm run build` OK

### [COMPLETADO] F13 Mapeos canal → proveedor visibles (2026-09-30)
- [x] `GET /providers/mappings` (back): listado del tenant con proveedor (nombre/tipo/estado) por mapeo
- [x] `GET /providers` y `GET /providers/:id` incluyen `channels` (canales con mapeo activo)
- [x] Columna «Canales» en tabla de proveedores + sección «Mapeos canal → proveedor» (Canal, Proveedor, Tipo, Mapeo, Estado proveedor, Desde)
- [x] Al mapear se invalidan list + mappings
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F14 Dashboard con métricas reales (2026-09-30)
- [x] Back lee 8 endpoints (`/dashboard/summary|volume|by-channel|by-application|by-provider|failures|latency|activity`)
- [x] KPIs, volumen diario (barras CSS), tablas por canal/app/proveedor, fallos recientes + top errores, latencia avg/p50/p95, actividad
- [x] Filtros 7D/30D; tasa de éxito y % fallidos visibles por canal, app y proveedor
- [x] Verificación: `npm run build` OK (tsc + vite)

### [PENDIENTE] F15 Métricas extra + caché
- [ ] Por plantilla (`template_code` top + tasa por plantilla), opt-out rate (preferences por canal), devices por plataforma
- [ ] Caché Redis TTL 60s en `DashboardService` para rangos 30D
- [ ] Gráficas con librería (recharts) en lugar de barras CSS

### [COMPLETADO] F16 Plantillas: estado + eliminar con regla (2026-09-30)
- [x] Columna «Estado» (ACTIVE/INACTIVE), toggle activar/desactivar, eliminar con confirmación
- [x] 409 → «No se puede eliminar: la usan N notificación(es).»
- [x] Fix colateral: imports sin usar en AppLayout que rompían `tsc -b`
- [x] Verificación: `npm run build` OK (tsc + vite)

### [COMPLETADO] F17 Diseño en rem + responsive (2026-09-30)
- [x] 0 `px` en CSS/TSX: 507 valores → `rem` (base 16px), `em` en media queries, `dvh` con fallback
- [x] Modal `wide`, CKEditor contenido, toasts `90vw`, tablas con scroll-x, drawer móvil, topbar apilable
- [x] Verificación: `tsc -b` + `vite build` + `oxlint` OK

### [COMPLETADO] F18 Formulario notificaciones (2026-09-30)
- [x] Alineación: `align-items: start` en `.form-grid` + sin hints que descuadren la fila
- [x] Idempotency opcional (vacío = UUID del servidor; back acepta omitirlo)
- [x] Template code seleccionable (solo plantillas activas)
- [x] Canales del formulario: EMAIL, SMS, WHATSAPP
- [x] Verificación: `npm run build` OK

### [COMPLETADO] F19 Remitente por plantilla (2026-10-01)
- [x] Campo «Email remitente» en crear/editar/clonar + columna From (vacío = proveedor)
- [x] Verificación: `npm run build` OK

### [COMPLETADO] F20 Estados de notificación (2026-10-01)
- [x] Filtro con estados reales (sin CREATED)
- [x] Verificación front OK
