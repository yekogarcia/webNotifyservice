import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'
import styles from './DataTable.module.css'

/* Tabla reutilizable (OCP): las features solo declaran columnas. */
interface Props<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  loading?: boolean
  emptyTitle?: string
  emptyHint?: string
  getRowId?: (row: T) => string
  /** Nombre para ubicar la tabla en logs (debug). */
  name?: string
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyTitle = 'Sin resultados',
  emptyHint,
  getRowId,
  name = 'table',
}: Props<T>) {
  /* TanStack v8 exige `id` en columnas display (sin accessor): un `header: ''`
   * lanza en el primer render y el memo devuelve `undefined` en el siguiente
   * (TypeError: reading 'flatMap'). Se normaliza aquí para no tumbar páginas. */
  const safeColumns = useMemo(() => {
    if (!Array.isArray(columns)) {
      console.error(`[DataTable:${name}] columnas inválidas`, { columns })
      return [] as ColumnDef<T, unknown>[]
    }
    return columns.map((c, i) => {
      const def = c as ColumnDef<T, unknown> & {
        id?: string
        accessorKey?: string
        accessorFn?: unknown
        header?: unknown
      }
      if (def.id ?? def.accessorKey ?? def.accessorFn) return c
      if (typeof def.header === 'string' && def.header) return c
      console.error(`[DataTable:${name}] columna display sin id (índice ${i}); id automático`, { column: c })
      return { ...c, id: `col-${i}` } as ColumnDef<T, unknown>
    })
  }, [columns, name])
  const safeData = Array.isArray(data) ? data : []
  if (!Array.isArray(data)) {
    console.error(`[DataTable:${name}] datos inválidos`, { data })
  }
  const table = useReactTable({
    columns: safeColumns,
    data: safeData,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId as ((row: T) => string) | undefined,
  })

  if (loading) return <Spinner />
  if (safeData.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} scope="col">
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
