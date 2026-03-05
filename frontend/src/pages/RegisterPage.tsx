import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, setToken } from '../lib/api'
import toast from 'react-hot-toast'
import { Heart, Mail, Lock, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await api.auth.register(email, password)
      setToken(res.access_token)
      toast.success('Account created! Set up your profile 🚀')
      navigate('/onboarding')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-500/8 rounded-full blur-3xl" />
      </div>
      <div className="glass-card p-8 w-full max-w-md animate-fade-in relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-accent-400 to-primary-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-accent-500/25">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-400 to-primary-400 bg-clip-text text-transparent">Join ArogyaMitra</h1>
          <p className="text-surface-400 text-sm mt-1">Start your AI-powered wellness journey</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-text">Email</label>
            <div className="relative"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-surface-500" />
              <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field pl-10" placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <label className="label-text">Password</label>
            <div className="relative"><Lock className="absolute left-3 top-3.5 w-4 h-4 text-surface-500" />
              <input id="reg-pw" type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field pl-10" placeholder="Min 8 chars" required minLength={8} />
            </div>
          </div>
          <div>
            <label className="label-text">Confirm Password</label>
            <div className="relative"><Lock className="absolute left-3 top-3.5 w-4 h-4 text-surface-500" />
              <input id="reg-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field pl-10" placeholder="••••••••" required minLength={8} />
            </div>
          </div>
          <button id="reg-submit" type="submit" disabled={loading} className="btn-accent w-full flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Create Account</span><UserPlus className="w-4 h-4" /></>}
          </button>
        </form>
        <p className="text-center text-sm text-surface-400 mt-6">
          Have an account? <Link to="/login" className="text-accent-400 hover:text-accent-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
