import 'leaflet/dist/leaflet.css'
import { PwaProvider } from './components/organisms/PwaProvider'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PwaProvider><App /></PwaProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
