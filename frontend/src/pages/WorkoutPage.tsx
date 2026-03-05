import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Dumbbell, Sparkles, ExternalLink, ChevronDown, ChevronUp, Clock } from 'lucide-react'

export default function WorkoutPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<number | null>(0)
  const { data: plan } = useQuery({ queryKey: ['workout-latest'], queryFn: api.plans.getWorkout, retry: false })
  const { data: history, refetch: refetchHistory } = useQuery({ queryKey: ['workout-history'], queryFn: api.plans.workoutHistory, enabled: false })

  const gen = useMutation({
    mutationFn: () => api.plans.generateWorkout({}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workout-latest'] }); toast.success('Workout plan generated! 💪') },
    onError: (e: any) => toast.error(e.message),
  })

  const days = plan?.plan_data?.days || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Dumbbell className="w-8 h-8 text-primary-400" />Workout Plan</h1>
          <p className="text-surface-400 mt-1">Your personalized 7-day training program</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => gen.mutate()} disabled={gen.isPending} className="btn-primary flex items-center gap-2 text-sm">
            {gen.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {gen.isPending ? 'Generating…' : 'Generate Plan'}
          </button>
          <button onClick={() => refetchHistory()} className="btn-secondary text-sm">History</button>
        </div>
      </div>

      {plan?.plan_data && (
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-primary-400">{plan.plan_data.plan_name}</h2>
          <p className="text-sm text-surface-300 mt-1">{plan.plan_data.summary}</p>
          {plan.plan_data.disclaimer && <p className="text-xs text-amber-400/80 mt-2 italic">⚠️ {plan.plan_data.disclaimer}</p>}
        </div>
      )}

      {days.length > 0 ? (
        <div className="space-y-3">
          {days.map((day: any, i: number) => (
            <div key={i} className="glass-card overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-700/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${day.type === 'rest' ? 'bg-blue-500/10 text-blue-400' : 'bg-primary-500/10 text-primary-400'}`}>D{day.day}</div>
                  <div>
                    <h3 className="font-semibold">{day.day_name}</h3>
                    <span className={day.type === 'rest' ? 'badge-blue' : day.type === 'active_recovery' ? 'badge-amber' : 'badge-green'}>{day.type}</span>
                  </div>
                </div>
                {expanded === i ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
              </button>

              {expanded === i && (
                <div className="px-5 pb-5 space-y-4 animate-slide-up">
                  {day.warmup?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Warmup</h4>
                      {day.warmup.map((w: any, j: number) => <div key={j} className="flex items-center gap-2 text-sm py-1"><Clock className="w-3 h-3 text-surface-500" /><span>{w.exercise}</span><span className="text-surface-400">— {w.duration_mins}min</span></div>)}
                    </div>
                  )}
                  {day.main_workout?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Exercises</h4>
                      <div className="space-y-2">
                        {day.main_workout.map((ex: any, j: number) => (
                          <div key={j} className="bg-surface-700/40 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-primary-500/20 rounded text-primary-400 text-xs font-bold flex items-center justify-center">{j+1}</span>
                              <div>
                                <p className="font-medium text-sm">{ex.exercise}</p>
                                <p className="text-xs text-surface-400">{ex.sets} × {ex.reps} · {ex.rest_seconds}s rest</p>
                              </div>
                            </div>
                            {ex.youtube_url && <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300"><ExternalLink className="w-4 h-4" /></a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {day.progressive_overload && <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-3"><p className="text-xs font-medium text-primary-400">📈 {day.progressive_overload}</p></div>}
                  {day.daily_tip && <p className="text-xs text-surface-400 italic">💡 {day.daily_tip}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <Dumbbell className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Workout Plan Yet</h3>
          <p className="text-surface-400 mb-4">Click "Generate Plan" or ask AROMI to create one for you</p>
        </div>
      )}

      {history && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Plan History</h3>
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between py-2 px-3 bg-surface-700/40 rounded-lg text-sm">
                <span>Version {h.version}</span>
                <span className="text-surface-400">{new Date(h.created_at).toLocaleDateString()}</span>
                <span className={h.is_active ? 'badge-green' : 'badge-amber'}>{h.is_active ? 'Active' : 'Past'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
