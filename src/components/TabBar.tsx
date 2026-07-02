import { NavLink } from 'react-router-dom'
import {
  Archive,
  ChartBar,
  GearSix,
  Sun,
} from '@phosphor-icons/react'

const tabs = [
  { to: '/', label: 'Сегодня', icon: Sun },
  { to: '/archive', label: 'Архив', icon: Archive },
  { to: '/report', label: 'Отчёт', icon: ChartBar },
  { to: '/settings', label: 'Настройки', icon: GearSix },
]

export default function TabBar() {
  return (
    <nav
      className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2
        mb-[env(safe-area-inset-bottom)]
        rounded-full bg-white/80 backdrop-blur-xl ring-1 ring-black/5
        shadow-soft px-2 py-1.5 flex gap-1"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 rounded-full
             min-w-[64px] min-h-[48px] px-3 py-1.5
             transition-colors duration-500 ease-koneko
             ${isActive ? 'bg-sakura/15 text-ink' : 'text-muted'}`
          }
        >
          <Icon size={22} weight="light" />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
