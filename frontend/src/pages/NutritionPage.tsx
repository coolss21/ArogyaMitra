import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { UtensilsCrossed, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

export default function NutritionPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<number | null>(0)
  const { data: plan } = useQuery({ queryKey: ['nutrition-latest'], queryFn: api.plans.getNutrition, retry: false })

  const gen = useMutation({
    mutationFn: () => api.plans.generateNutrition({}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-latest'] }); toast.success('Meal plan generated! 🍽️') },
    onError: (e: any) => toast.error(e.message),
  })

  const days = plan?.plan_data?.days || []

  function MealCard({ label, meal }: { label: string; meal: any }) {
    if (!meal) return null
    const m = Array.isArray(meal) ? meal[0] : meal
    return (
      <div className="bg-surface-700/40 rounded-lg p-3">
        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="font-medium text-sm">{m.name}</p>
        <div className="flex gap-3 mt-1 text-xs">
          <span className="text-primary-400">{m.calories} kcal</span>
          <span className="text-blue-400">P:{m.protein_g}g</span>
          <span className="text-amber-400">C:{m.carbs_g}g</span>
          <span className="text-accent-400">F:{m.fat_g}g</span>
        </div>
        {m.instructions && <p className="text-xs text-surface-400 mt-1 line-clamp-2">{m.instructions}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><UtensilsCrossed className="w-8 h-8 text-accent-400" />Nutrition Plan</h1>
          <p className="text-surface-400 mt-1">7-day meal plan with macros & recipes</p>
        </div>
        <button onClick={() => gen.mutate()} disabled={gen.isPending} className="btn-accent flex items-center gap-2 text-sm">
          {gen.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {gen.isPending ? 'Generating…' : 'Generate Plan'}
        </button>
      </div>

      {plan?.plan_data && (
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-accent-400">{plan.plan_data.plan_name}</h2>
          <p className="text-sm text-surface-300 mt-1">{plan.plan_data.summary}</p>
          {plan.plan_data.disclaimer && <p className="text-xs text-amber-400/80 mt-2 italic">⚠️ {plan.plan_data.disclaimer}</p>}
          <p className="text-xs text-surface-400 mt-1">Target: {plan.plan_data.daily_calorie_target} kcal/day</p>
        </div>
      )}

      {days.length > 0 ? (
        <div className="space-y-3">
          {days.map((day: any, i: number) => (
            <div key={i} className="glass-card overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-700/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center font-bold text-sm text-accent-400">D{day.day}</div>
                  <div>
                    <h3 className="font-semibold">{day.day_name}</h3>
                    {day.daily_totals && <span className="text-xs text-surface-400">{day.daily_totals.calories} kcal total</span>}
                  </div>
                </div>
                {expanded === i ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
              </button>

              {expanded === i && day.meals && (
                <div className="px-5 pb-5 space-y-3 animate-slide-up">
                  <MealCard label="Breakfast" meal={day.meals.breakfast} />
                  <MealCard label="Lunch" meal={day.meals.lunch} />
                  <MealCard label="Dinner" meal={day.meals.dinner} />
                  {day.meals.snacks && <MealCard label="Snacks" meal={day.meals.snacks} />}
                  {day.daily_totals && (
                    <div className="bg-accent-500/5 border border-accent-500/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-accent-400">📊 Daily: {day.daily_totals.calories} kcal · P:{day.daily_totals.protein_g}g · C:{day.daily_totals.carbs_g}g · F:{day.daily_totals.fat_g}g</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <UtensilsCrossed className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Nutrition Plan Yet</h3>
          <p className="text-surface-400 mb-4">Click "Generate Plan" or ask AROMI to create one</p>
        </div>
      )}
    </div>
  )
}
