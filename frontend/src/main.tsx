import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 시연 장소에 인터넷이 없어도 같은 글꼴로 보이도록 번들에 포함한다
import '@fontsource/ibm-plex-sans-kr/400.css'
import '@fontsource/ibm-plex-sans-kr/500.css'
import '@fontsource/ibm-plex-sans-kr/600.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './index.css'
import './styles/app.css'
import App from './App.tsx'
import { repairStore } from './store/useRepairStore'

// 시연 영상 녹화 스크립트(frontend/film)가 장면 상태를 맞출 때만 쓴다. 개발 서버에서만 열린다
if (import.meta.env.DEV) (window as unknown as { __repairStore: typeof repairStore }).__repairStore = repairStore

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
