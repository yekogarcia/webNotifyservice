import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { GuestLayout } from './GuestLayout'
import { RequireAdmin, RequireAuth } from './guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { NotificationCreatePage } from '@/features/notifications/NotificationCreatePage'
import { NotificationDetailPage } from '@/features/notifications/NotificationDetailPage'
import { TemplatesPage } from '@/features/templates/TemplatesPage'
import { ProvidersPage } from '@/features/providers/ProvidersPage'
import { ApplicationsPage } from '@/features/applications/ApplicationsPage'
import { PreferencesPage } from '@/features/misc/PreferencesPage'
import { DevicesPage } from '@/features/misc/DevicesPage'
import { HealthPage } from '@/features/misc/HealthPage'

export const router = createBrowserRouter([
  {
    element: <GuestLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/notifications/new', element: <NotificationCreatePage /> },
          { path: '/notifications/lookup', element: <NotificationDetailPage /> },
          { path: '/notifications/:id', element: <NotificationDetailPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: '/templates', element: <TemplatesPage /> },
              { path: '/providers', element: <ProvidersPage /> },
              { path: '/applications', element: <ApplicationsPage /> },
              { path: '/preferences', element: <PreferencesPage /> },
              { path: '/devices', element: <DevicesPage /> },
            ],
          },
          { path: '/health', element: <HealthPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <LoginPage /> },
])
