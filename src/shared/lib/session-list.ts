import { useEffect, useState } from 'react'

/* Persiste en localStorage las tablas que el backend no puede listar
 * (swagger sin GET de listado: plantillas, proveedores, dispositivos).
 * Así al abrir el módulo la tabla ya muestra la data existente. */
export function loadStored<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function saveStored<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible: se sigue en memoria */
  }
}

/* Estado que se carga al abrir el módulo y se persiste en cada cambio. */
export function useStoredList<T>(key: string): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [list, setList] = useState<T[]>(() => loadStored<T>(key))
  useEffect(() => {
    saveStored(key, list)
  }, [key, list])
  return [list, setList]
}
