import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'
import { Dumbbell, UtensilsCrossed, TrendingUp, MessageCircle, Flame, Target, Trophy, Zap, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.profile.get })
  const { data: summary } = useQuery({ queryKey: ['progress-summary'], queryFn: api.progress.summary })
  const { data: gamification } = useQuery({ queryKey: ['gamification'], queryFn: api.gamification.dashboard })
  const { data: workout } = useQuery({ queryKey: ['workout-latest'], queryFn: api.plans.getWorkout, retry: false })
  const { data: report, isLoading: isReportLoading } = useQuery({ queryKey: ['reports-weekly'], queryFn: api.reports.getWeekly })

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">{profile?.name ? `Welcome back, ${profile.name}!` : 'Welcome back!'}</h1>
        <p className="text-surface-400 mt-1">Your AI wellness overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Flame, color: 'text-orange-400', label: 'Streak', value: `${summary?.current_streak ?? 0}d` },
          { icon: Target, color: 'text-primary-400', label: 'Adherence', value: `${summary?.adherence_pct ?? 0}%` },
          { icon: Trophy, color: 'text-amber-400', label: 'Achievements', value: gamification?.total_achievements ?? 0 },
          { icon: Zap, color: 'text-blue-400', label: 'Agent Steps', value: '∞' },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${color}`} /><span className="text-xs text-surface-400 uppercase tracking-wider">{label}</span></div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* AI Weekly Report */}
      {isReportLoading ? (
        <div className="glass-card p-6 animate-pulse">
          <div className="h-6 w-1/3 bg-surface-700 rounded mb-4"></div>
          <div className="h-4 w-full bg-surface-700/50 rounded mb-2"></div>
          <div className="h-4 w-2/3 bg-surface-700/50 rounded"></div>
        </div>
      ) : report?.summary && (
        <div className="glass-card p-6 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/30 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 p-4 opacity-5"><Sparkles className="w-32 h-32" /></div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-primary-300">
              <Sparkles className="w-5 h-5 text-accent-400" /> Weekly Insights
            </h2>
            <Link to="/reports/weekly" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              Full Report →
            </Link>
          </div>
          <p className="text-surface-200 text-sm leading-relaxed relative z-10">{report.summary}</p>
        </div>
      )}

      {/* Weight chart */}
      {summary?.weight_trend?.length > 1 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-400" />Weight Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={summary.weight_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#141f36', border: '1px solid #2c3e5a', borderRadius: '10px' }} />
              <Line type="monotone" dataKey="weight_kg" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's workout preview */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary-400" />Today's Workout</h2>
          <Link to="/workout" className="text-sm text-primary-400 hover:text-primary-300">View Plan →</Link>
        </div>
        {workout?.plan_data?.days?.[0] ? (
          <div className="space-y-2">
            <p className="text-sm mb-2"><span className="badge-green">{workout.plan_data.days[0].type}</span> <span className="ml-2">{workout.plan_data.days[0].day_name}</span></p>
            {workout.plan_data.days[0].main_workout?.slice(0, 3).map((ex: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 bg-surface-700/40 rounded-lg">
                <span className="w-7 h-7 bg-primary-500/15 rounded-lg flex items-center justify-center text-primary-400 text-xs font-bold">{i + 1}</span>
                <div><p className="text-sm font-medium">{ex.exercise}</p><p className="text-xs text-surface-400">{ex.sets} × {ex.reps}</p></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Dumbbell className="w-10 h-10 text-surface-600 mx-auto mb-2" />
            <p className="text-surface-400 text-sm mb-3">No workout plan yet</p>
            <Link to="/workout" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">Generate Plan</Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/workout', icon: Dumbbell, label: 'Workout', color: 'text-primary-400', border: 'hover:border-primary-500/50' },
          { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition', color: 'text-accent-400', border: 'hover:border-accent-500/50' },
          { to: '/aromi', icon: MessageCircle, label: 'Ask AROMI', color: 'text-blue-400', border: 'hover:border-blue-500/50' },
          { to: '/agent-events', icon: Zap, label: 'Agent Log', color: 'text-amber-400', border: 'hover:border-amber-500/50' },
        ].map(({ to, icon: Icon, label, color, border }) => (
          <Link key={to} to={to} className={`glass-card p-5 ${border} transition-all group`}>
            <Icon className={`w-8 h-8 ${color} mb-3 group-hover:scale-110 transition-transform`} />
            <h3 className="font-semibold text-sm">{label}</h3>
          </Link>
        ))}
      </div>
    </div>
  )
}
