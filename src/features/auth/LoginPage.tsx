import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from '@tanstack/react-form'
import { authApi } from './api'
import { useAuthStore } from '@/shared/store/auth.store'
import { errorMessage } from '@/shared/api/errors'
import { isEmail, required } from '@/shared/lib/validators'
import { TextField } from '@/shared/ui/TextField'
import { Button } from '@/shared/ui/Button'
import styles from './Auth.module.css'

export function LoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const setSession = useAuthStore((s) => s.setSession)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { username: '', password: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      try {
        const res = await authApi.loginPassword(value)
        setTokens({
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
          expiresIn: res.expires_in,
        })
        setSession({ username: value.username, email: value.username })
        navigate('/', { replace: true })
      } catch (err) {
        setSubmitError(errorMessage(err, 'Credenciales inválidas'))
      }
    },
  })

  return (
    <div className={styles.wrap}>
      <div>
        <h1>Iniciar sesión</h1>
        <p className={styles.sub}>Accede con tu cuenta del tenant.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field
          name="username"
          validators={{
            onChange: ({ value }) =>
              required(value) ?? (isEmail(value) ? undefined : 'Email inválido'),
          }}
        >
          {(field) => (
            <TextField
              label="Email (username)"
              type="email"
              autoComplete="username"
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
            onChange: ({ value }) => required(value),
          }}
        >
          {(field) => (
            <TextField
              label="Contraseña"
              type="password"
              autoComplete="current-password"
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
              Entrar
            </Button>
          )}
        </form.Subscribe>
      </form>
      <p className={styles.foot}>
        ¿Sin cuenta? <Link to="/register">Registrar tenant</Link>
      </p>
    </div>
  )
}
