import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { getToken, UNAUTHORIZED_EVENT } from './lib/http'
import { fetchSettings } from './lib/settings'
import { isIos, isStandalone } from './lib/push'
import TabBar from './components/TabBar'
import QuickAddModal from './components/QuickAddModal'
import TodayScreen from './screens/TodayScreen'
import ArchiveScreen from './screens/ArchiveScreen'
import ReportScreen from './screens/ReportScreen'
import SettingsScreen from './screens/SettingsScreen'
import QuestionDetailScreen from './screens/QuestionDetailScreen'
import AuthScreen from './screens/AuthScreen'
import InstallScreen from './screens/InstallScreen'
import EnableNotificationsScreen from './screens/EnableNotificationsScreen'

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()))
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [feedVersion, setFeedVersion] = useState(0)
  const [installDismissed, setInstallDismissed] = useState(
    () => sessionStorage.getItem('kiko-install-dismissed') === '1',
  )
  const [notifStep, setNotifStep] = useState(
    () =>
      'Notification' in window &&
      Notification.permission === 'default' &&
      isStandalone() &&
      localStorage.getItem('kiko-notif-asked') !== '1',
  )

  // 401 от API → выход на экран входа
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  // Подтягиваем серверные настройки в локальный кэш
  useEffect(() => {
    if (authed) fetchSettings().catch(() => {})
  }, [authed])

  if (!authed) return <AuthScreen onLogin={() => setAuthed(true)} />

  // Пуши на iOS работают только из установленной PWA — онбординг установки
  if (isIos() && !isStandalone() && !installDismissed) {
    return (
      <InstallScreen
        onSkip={() => {
          sessionStorage.setItem('kiko-install-dismissed', '1')
          setInstallDismissed(true)
        }}
      />
    )
  }

  if (notifStep) {
    return (
      <EnableNotificationsScreen
        onDone={() => {
          localStorage.setItem('kiko-notif-asked', '1')
          setNotifStep(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-[100dvh] pb-32">
      <Routes>
        <Route path="/" element={<TodayScreen key={feedVersion} />} />
        <Route path="/archive" element={<ArchiveScreen />} />
        <Route path="/report" element={<ReportScreen />} />
        <Route path="/settings" element={<SettingsScreen onLogout={() => setAuthed(false)} />} />
        <Route path="/question/:id" element={<QuestionDetailScreen />} />
      </Routes>

      <TabBar />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaved={() => {
          setQuickAddOpen(false)
          setFeedVersion((v) => v + 1)
        }}
      />

      {/* Плавающая кнопка «+» — всегда на экране */}
      <button
        aria-label="Новый вопрос"
        onClick={() => setQuickAddOpen(true)}
        className="fixed right-5 bottom-24 z-40 h-14 w-14 rounded-full bg-sakura
          text-white text-3xl leading-none shadow-[0_8px_30px_rgba(232,180,184,0.5)]
          transition-transform duration-500 ease-koneko active:scale-90
          mb-[env(safe-area-inset-bottom)]"
      >
        +
      </button>
    </div>
  )
}
