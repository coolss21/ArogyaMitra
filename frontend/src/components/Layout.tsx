import { NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../lib/api'
import {
  Heart, LayoutDashboard, Dumbbell, UtensilsCrossed, MessageCircle,
  TrendingUp, Settings, LogOut, Zap, Activity, Clock, ShoppingCart, Trophy, Image
} from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
  { to: '/aromi', icon: MessageCircle, label: 'AROMI' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/timeline', icon: Image, label: 'Photos' },
  { to: '/challenges', icon: Trophy, label: 'Challenges' },
  { to: '/reports/weekly', icon: Activity, label: 'Weekly Report' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/grocery', icon: ShoppingCart, label: 'Grocery' },
  { to: '/agent-events', icon: Zap, label: 'Agent Log' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface LayoutProps { children: React.ReactNode }

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()

  function logout() {
    clearToken()
    navigate('/login')
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-900/80 border-r border-surface-700/50 p-5">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">ArogyaMitra</h1>
            <p className="text-xs text-surface-400">Agentic AI</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/40'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all mt-4"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-dvh overflow-x-hidden">
        <main className="flex-1 p-5 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
          {children}
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-900/95 backdrop-blur border-t border-surface-700/50 flex justify-around py-2 z-50 overflow-x-auto">
          {NAV.slice(0, 8).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs transition-all ${
                  isActive ? 'text-primary-400' : 'text-surface-500'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
