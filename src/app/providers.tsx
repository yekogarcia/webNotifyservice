import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { useState } from 'react'
import { router } from './router'
import { Toasts } from '@/shared/ui/Toasts'

export function AppProviders() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toasts />
    </QueryClientProvider>
  )
}
