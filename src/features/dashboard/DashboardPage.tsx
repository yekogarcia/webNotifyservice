import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  LayoutTemplate,
  Mails,
  Server,
  Smartphone,
  Truck,
  XCircle,
} from 'lucide-react'
import { healthApi } from '@/features/misc/api'
import { dashboardApi, rangeFrom, type ChannelStats, type AppStats, type ProviderStats, type LatencyStats, type ActivityItem } from './api'
import { Spinner } from '@/shared/ui/Spinner'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataTable } from '@/shared/ui/DataTable'
import { formatDateTime } from '@/shared/lib/format'
import styles from './DashboardPage.module.css'

function pct(r: number): string {
  return `${(Number(r ?? 0) * 100).toFixed(1)}%`
}

function secs(n: number): string {
  return `${Number(n ?? 0).toFixed(1)}s`
}

const channelColumns: ColumnDef<ChannelStats>[] = [
  { header: 'Canal', cell: ({ row }) => <Badge value={row.original.channel} /> },
  { header: 'Envíos', accessorKey: 'deliveries' },
  { header: 'Exitosos', accessorKey: 'sent' },
  { header: 'Fallidos', accessorKey: 'failed' },
  { header: 'Pendientes', accessorKey: 'pending' },
  { header: 'Tasa éxito', cell: ({ row }) => pct(row.original.successRate) },
]

const appColumns: ColumnDef<AppStats>[] = [
  { header: 'Aplicación', accessorKey: 'appName' },
  { header: 'Notificaciones', accessorKey: 'notifications' },
  { header: 'Envíos', accessorKey: 'deliveries' },
  { header: 'Fallidos', accessorKey: 'failed' },
  { header: 'Tasa éxito', cell: ({ row }) => pct(row.original.successRate) },
]

const providerColumns: ColumnDef<ProviderStats>[] = [
  { header: 'Proveedor', accessorKey: 'providerName' },
  { header: 'Tipo', cell: ({ row }) => row.original.providerType ?? '—' },
  { header: 'Envíos', accessorKey: 'deliveries' },
  { header: 'Tasa éxito', cell: ({ row }) => pct(row.original.successRate) },
  {
    header: 'Último error',
    cell: ({ row }) =>
      row.original.lastErrorType ? (
        <Badge value="FAILED" />
      ) : (
        <span className={styles.muted}>{row.original.failed > 0 ? `${row.original.failed} fallos` : '—'}</span>
      ),
  },
]

const latencyColumns: ColumnDef<LatencyStats>[] = [
  { header: 'Canal', cell: ({ row }) => <Badge value={row.original.channel} /> },
  { header: 'Envíos', accessorKey: 'deliveries' },
  { header: 'Promedio', cell: ({ row }) => secs(row.original.avgSeconds) },
  { header: 'p50', cell: ({ row }) => secs(row.original.p50Seconds) },
  { header: 'p95', cell: ({ row }) => secs(row.original.p95Seconds) },
]

const activityColumns: ColumnDef<ActivityItem>[] = [
  { header: 'Evento', accessorKey: 'eventType' },
  { header: 'App', cell: ({ row }) => row.original.appName ?? '—' },
  {
    header: 'Fecha',
    cell: ({ row }) => (row.original.createdAt ? formatDateTime(row.original.createdAt) : '—'),
  },
]

