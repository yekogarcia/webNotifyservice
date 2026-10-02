import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from '@tanstack/react-form'
import { authApi } from './api'
import { errorMessage } from '@/shared/api/errors'
import { isEmail, isSlug, required } from '@/shared/lib/validators'
import { TextField } from '@/shared/ui/TextField'
import { Button } from '@/shared/ui/Button'
import styles from './Auth.module.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', slug: '', email: '', password: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      try {
        await authApi.registerTenant(value)
        navigate('/login', { replace: true })
      } catch (err) {
        setSubmitError(errorMessage(err, 'No se pudo registrar el tenant'))
      }
    },
  })

  return (
    <div className={styles.wrap}>
      <div>
        <h1>Registrar tenant</h1>
        <p className={styles.sub}>Crea la cuenta administrativa para tu tenant.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="name"
          validators={{ onChange: ({ value }) => required(value) }}
        >
          {(field) => (
            <TextField
              label="Nombre"
              autoComplete="organization"
              placeholder="Mi empresa"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.join(', ') || undefined}
            />
          )}
        </form.Field>
        <form.Field
          name="slug"
          validators={{
            onChange: ({ value }) =>
              required(value) ??
              (isSlug(value) ? undefined : 'Solo minúsculas, números y guiones'),
          }}
        >
          {(field) => (
            <TextField
              label="Slug"
              hint="Ej. banco-xyz"
              autoComplete="off"
              placeholder="mi-tenant"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.join(', ') || undefined}
            />
          )}
        </form.Field>
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) =>
              required(value) ?? (isEmail(value) ? undefined : 'Email inválido'),
          }}
        >
          {(field) => (
            <TextField
              label="Email admin"
              type="email"
              autoComplete="email"
              placeholder="admin@empresa.com"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.join(', ') || undefined}
            />
          )}
        </form.Field>
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) =>
              required(value) ??
              (value.length >= 8 ? undefined : 'Mínimo 8 caracteres'),
          }}
        >
          {(field) => (
            <TextField
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="Minimo 8 caracteres"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.join(', ') || undefined}
            />
          )}
        </form.Field>
        {submitError ? <p className={styles.error} role="alert">{submitError}</p> : null}
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              Registrar
            </Button>
          )}
        </form.Subscribe>
      </form>
      <p className={styles.foot}>
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </div>
  )
}
