import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { GameErrorBoundary } from './ui/components/GameErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GameErrorBoundary>
      <App />
    </GameErrorBoundary>
  </React.StrictMode>,
)