export function DashboardPage() {
  const [days, setDays] = useState<7 | 30>(30)
  const range = useMemo(() => ({ from: rangeFrom(days) }), [days])

  const status = useQuery({ queryKey: ['health'], queryFn: healthApi.status, retry: false })
  const summary = useQuery({ queryKey: ['dashboard', 'summary', days], queryFn: () => dashboardApi.summary(range), retry: false })
  const volume = useQuery({ queryKey: ['dashboard', 'volume', days], queryFn: () => dashboardApi.volume({ ...range, granularity: 'day' }), retry: false })
  const byChannel = useQuery({ queryKey: ['dashboard', 'by-channel', days], queryFn: () => dashboardApi.byChannel(range), retry: false })
  const byApp = useQuery({ queryKey: ['dashboard', 'by-application', days], queryFn: () => dashboardApi.byApplication({ ...range, limit: 10 }), retry: false })
  const byProvider = useQuery({ queryKey: ['dashboard', 'by-provider', days], queryFn: () => dashboardApi.byProvider(range), retry: false })
  const failures = useQuery({ queryKey: ['dashboard', 'failures', days], queryFn: () => dashboardApi.failures({ ...range, limit: 10 }), retry: false })
  const latency = useQuery({ queryKey: ['dashboard', 'latency', days], queryFn: () => dashboardApi.latency(range), retry: false })
  const activity = useQuery({ queryKey: ['dashboard', 'activity', days], queryFn: () => dashboardApi.activity({ limit: 15 }), retry: false })

  const healthy = !status.isError && status.data != null
  const s = summary.data
  const points = Array.isArray(volume.data) ? volume.data : []
  const maxVol = points.reduce((m, p) => Math.max(m, p.deliveries), 0)

  const kpis = [
    { label: 'Notificaciones', value: s ? String(s.notifications) : '—' },
    { label: 'Envíos (deliveries)', value: s ? String(s.deliveries) : '—' },
    { label: 'Tasa de éxito', value: s ? pct(s.successRate) : '—' },
    { label: 'Fallidos', value: s ? String(s.failed) : '—' },
    { label: 'Pendientes', value: s ? String(s.pending) : '—' },
    { label: `Reintentos (media ${s ? s.avgAttempts.toFixed(1) : '—'} int.)`, value: s ? String(s.retried) : '—' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Resumen operativo</p>
          <h1>Dashboard</h1>
          <p className={styles.sub}>
            Métricas del tenant en los últimos {days} días: volumen, éxito por canal,
            por aplicación y por proveedor, fallos y latencia.
          </p>
        </div>
        <span className={styles.headBtns}>
          <span className={styles.rangeRow}>
            <Button variant={days === 7 ? 'primary' : 'ghost'} onClick={() => setDays(7)}>7D</Button>
            <Button variant={days === 30 ? 'primary' : 'ghost'} onClick={() => setDays(30)}>30D</Button>
          </span>
          <Link className={styles.cta} to="/notifications/new">
            <Bell size={17} strokeWidth={1.75} aria-hidden="true" />
            <span>Crear notificación</span>
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </span>
      </div>

      {summary.isPending ? (
        <div className={styles.loadingRow}>
          <Spinner />
        </div>
      ) : summary.isError ? (
        <Card title="Sin métricas" subtitle="No se pudieron cargar (¿sesión activa?)">
          <p className={styles.muted}>Revisa la conexión o inicia sesión de nuevo.</p>
        </Card>
      ) : null}

      <section className={styles.kpis} aria-label="Indicadores">
        {kpis.map((k) => (
          <Card key={k.label} className={styles.kpi}>
            <p className={styles.kpiValue}>{k.value}</p>
            <p className={styles.kpiLabel}>{k.label}</p>
          </Card>
        ))}
        <Card glow={healthy ? 'purple' : 'orange'} className={styles.kpi}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.violet}`}>
              <Server size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className={healthy ? styles.pillOk : styles.pillBad}>
              {healthy ? <CheckCircle2 size={14} strokeWidth={1.75} /> : <XCircle size={14} strokeWidth={1.75} />}
              {healthy ? 'Operativo' : 'Sin conexión'}
            </span>
          </div>
          <p className={styles.kpiValue}>{s ? `${s.activeApps} apps · ${s.activeProviders} prov.` : '—'}</p>
          <p className={styles.kpiLabel}>Activos en el tenant</p>
        </Card>
      </section>

      <Card title={`Volumen diario (${days}D)`} subtitle="Notificaciones y envíos por día">
        {points.length === 0 ? (
          <p className={styles.muted}>Sin datos en el rango.</p>
        ) : (
          <div className={styles.bars} role="img" aria-label="Volumen diario">
            {points.map((p) => (
              <div
                key={String(p.bucket)}
                className={styles.bar}
                style={{ height: `${maxVol > 0 ? Math.max(3, Math.round((p.deliveries / maxVol) * 100)) : 3}%` }}
                title={`${String(p.bucket).slice(0, 10)}: ${p.notifications} notif. · ${p.deliveries} envíos · ${p.failed} fallidos`}
              />
            ))}
          </div>
        )}
      </Card>

      <section className={styles.grid}>
        <Card title="Por canal" subtitle="% fallidos y éxito por channel">
          <DataTable
            columns={channelColumns}
            data={Array.isArray(byChannel.data) ? byChannel.data : []}
            loading={byChannel.isPending}
            emptyTitle="Sin envíos"
            emptyHint="Sin deliveries en el rango."
            getRowId={(r) => r.channel}
          />
        </Card>
        <Card title="Por aplicación" subtitle="Cuántas notificaciones envía cada app">
          <DataTable
            columns={appColumns}
            data={Array.isArray(byApp.data) ? byApp.data : []}
            loading={byApp.isPending}
            emptyTitle="Sin datos"
            emptyHint="Sin notificaciones en el rango."
            getRowId={(r) => r.applicationId}
          />
        </Card>
      </section>

      <section className={styles.grid}>
        <Card title="Por proveedor" subtitle="Rendimiento y último error">
          <DataTable
            columns={providerColumns}
            data={Array.isArray(byProvider.data) ? byProvider.data : []}
            loading={byProvider.isPending}
            emptyTitle="Sin datos"
            emptyHint="Sin envíos en el rango."
            getRowId={(r) => r.providerId ?? r.providerName}
          />
        </Card>
        <Card title="Latencia de envío" subtitle="Creado → enviado por canal">
          <DataTable
            columns={latencyColumns}
            data={Array.isArray(latency.data) ? latency.data : []}
            loading={latency.isPending}
            emptyTitle="Sin datos"
            emptyHint="Sin envíos exitosos en el rango."
            getRowId={(r) => r.channel}
          />
        </Card>
      </section>

      <section className={styles.grid}>
        <Card title="Fallos recientes" subtitle="Últimos deliveries fallidos con su error">
          <DataTable
            columns={[
              { header: 'Canal', cell: ({ row }: { row: { original: { channel: string } } }) => <Badge value={row.original.channel} /> },
              { header: 'Proveedor', accessorKey: 'providerName' },
              { header: 'Error', accessorKey: 'lastError' },
            ]}
            data={failures.data?.recent ?? []}
            loading={failures.isPending}
            emptyTitle="Sin fallos"
            emptyHint="No hay deliveries fallidos en el rango. ¡Bien!"
            getRowId={(r) => (r as { deliveryId: string }).deliveryId}
          />
          {failures.data && failures.data.byErrorType.length > 0 ? (
            <p className={styles.badges}>
              {failures.data.byErrorType.map((e) => (
                <span key={e.errorType} className={styles.muted}>
                  {e.errorType} ({e.count})
                </span>
              ))}
            </p>
          ) : null}
        </Card>
        <Card title="Actividad" subtitle="Últimos eventos del tenant">
          <DataTable
            columns={activityColumns}
            data={Array.isArray(activity.data) ? activity.data : []}
            loading={activity.isPending}
            emptyTitle="Sin actividad"
            emptyHint="Sin eventos recientes."
            getRowId={(r) => r.id}
          />
        </Card>
      </section>

      <Card
        title="Acciones frecuentes"
        subtitle="Atajos a los flujos principales del producto"
      >
        <ul className={styles.actions}>
          <li>
            <Link to="/notifications/new"><Bell size={17} strokeWidth={1.75} /> Crear notificación <ArrowRight size={15} strokeWidth={1.75} /></Link>
          </li>
          <li>
            <Link to="/notifications/lookup"><Server size={17} strokeWidth={1.75} /> Consultar estado por ID <ArrowRight size={15} strokeWidth={1.75} /></Link>
          </li>
          <li>
            <Link to="/templates"><LayoutTemplate size={17} strokeWidth={1.75} /> Gestionar plantillas <ArrowRight size={15} strokeWidth={1.75} /></Link>
          </li>
          <li>
            <Link to="/providers"><Truck size={17} strokeWidth={1.75} /> Configurar proveedor <ArrowRight size={15} strokeWidth={1.75} /></Link>
          </li>
          <li>
            <Link to="/applications"><Smartphone size={17} strokeWidth={1.75} /> Crear aplicación <ArrowRight size={15} strokeWidth={1.75} /></Link>
          </li>
        </ul>
      </Card>

      <section className={styles.grid}>
        <Card title="Canales soportados" subtitle="WHATSAPP = texto libre o template HSM">
          <p className={styles.badges}>
            <Badge value="EMAIL" /> <Badge value="SMS" /> <Badge value="PUSH" />{' '}
            <Badge value="WHATSAPP" />
          </p>
          <div className={styles.channelList}>
            <span><Smartphone size={15} strokeWidth={1.75} /> Push / Devices</span>
            <span><Mails size={15} strokeWidth={1.75} /> Email / SMTP</span>
          </div>
        </Card>
      </section>
    </div>
  )
}
