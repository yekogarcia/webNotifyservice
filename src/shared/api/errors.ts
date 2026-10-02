export class ApiError extends Error {
  status: number
  payload: unknown
  constructor(status: number, message: string, payload: unknown = null) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export function errorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}
