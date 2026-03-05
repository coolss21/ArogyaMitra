import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Dumbbell, Sparkles, ExternalLink, ChevronDown, ChevronUp, Clock, Download, Target, RefreshCw, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { WorkoutPdfDocument } from '../components/WorkoutPdfDocument'
import MuscleHeatmap from '../components/MuscleHeatmap'

export default function WorkoutPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<number | null>(0)
  const [isClient, setIsClient] = useState(false)
  const [swappedExercises, setSwappedExercises] = useState<Record<string, any>>({})
  const [showAlternates, setShowAlternates] = useState<Record<string, boolean>>({})

  const { data: plan } = useQuery({ queryKey: ['workout-latest'], queryFn: api.plans.getWorkout, retry: false })

  useEffect(() => {
    setIsClient(true)
  }, [])
  const { data: history, refetch: refetchHistory } = useQuery({ queryKey: ['workout-history'], queryFn: api.plans.workoutHistory, enabled: false })

  const gen = useMutation({
    mutationFn: () => api.plans.generateWorkout({}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workout-latest'] }); toast.success('Workout plan generated! 💪') },
    onError: (e: any) => toast.error(e.message),
  })

  const days = plan?.plan_data?.days || []

  const filename = `ArogyaMitra_Workout_${new Date().toISOString().split('T')[0]}.pdf`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Dumbbell className="w-8 h-8 text-primary-400" />Workout Plan</h1>
          <p className="text-surface-400 mt-1">Your personalized 7-day training program</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isClient && plan?.plan_data && (
            <PDFDownloadLink 
              document={<WorkoutPdfDocument planData={plan.plan_data} />} 
              fileName={filename} 
              className="btn-secondary text-sm flex items-center gap-2 border-primary-500/30 text-primary-400 hover:bg-primary-500/10"
            >
              {({ loading, error }) => {
                if (error) console.error("PDF Link Error:", error);
                return (
                  <>
                    {loading ? <div className="w-4 h-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                    {loading ? 'Preparing PDF...' : 'Download PDF'}
                  </>
                );
              }}
            </PDFDownloadLink>
          )}
          <button onClick={() => gen.mutate()} disabled={gen.isPending} className="btn-primary flex items-center gap-2 text-sm">
            {gen.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {gen.isPending ? 'Generating…' : 'Generate Plan'}
          </button>
          {plan?.plan_data && (
            <Link to="/workout/timer" className="btn-secondary flex items-center gap-2 text-sm border-green-500/30 text-green-400 hover:bg-green-500/10">
              <Play className="w-4 h-4" /> Start Workout
            </Link>
          )}
          <button onClick={() => refetchHistory()} className="btn-secondary text-sm">History</button>
        </div>
      </div>

      <div id="printable-workout" className="space-y-6">
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
                <button onClick={() => setExpanded((expanded === i || expanded === -1) ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-700/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${day.type === 'rest' ? 'bg-blue-500/10 text-blue-400' : 'bg-primary-500/10 text-primary-400'}`}>D{day.day}</div>
                    <div>
                      <h3 className="font-semibold">{day.day_name}</h3>
                      <span className={day.type === 'rest' ? 'badge-blue' : day.type === 'active_recovery' ? 'badge-amber' : 'badge-green'}>{day.type}</span>
                    </div>
                  </div>
                  {(expanded === i || expanded === -1) ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
                </button>

                {(expanded === i || expanded === -1) && (
                  <div className="px-5 pb-5 space-y-4 animate-slide-up">
                    {day.warmup?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Warmup</h4>
                        {day.warmup.map((w: any, j: number) => <div key={j} className="flex items-center gap-2 text-sm py-1"><Clock className="w-3 h-3 text-surface-500" /><span>{w.exercise}</span><span className="text-surface-400">— {w.duration_mins}min</span></div>)}
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Exercises</h4>
                      {day.main_workout?.map((baseEx: any, j: number) => {
                        const exKey = `${i}-${j}`
                        const ex = swappedExercises[exKey] || baseEx
                        const isShowingAlts = showAlternates[exKey]
                        
                        return (
                          <div key={j} className="bg-surface-800/60 border border-surface-700/50 rounded-xl p-4 transition-all hover:border-primary-500/30">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-primary-500/10 rounded-lg text-primary-400 text-sm font-bold flex items-center justify-center border border-primary-500/20">{j+1}</span>
                                <div>
                                  <p className="font-bold text-white text-base">{ex.exercise}</p>
                                  <p className="text-xs text-surface-400">{ex.sets} sets × {ex.reps} · {ex.rest_seconds}s rest</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {ex.youtube_url && (
                                  <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Watch Demo">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                                {baseEx.alternatives && baseEx.alternatives.length > 0 && (
                                  <button 
                                    onClick={() => setShowAlternates(prev => ({ ...prev, [exKey]: !isShowingAlts }))}
                                    className={`p-2 rounded-lg transition-colors ${isShowingAlts ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-700 text-surface-400 hover:bg-surface-600'}`}
                                    title="Show Alternatives"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {ex.target_muscles && ex.target_muscles.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {ex.target_muscles.map((m: string, k: number) => (
                                  <span key={k} className="flex items-center gap-1 text-[10px] font-bold bg-surface-700/80 text-surface-300 px-2 py-0.5 rounded-md border border-surface-600/50">
                                    <Target className="w-2.5 h-2.5" /> {m.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            )}

                            {ex.notes && <p className="text-xs text-surface-400 mt-2 bg-surface-900/40 p-2 rounded-lg border-l-2 border-primary-500/50">{ex.notes}</p>}

                            {/* Alternatives Panel */}
                            {isShowingAlts && baseEx.alternatives && (
                              <div className="mt-4 pt-4 border-t border-surface-700/50 animate-slide-down">
                                <p className="text-[10px] font-bold text-surface-500 mb-2 uppercase tracking-widest">Available Alternatives</p>
                                <div className="space-y-2">
                                  {[baseEx, ...baseEx.alternatives].filter(alt => alt.exercise !== ex.exercise).map((alt: any, k: number) => (
                                    <button
                                      key={k}
                                      onClick={() => {
                                        setSwappedExercises(prev => ({ ...prev, [exKey]: alt }));
                                        setShowAlternates(prev => ({ ...prev, [exKey]: false }));
                                        toast.success(`Swapped to ${alt.exercise}`);
                                      }}
                                      className="w-full text-left p-3 bg-surface-900/40 hover:bg-primary-500/5 border border-surface-700 rounded-lg group transition-all"
                                    >
                                      <p className="text-sm font-semibold text-surface-200 group-hover:text-primary-400">{alt.exercise}</p>
                                      <p className="text-[10px] text-surface-500 mt-0.5">{alt.notes || 'Alternative movement'}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {day.progressive_overload && (
                      <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-4">
                        <p className="text-sm font-medium text-primary-400 flex items-center gap-2">
                          Progressive Overload: {day.progressive_overload}
                        </p>
                      </div>
                    )}
                    {day.daily_tip && (
                      <div className="text-sm text-surface-400 italic bg-surface-800/30 p-3 rounded-xl border border-surface-700/50 flex items-center gap-2">
                        Daily Tip: {day.daily_tip}
                      </div>
                    )}
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
      </div>

      {/* Muscle Heatmap */}
      {days.length > 0 && <MuscleHeatmap days={days} />}

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
