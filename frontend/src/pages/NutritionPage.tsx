import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { UtensilsCrossed, Sparkles, ChevronDown, ChevronUp, Download, Zap, RefreshCw, X } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { NutritionPdfDocument } from '../components/NutritionPdfDocument'

export default function NutritionPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<number | null>(0)
  const [isClient, setIsClient] = useState(false)
  const [swappedMeals, setSwappedMeals] = useState<Record<string, any>>({})
  const [showSwapModal, setShowSwapModal] = useState<{ dayIdx: number, mealType: string, options: any[] } | null>(null)
  
  const { data: plan } = useQuery({ queryKey: ['nutrition-latest'], queryFn: api.plans.getNutrition, retry: false })

  useEffect(() => {
    setIsClient(true)
  }, [])

  const filename = `ArogyaMitra_Nutrition_${new Date().toISOString().split('T')[0]}.pdf`

  const gen = useMutation({
    mutationFn: () => api.plans.generateNutrition({}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-latest'] }); toast.success('Meal plan generated! 🍽️') },
    onError: (e: any) => toast.error(e.message),
  })

  const days = plan?.plan_data?.days || []

  function MealCard({ label, meal, dayIdx, mealType }: { label: string; meal: any; dayIdx: number; mealType: string }) {
    if (!meal) return null
    const baseMeal = Array.isArray(meal) ? meal[0] : meal
    const key = `${dayIdx}-${mealType}`
    const m = swappedMeals[key] || baseMeal

    const proteinRatio = m.protein_per_100kcal || (m.calories > 0 ? (m.protein_g * 100) / m.calories : 0)
    const isHighProtein = proteinRatio > 8

    return (
      <div className="bg-surface-700/40 rounded-xl p-4 border border-surface-600/30 hover:border-accent-500/30 transition-all group">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">{label}</p>
            <p className="font-semibold text-base text-white">{m.name}</p>
          </div>
          {isHighProtein && (
            <div className="flex items-center gap-1 bg-accent-500/10 text-accent-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-accent-500/20">
              <Zap className="w-3 h-3" /> PROTEIN POWER
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-surface-800/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-surface-400 uppercase tracking-tighter">Calories</p>
            <p className="text-sm font-bold text-primary-400">{m.calories}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-surface-400 uppercase tracking-tighter">Protein</p>
            <p className="text-sm font-bold text-blue-400">{m.protein_g}g</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-surface-400 uppercase tracking-tighter">Carbs</p>
            <p className="text-sm font-bold text-amber-400">{m.carbs_g}g</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-surface-400 uppercase tracking-tighter">Fats</p>
            <p className="text-sm font-bold text-accent-400">{m.fat_g}g</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="h-1 w-full bg-surface-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, proteinRatio * 10)}%` }} 
              />
            </div>
            <p className="text-[9px] text-surface-500 mt-1 uppercase font-medium tracking-tighter">
              Efficiency: {proteinRatio.toFixed(1)}g protein / 100kcal
            </p>
          </div>
          {baseMeal.alternatives && baseMeal.alternatives.length > 0 && (
            <button 
              onClick={() => setShowSwapModal({ dayIdx, mealType, options: [baseMeal, ...baseMeal.alternatives] })}
              className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-accent-400 rounded-lg transition-colors group-hover:scale-110"
              title="Swap Meal"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {m.instructions && (
          <p className="text-xs text-surface-400 mt-3 border-t border-surface-600/20 pt-2 italic line-clamp-2">
            "{m.instructions}"
          </p>
        )}
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
        <div className="flex gap-3 flex-wrap">
          {isClient && plan?.plan_data && (
            <PDFDownloadLink 
              document={<NutritionPdfDocument planData={plan.plan_data} />} 
              fileName={filename} 
              className="btn-secondary text-sm flex items-center gap-2 border-accent-500/30 text-accent-400 hover:bg-accent-500/10"
            >
              {({ loading, error }) => {
                if (error) console.error("PDF Link Error:", error);
                return (
                  <>
                    {loading ? <div className="w-4 h-4 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                    {loading ? 'Preparing PDF...' : 'Download PDF'}
                  </>
                );
              }}
            </PDFDownloadLink>
          )}
          <button onClick={() => gen.mutate()} disabled={gen.isPending} className="btn-accent flex items-center gap-2 text-sm">
            {gen.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {gen.isPending ? 'Generating…' : 'Generate Plan'}
          </button>
        </div>
      </div>

      <div id="printable-nutrition" className="space-y-6">
      {plan?.plan_data && (
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-accent-400">{plan.plan_data.plan_name}</h2>
          <p className="text-sm text-surface-300 mt-1">{plan.plan_data.summary}</p>
          {plan.plan_data.disclaimer && <p className="text-xs text-amber-400/80 mt-2 italic">{plan.plan_data.disclaimer}</p>}
          <p className="text-xs text-surface-400 mt-1">Target: {plan.plan_data.daily_calorie_target} kcal/day</p>
        </div>
      )}

      {days.length > 0 ? (
        <div className="space-y-3">
          {days.map((day: any, i: number) => (
            <div key={i} className="glass-card overflow-hidden">
              <button onClick={() => setExpanded((expanded === i || expanded === -1) ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-700/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center font-bold text-sm text-accent-400">D{day.day}</div>
                  <div>
                    <h3 className="font-semibold">{day.day_name}</h3>
                    {day.daily_totals && <span className="text-xs text-surface-400">{day.daily_totals.calories} kcal total</span>}
                  </div>
                </div>
                {(expanded === i || expanded === -1) ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
              </button>

              {(expanded === i || expanded === -1) && day.meals && (
                <div className="px-5 pb-5 space-y-4 animate-slide-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MealCard label="Breakfast" meal={day.meals.breakfast} dayIdx={i} mealType="breakfast" />
                    <MealCard label="Lunch" meal={day.meals.lunch} dayIdx={i} mealType="lunch" />
                    <MealCard label="Dinner" meal={day.meals.dinner} dayIdx={i} mealType="dinner" />
                    {day.meals.snacks && (
                      Array.isArray(day.meals.snacks) ? (
                        day.meals.snacks.map((s: any, j: number) => (
                           <MealCard key={j} label={`Snack ${j+1}`} meal={s} dayIdx={i} mealType={`snack-${j}`} />
                        ))
                      ) : (
                        <MealCard label="Snacks" meal={day.meals.snacks} dayIdx={i} mealType="snacks" />
                      )
                    )}
                  </div>
                  {day.daily_totals && (
                    <div className="bg-accent-500/5 border border-accent-500/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-accent-400">
                        Daily Total: {day.daily_totals.calories} Calories · Protein: {day.daily_totals.protein_g}g · Carbohydrates: {day.daily_totals.carbs_g}g · Fats: {day.daily_totals.fat_g}g
                      </p>
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

      {/* Alternative Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-accent-400" /> Swap Meal Choice
              </h3>
              <button onClick={() => setShowSwapModal(null)} className="p-1 hover:bg-surface-700 rounded-lg">
                <X className="w-6 h-6 text-surface-400" />
              </button>
            </div>
            
            <div className="space-y-3">
              {showSwapModal.options.map((opt: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    const key = `${showSwapModal!.dayIdx}-${showSwapModal!.mealType}`;
                    setSwappedMeals(prev => ({ ...prev, [key]: opt }));
                    setShowSwapModal(null);
                    toast.success(`Swapped to ${opt.name}!`);
                  }}
                  className="w-full text-left p-4 bg-surface-700/50 hover:bg-accent-500/10 border border-surface-600/40 hover:border-accent-500/50 rounded-xl transition-all group"
                >
                  <p className="font-bold text-white group-hover:text-accent-400 transition-colors">{opt.name}</p>
                  <div className="flex gap-4 mt-2 text-xs text-surface-400">
                    <span>🔥 {opt.calories} Calories</span>
                    <span>💪 {opt.protein_g}g Protein</span>
                  </div>
                </button>
              ))}
            </div>
            
            <p className="text-[10px] text-surface-500 mt-6 text-center italic">
              Swapping will update your view, but won't permanently change the generated plan.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
