import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { TrendingUp, Plus, Flame, Moon, Droplets, Footprints } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format } from 'date-fns'

export default function ProgressPage() {
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({ date: today, weight_kg: '', steps: '', workout_completed: false, mood: '', sleep_hours: '', water_litres: '', notes: '' })
  const up = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const { data: summary } = useQuery({ queryKey: ['progress-summary'], queryFn: api.progress.summary })
  const { data: logs } = useQuery({ queryKey: ['progress-logs'], queryFn: () => api.progress.logs(30) })

  const logMutation = useMutation({
    mutationFn: () => api.progress.log({
      ...form,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      steps: form.steps ? parseInt(form.steps) : null,
      mood: form.mood ? parseInt(form.mood) : null,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      water_litres: form.water_litres ? parseFloat(form.water_litres) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress-summary'] })
      qc.invalidateQueries({ queryKey: ['progress-logs'] })
      toast.success('Progress logged! 📊')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const weightData = (logs || []).filter((l: any) => l.weight_kg).map((l: any) => ({ date: l.date, weight: l.weight_kg })).reverse()
  const moodData = (logs || []).filter((l: any) => l.mood).map((l: any) => ({ date: l.date.slice(5), mood: l.mood })).reverse()

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><TrendingUp className="w-8 h-8 text-primary-400" />Progress</h1>
        <p className="text-surface-400 mt-1">Track your daily stats and view trends</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Flame, color: 'text-orange-400', label: 'Current Streak', value: `${summary.current_streak}d` },
            { icon: TrendingUp, color: 'text-primary-400', label: 'Adherence', value: `${summary.adherence_pct}%` },
            { icon: Moon, color: 'text-blue-400', label: 'Avg Sleep', value: summary.avg_sleep ? `${summary.avg_sleep}h` : '—' },
            { icon: Droplets, color: 'text-cyan-400', label: 'Workouts Done', value: summary.total_workouts },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${color}`} /><span className="text-xs text-surface-400 uppercase tracking-wider">{label}</span></div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Log form */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2"><Plus className="w-5 h-5 text-primary-400" />Log Today</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><label className="label-text">Date</label><input type="date" className="input-field" value={form.date} onChange={e => up('date', e.target.value)} /></div>
          <div><label className="label-text">Weight (kg)</label><input type="number" step="0.1" className="input-field" value={form.weight_kg} onChange={e => up('weight_kg', e.target.value)} placeholder="70.0" /></div>
          <div><label className="label-text">Steps</label><input type="number" className="input-field" value={form.steps} onChange={e => up('steps', e.target.value)} placeholder="8000" /></div>
          <div><label className="label-text">Sleep (hrs)</label><input type="number" step="0.5" className="input-field" value={form.sleep_hours} onChange={e => up('sleep_hours', e.target.value)} placeholder="7.5" /></div>
          <div><label className="label-text">Water (L)</label><input type="number" step="0.1" className="input-field" value={form.water_litres} onChange={e => up('water_litres', e.target.value)} placeholder="2.5" /></div>
          <div><label className="label-text">Mood (1-5)</label><input type="number" min="1" max="5" className="input-field" value={form.mood} onChange={e => up('mood', e.target.value)} placeholder="4" /></div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <input type="checkbox" id="workout-done" checked={form.workout_completed} onChange={e => up('workout_completed', e.target.checked)} className="w-4 h-4 accent-primary-500 rounded" />
          <label htmlFor="workout-done" className="text-sm text-surface-300">Workout completed today</label>
        </div>
        <div className="mt-4"><label className="label-text">Notes</label><input className="input-field" value={form.notes} onChange={e => up('notes', e.target.value)} placeholder="Optional notes…" /></div>
        <button onClick={() => logMutation.mutate()} disabled={logMutation.isPending} className="btn-primary mt-5 flex items-center gap-2">
          {logMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}Log Progress
        </button>
      </div>

      {/* Charts */}
      {weightData.length > 1 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Weight Trend (kg)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData}><CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} /><YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#141f36', border: '1px solid #2c3e5a', borderRadius: '10px' }} />
              <Line type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {moodData.length > 1 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Mood Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={moodData}><CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} /><YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#141f36', border: '1px solid #2c3e5a', borderRadius: '10px' }} />
              <Bar dataKey="mood" fill="#ec4899" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
