import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { ArrowRight, ArrowLeft, Check, User, Activity, Target, Utensils } from 'lucide-react'

const STEPS = ['Basic Info', 'Fitness Profile', 'Goals', 'Diet']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', age: '', gender: '', height_cm: '', weight_kg: '',
    fitness_level: 'beginner', goal: 'general_wellness',
    injuries: '', location: 'home', equipment: '',
    minutes_per_day: '30', days_per_week: '5',
    diet_type: 'veg', allergies: '', cuisine_preference: 'Indian', calorie_target: '2000',
  })
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function finish() {
    setLoading(true)
    try {
      await api.profile.update({
        ...form,
        age: form.age ? parseInt(form.age) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        minutes_per_day: parseInt(form.minutes_per_day),
        days_per_week: parseInt(form.days_per_week),
        calorie_target: parseInt(form.calorie_target),
        onboarding_complete: true,
      })
      toast.success('Profile set up! Ready to train 💪')
      navigate('/')
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const icons = [User, Activity, Target, Utensils]

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-2">Welcome to ArogyaMitra!</h1>
      <p className="text-surface-400 mb-8">Set up your profile in 4 quick steps.</p>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = icons[i]
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/25' : 'bg-surface-700 text-surface-400'}`}>
                {i < step ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= step ? 'text-primary-400' : 'text-surface-500'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary-500' : 'bg-surface-700'}`} />}
            </div>
          )
        })}
      </div>

      <div className="glass-card p-8">
        {step === 0 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Tell us about yourself</h2>
            <div><label className="label-text">Name</label><input className="input-field" value={form.name} onChange={e => up('name', e.target.value)} placeholder="Your name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-text">Age</label><input type="number" className="input-field" value={form.age} onChange={e => up('age', e.target.value)} placeholder="25" /></div>
              <div><label className="label-text">Gender</label>
                <select className="input-field" value={form.gender} onChange={e => up('gender', e.target.value)}>
                  <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-text">Height (cm)</label><input type="number" className="input-field" value={form.height_cm} onChange={e => up('height_cm', e.target.value)} placeholder="175" /></div>
              <div><label className="label-text">Weight (kg)</label><input type="number" className="input-field" value={form.weight_kg} onChange={e => up('weight_kg', e.target.value)} placeholder="70" /></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Fitness profile</h2>
            <div><label className="label-text">Fitness Level</label>
              <div className="grid grid-cols-3 gap-3">
                {['beginner','intermediate','advanced'].map(l => (
                  <button key={l} onClick={() => up('fitness_level', l)} className={`py-3 rounded-xl font-medium text-sm capitalize transition-all ${form.fitness_level === l ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'bg-surface-700/50 text-surface-300 border border-surface-600/50 hover:border-surface-500'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div><label className="label-text">Location</label>
              <div className="grid grid-cols-2 gap-3">
                {[{v:'home',l:'🏠 Home'},{v:'gym',l:'🏋️ Gym'}].map(({ v, l }) => (
                  <button key={v} onClick={() => up('location', v)} className={`py-3 rounded-xl font-medium text-sm transition-all ${form.location === v ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'bg-surface-700/50 text-surface-300 border border-surface-600/50 hover:border-surface-500'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div><label className="label-text">Equipment (comma-separated)</label><input className="input-field" value={form.equipment} onChange={e => up('equipment', e.target.value)} placeholder="dumbbells, resistance bands" /></div>
            <div><label className="label-text">Injuries / Constraints</label><input className="input-field" value={form.injuries} onChange={e => up('injuries', e.target.value)} placeholder="lower back pain (optional)" /></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Goals & schedule</h2>
            <div><label className="label-text">Primary Goal</label>
              <div className="grid grid-cols-2 gap-3">
                {[{v:'weight_loss',l:'🔥 Weight Loss'},{v:'muscle_gain',l:'💪 Muscle Gain'},{v:'endurance',l:'🏃 Endurance'},{v:'general_wellness',l:'🧘 Wellness'}].map(g => (
                  <button key={g.v} onClick={() => up('goal', g.v)} className={`py-3 rounded-xl font-medium text-sm transition-all ${form.goal === g.v ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50' : 'bg-surface-700/50 text-surface-300 border border-surface-600/50 hover:border-surface-500'}`}>{g.l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-text">Minutes/Day</label><input type="number" className="input-field" value={form.minutes_per_day} onChange={e => up('minutes_per_day', e.target.value)} /></div>
              <div><label className="label-text">Days/Week</label><input type="number" min="1" max="7" className="input-field" value={form.days_per_week} onChange={e => up('days_per_week', e.target.value)} /></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Diet & cuisine</h2>
            <div><label className="label-text">Diet Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[{v:'veg',l:'🥗 Vegetarian'},{v:'non-veg',l:'🍗 Non-Veg'},{v:'vegan',l:'🌱 Vegan'}].map(d => (
                  <button key={d.v} onClick={() => up('diet_type', d.v)} className={`py-3 rounded-xl font-medium text-sm transition-all ${form.diet_type === d.v ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50' : 'bg-surface-700/50 text-surface-300 border border-surface-600/50 hover:border-surface-500'}`}>{d.l}</button>
                ))}
              </div>
            </div>
            <div><label className="label-text">Allergies</label><input className="input-field" value={form.allergies} onChange={e => up('allergies', e.target.value)} placeholder="peanut, lactose (comma-separated)" /></div>
            <div><label className="label-text">Cuisine</label><input className="input-field" value={form.cuisine_preference} onChange={e => up('cuisine_preference', e.target.value)} placeholder="Indian" /></div>
            <div><label className="label-text">Calorie Target (kcal)</label><input type="number" className="input-field" value={form.calorie_target} onChange={e => up('calorie_target', e.target.value)} /></div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-30">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
          ) : (
            <button onClick={finish} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Finish</span><Check className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
