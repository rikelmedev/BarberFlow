import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { trpc } from './lib/trpc'
import { TRPC_URL } from './const'
import App from './App.tsx'
import './index.css'

// 1. Cria o cliente do React Query (gerencia cache e estados de loading)
const queryClient = new QueryClient()

// 2. Cria o cliente do tRPC (a ponte para o seu servidor)
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: TRPC_URL, 
    }),
  ],
  transformer: superjson, 
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)