import { useNavigate } from 'react-router-dom'
import { NotificationForm } from './NotificationForm'
import { Card } from '@/shared/ui/Card'
import styles from './NotificationCreatePage.module.css'

/* Ruta /notifications/new — mismo formulario del popup, en página completa. */
export function NotificationCreatePage() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Flujo guiado</p>
          <h1>Nueva notificación</h1>
          <p className={styles.sub}>
            Completa el envío con el contexto mínimo necesario y valida la plantilla
            antes de encolar la notificación.
          </p>
        </div>
        <div className={styles.tips}>
          <p>Recomendaciones rápidas</p>
          <ul>
            <li>Usa una `idempotency key` reconocible para depurar reintentos.</li>
            <li>Verifica la plantilla antes de enviar si cambiaste el código.</li>
            <li>Mantén el JSON de `data` alineado con las variables del template.</li>
          </ul>
        </div>
      </div>
      <Card
        title="Datos del envío"
        subtitle="El formulario se adapta al canal y tipo de destinatario seleccionados."
      >
        <NotificationForm onCreated={(id) => navigate(`/notifications/${id}`)} />
      </Card>
    </div>
  )
}
