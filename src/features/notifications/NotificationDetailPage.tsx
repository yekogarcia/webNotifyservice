import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { RotateCw } from 'lucide-react'
import { notificationsApi } from './api'
import type { Delivery } from '@/shared/model/types'
import { errorMessage } from '@/shared/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { Spinner } from '@/shared/ui/Spinner'
import { EmptyState } from '@/shared/ui/EmptyState'
import { TextField } from '@/shared/ui/TextField'
import { DataTable } from '@/shared/ui/DataTable'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './NotificationDetailPage.module.css'

export function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lookup, setLookup] = useState(id ?? '')
  const [activeId, setActiveId] = useState<string | null>(id ?? null)
  const push = useToastStore((s) => s.push)
  const qc = useQueryClient()

  const detail = useQuery({
    queryKey: ['notifications', activeId],
    queryFn: () => notificationsApi.byId(activeId as string),
    enabled: Boolean(activeId),
    retry: false,
  })

  const retry = useMutation({
    mutationFn: (deliveryId: string) => notificationsApi.retryDelivery(deliveryId),
    onSuccess: (res) => {
      push('success', `Delivery ${res.deliveryId} re-encolado`)
      void qc.invalidateQueries({ queryKey: ['notifications', activeId] })
    },
    onError: (err) => push('error', errorMessage(err)),
  })

  const deliveryColumns: ColumnDef<Delivery>[] = [
    { header: 'Canal', cell: ({ row }) => <Badge value={row.original.channel} /> },
    { header: 'Estado', cell: ({ row }) => <Badge value={row.original.status} /> },
    {
      header: 'Intentos',
      cell: ({ row }) => `${row.original.attemptCount}/${row.original.maxAttempts}`,
    },
    {
      header: 'Provider msg',
      cell: ({ row }) =>
        row.original.providerMessageId ? <code>{row.original.providerMessageId}</code> : <span className={styles.muted}>—</span>,
    },
    {
      header: 'Acciones',
      cell: ({ row }) => (
        <IconButton title="Reintentar" onClick={() => retry.mutate(row.original.id)} disabled={retry.isPending}>
          <RotateCw />
        </IconButton>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Detalle de notificación</h1>
        </div>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setActiveId(lookup.trim() || null)
        }}
      >
        <TextField label="Notification ID" className="grow" value={lookup} onChange={(e) => setLookup(e.target.value)} hint="Lo recibes al crear la notificación" />
        <Button type="submit">Consultar</Button>
      </form>

      {detail.isPending && activeId ? <Spinner /> : null}
      {detail.isError ? (
        <EmptyState title="No se encontró la notificación" hint={errorMessage(detail.error)} />
      ) : null}
      {detail.data ? (
        <div className={styles.card}>
          <div className={styles.row}>
            <Badge value={detail.data.status} />
            <span className={styles.muted}>{detail.data.templateCode}</span>
          </div>
          <dl className={styles.dl}>
            <div><dt>Evento</dt><dd>{detail.data.eventType}</dd></div>
            <div><dt>Origen</dt><dd>{detail.data.sourceSystem}</dd></div>
            <div><dt>Idioma</dt><dd>{detail.data.language}</dd></div>
            <div><dt>Creada</dt><dd>{formatDateTime(detail.data.createdAt)}</dd></div>
          </dl>
          <h2>Entregas ({detail.data.deliveries?.length ?? 0})</h2>
          <DataTable
            columns={deliveryColumns}
            data={detail.data.deliveries ?? []}
            emptyTitle="Sin entregas"
            getRowId={(r) => r.id}
          />
          {(detail.data.deliveries ?? []).flatMap((d) => d.attempts ?? []).length > 0 ? (
            <>
              <h2>Intentos</h2>
              {(detail.data.deliveries ?? []).map((d) =>
                (d.attempts ?? []).map((a) => (
                  <p key={a.id} className={styles.muted}>
                    <code>{d.channel}</code> #{a.attemptNumber} {a.result} · {a.errorType ?? 'ok'} ·{' '}
                    {formatDateTime(a.attemptedAt)}
                  </p>
                )),
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
