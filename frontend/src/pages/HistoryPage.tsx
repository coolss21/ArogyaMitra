import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Clock, Dumbbell, UtensilsCrossed, ChevronDown, ChevronUp, Calendar, Cpu, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

type Tab = 'workout' | 'nutrition'

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('workout')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: workoutHistory, isLoading: wLoading } = useQuery({
    queryKey: ['workout-history'],
    queryFn: api.plans.workoutHistory,
  })

  const { data: nutritionHistory, isLoading: nLoading } = useQuery({
    queryKey: ['nutrition-history'],
    queryFn: api.plans.nutritionHistory,
  })

  const plans = tab === 'workout' ? workoutHistory : nutritionHistory
  const loading = tab === 'workout' ? wLoading : nLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary-400" />Plan History
        </h1>
        <p className="text-surface-400 mt-1">Browse and review your past workout & nutrition plans</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-surface-800/60 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setTab('workout')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'workout'
              ? 'bg-primary-500/20 text-primary-400 shadow-lg shadow-primary-500/10'
              : 'text-surface-400 hover:text-surface-200'
          }`}
        >
          <Dumbbell className="w-4 h-4" /> Workout Plans
        </button>
        <button
          onClick={() => setTab('nutrition')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'nutrition'
              ? 'bg-accent-500/20 text-accent-400 shadow-lg shadow-accent-500/10'
              : 'text-surface-400 hover:text-surface-200'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" /> Nutrition Plans
        </button>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : plans?.length > 0 ? (
        <div className="space-y-3">
          {plans.map((plan: any) => {
            const isOpen = expanded === plan.id
            const planData = plan.plan_data || {}
            const planName = planData.plan_name || planData.name || (tab === 'workout' ? 'Workout Plan' : 'Nutrition Plan')
            const dateStr = plan.created_at ? format(new Date(plan.created_at), 'MMM dd, yyyy · h:mm a') : 'Unknown date'

            return (
              <div key={plan.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : plan.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-700/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      tab === 'workout' ? 'bg-primary-500/10' : 'bg-accent-500/10'
                    }`}>
                      {tab === 'workout'
                        ? <Dumbbell className="w-5 h-5 text-primary-400" />
                        : <UtensilsCrossed className="w-5 h-5 text-accent-400" />
                      }
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{planName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-surface-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {dateStr}
                        </span>
                        {plan.model_used && (
                          <span className="text-xs text-surface-500 flex items-center gap-1">
                            <Cpu className="w-3 h-3" /> {plan.model_used}
                          </span>
                        )}
                        {plan.is_active && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
                </button>

                {isOpen && planData && (
                  <div className="px-5 pb-5 border-t border-surface-700/30 animate-slide-up">
                    {planData.summary && (
                      <p className="text-sm text-surface-300 mt-4 mb-4 bg-surface-800/40 p-3 rounded-lg italic">
                        {planData.summary}
                      </p>
                    )}

                    {/* Workout plan details */}
                    {tab === 'workout' && planData.days && (
                      <div className="space-y-3">
                        {planData.days.map((day: any, i: number) => (
                          <div key={i} className="bg-surface-800/30 rounded-xl p-4 border border-surface-700/30">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-400 text-xs font-bold">
                                D{day.day}
                              </span>
                              <span className="font-medium text-sm">{day.day_name}</span>
                              <span className="text-[10px] uppercase bg-surface-700/60 text-surface-400 px-2 py-0.5 rounded-full">{day.type}</span>
                            </div>
                            {day.main_workout?.map((ex: any, j: number) => (
                              <div key={j} className="flex items-center gap-2 py-1.5 text-sm">
                                <span className="text-surface-500 w-5 text-right text-xs">{j + 1}.</span>
                                <span className="text-surface-200">{ex.exercise}</span>
                                <span className="text-surface-500 text-xs ml-auto">{ex.sets}×{ex.reps}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nutrition plan details */}
                    {tab === 'nutrition' && planData.days && (
                      <div className="space-y-3">
                        {planData.days.map((day: any, i: number) => (
                          <div key={i} className="bg-surface-800/30 rounded-xl p-4 border border-surface-700/30">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-accent-500/10 rounded-lg flex items-center justify-center text-accent-400 text-xs font-bold">
                                  D{day.day}
                                </span>
                                <span className="font-medium text-sm">{day.day_name}</span>
                              </div>
                              {day.daily_totals && (
                                <span className="text-xs text-accent-400">{day.daily_totals.calories} kcal</span>
                              )}
                            </div>
                            {day.meals && (
                              <div className="space-y-1.5">
                                {['breakfast', 'lunch', 'dinner', 'snacks'].map(type => {
                                  const meal = day.meals[type]
                                  if (!meal) return null
                                  const m = Array.isArray(meal) ? meal[0] : meal
                                  return (
                                    <div key={type} className="flex items-center justify-between py-1.5 text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase text-surface-500 w-16">{type}</span>
                                        <span className="text-surface-200">{m.name}</span>
                                      </div>
                                      <span className="text-xs text-surface-500">{m.calories} kcal</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {plan.latency_ms && (
                      <p className="text-[10px] text-surface-600 mt-4 text-right">Generated in {plan.latency_ms}ms</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <Clock className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Plans Yet</h3>
          <p className="text-surface-400 mb-4">
            {tab === 'workout'
              ? 'Generate your first workout plan to see history here.'
              : 'Generate your first nutrition plan to see history here.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
