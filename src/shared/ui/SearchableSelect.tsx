import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import fieldStyles from './Field.module.css'
import styles from './SearchableSelect.module.css'

export interface SearchOption {
  value: string
  label: string
}

interface Props {
  label: string
  value: string
  options: SearchOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  disabled?: boolean
  error?: string | undefined
  hint?: string | undefined
  className?: string | undefined
  /** Permite escribir un valor manual que no esté en la lista (ids sin GET de listado). */
  allowCustom?: boolean
  customText?: string
}

/* Select con búsqueda: muestra las opciones del GET correspondiente y filtra
 * mientras se escribe. Misma altura (2.625rem) y radio (0.3125rem) que inputs/botones. */
export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados',
  loading,
  disabled,
  error,
  hint,
  className,
  allowCustom,
  customText = 'Usar valor escrito',
}: Props) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const uid = useId()

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase()
    if (!t) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(t) || o.value.toLowerCase().includes(t),
    )
  }, [options, term])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setTerm('')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setTerm('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open ])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open ])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    setTerm('')
  }

  const showCustom =
    allowCustom && term.trim() !== '' && !filtered.some((o) => o.value === term.trim())

  return (
    <div ref={rootRef} className={cn(fieldStyles.wrap, styles.root, className)}>
      <label className={fieldStyles.label} htmlFor={uid}>
        {label}
      </label>
      <button
        id={uid}
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(styles.trigger, error && fieldStyles.invalid)}
      >
        <span className={cn(styles.triggerText, !selected && styles.placeholder)}>
          {loading ? 'Cargando…' : (selected?.label ?? placeholder)}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={styles.chevron} />
      </button>
      {open ? (
        <div className={styles.pop} role="listbox" aria-label={label}>
          <div className={styles.searchRow}>
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={`Buscar ${label}`}
            />
          </div>
          <ul className={styles.list}>
            {showCustom ? (
              <li key="__custom">
                <button type="button" onClick={() => pick(term.trim())}>
                  <span className={styles.optLabel}>
                    {customText}: <strong>{term.trim()}</strong>
                  </span>
                </button>
              </li>
            ) : null}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => pick(o.value)}
                  className={o.value === value ? styles.active : undefined}
                >
                  <span className={styles.optLabel}>{o.label}</span>
                  {o.label !== o.value ? (
                    <span className={styles.optValue}>{o.value}</span>
                  ) : null}
                </button>
              </li>
            ))}
            {filtered.length === 0 && !showCustom ? (
              <li className={styles.empty}>{emptyText}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
      {error ? (
        <p className={fieldStyles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={fieldStyles.hint}>{hint}</p>
      ) : null}
    </div>
  )
}
