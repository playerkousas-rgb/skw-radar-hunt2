import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')!
const entry = document.documentElement

if (entry.dataset.storeAdmitted === 'true') {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else if (!entry.hasAttribute('data-store-gated')) {
  // The official gate owns the blocked view. If loading it failed, don't boot
  // the app (or request GPS) and don't send the user to an unverified URL.
  const notice = document.createElement('p')
  notice.className = 'p-6 text-center'
  notice.setAttribute('role', 'status')
  notice.textContent = '未能載入入口檢查，請重新整理。'
  root.appendChild(notice)
}
