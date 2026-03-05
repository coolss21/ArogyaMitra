import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Target, CheckCircle, Zap, PlusCircle, Trophy } from 'lucide-react'
import Confetti from 'react-confetti'
import { useState, useEffect } from 'react'

export default function ChallengesPage() {
  const qc = useQueryClient()
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['challenges-today'],
    queryFn: api.challenges.getToday,
  })

  const acceptMutation = useMutation({
    mutationFn: (title: string) => api.challenges.accept(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges-today'] })
      toast.success('Challenge Accepted!')
    },
    onError: () => toast.error('Failed to accept challenge')
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.challenges.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges-today'] })
      qc.invalidateQueries({ queryKey: ['progress-logs'] })
      qc.invalidateQueries({ queryKey: ['progress-summary'] })
      qc.invalidateQueries({ queryKey: ['gamification-dashboard'] })
      setShowConfetti(true)
      toast.success('+ XP Earned!')
      setTimeout(() => setShowConfetti(false), 4000)
    },
    onError: () => toast.error('Failed to complete challenge')
  })

  const challenges = data?.challenges || []
  const accepted = challenges.filter((c: any) => !c.id.startsWith('suggested_') && !c.id.startsWith('discovery_'))
  const suggested = challenges.filter((c: any) => c.id.startsWith('suggested_'))
  const discovery = challenges.filter((c: any) => c.id.startsWith('discovery_'))
  
  const totalCompleted = accepted.filter((c: any) => c.completed).length

  if (isLoading) return <div className="animate-pulse space-y-4 max-w-2xl mx-auto"><div className="h-32 bg-surface-800 rounded-xl" /></div>

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto relative">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}
      
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-2">
          <Target className="w-10 h-10 text-primary-400" /> Daily Arena
        </h1>
        <p className="text-surface-400">Accept challenges, level up your habits, and maintain your streak.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <p className="text-surface-400 text-xs font-medium uppercase tracking-widest mb-1">Daily Completed</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{totalCompleted}</span>
            <span className="text-surface-500 mb-1">/ {accepted.length}</span>
          </div>
        </div>
        <div className="glass-card p-6 text-right">
          <p className="text-surface-400 text-xs font-medium uppercase tracking-widest mb-1">Today's XP</p>
          <div className="flex items-end justify-end gap-2">
            <span className="text-3xl font-bold text-accent-400">{data?.total_xp_today || 0}</span>
            <span className="text-surface-500 mb-1">XP</span>
          </div>
        </div>
      </div>

      {accepted.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent-400" /> Active Challenges
          </h2>
          <div className="space-y-3">
            {accepted.map((c: any) => (
              <ChallengeCard 
                key={c.id} 
                challenge={c} 
                onComplete={() => completeMutation.mutate(c.id)}
                isPending={completeMutation.isPending}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="glass-card p-8 text-center border-dashed border-surface-700">
          <Trophy className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-surface-200">No active challenges</h2>
          <p className="text-sm text-surface-500 max-w-sm mx-auto mt-2">
            Accept a challenge from the "Suggested for You" section below to start building your streak!
          </p>
        </section>
      )}

      {suggested.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary-400" /> Suggested for You
          </h2>
          <div className="space-y-3">
            {suggested.map((c: any) => (
              <ChallengeItem 
                key={c.id} 
                challenge={c} 
                onAccept={() => acceptMutation.mutate(c.title)}
                isPending={acceptMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {discovery.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-surface-500" /> Explore More
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {discovery.map((c: any) => (
              <div 
                key={c.id} 
                className="glass-card p-4 flex items-center gap-3 border-surface-800 hover:border-surface-600 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-surface-300 text-sm truncate">{c.title}</h3>
                  <p className="text-accent-400 text-[10px] font-bold uppercase">{c.xp} XP</p>
                </div>
                <button 
                  onClick={() => acceptMutation.mutate(c.title)}
                  disabled={acceptMutation.isPending}
                  className="btn-surface py-1 px-3 text-[10px] font-bold uppercase tracking-wider"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ChallengeItem({ challenge, onAccept, isPending }: any) {
  return (
    <div className="glass-card p-4 flex items-center gap-4 border-dashed border-surface-700 hover:border-primary-500/50 transition-colors group">
      <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center text-2xl grayscale group-hover:grayscale-0 transition-all">
        {challenge.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-surface-200">{challenge.title}</h3>
        <p className="text-surface-500 text-sm line-clamp-1">{challenge.desc}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-accent-400 font-bold text-xs bg-accent-500/10 px-2 py-1 rounded">
          {challenge.xp} XP
        </div>
        <button 
          onClick={onAccept}
          disabled={isPending}
          className="btn-surface py-1.5 px-3 text-xs"
        >
          Accept
        </button>
      </div>
    </div>
  )
}

function ChallengeCard({ challenge, onComplete, isPending }: any) {
  return (
    <div 
      className={`glass-card p-5 flex items-center gap-5 transition-all duration-500 ${
        challenge.completed ? 'opacity-60 border-green-500/30' : 'hover:-translate-y-1 hover:border-primary-500/30'
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
        challenge.completed ? 'bg-green-500/10' : 'bg-surface-800'
      }`}>
        {challenge.icon}
      </div>
      
      <div className="flex-1">
        <h3 className={`text-lg font-bold mb-1 ${challenge.completed ? 'text-surface-300 line-through' : 'text-white'}`}>
          {challenge.title}
        </h3>
        <p className="text-surface-400 text-sm">{challenge.desc}</p>
      </div>

      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-accent-400 font-bold text-sm bg-accent-500/10 px-2 py-1 rounded-lg">
          <Zap className="w-3 h-3" /> {challenge.xp} XP
        </div>
        {challenge.completed ? (
          <div className="flex items-center gap-1 text-green-400 font-bold text-sm h-10 px-4">
            <CheckCircle className="w-4 h-4" /> Done
          </div>
        ) : (
          <button 
            onClick={onComplete}
            disabled={isPending}
            className="btn-primary py-2 px-4 shadow-lg shadow-primary-500/20 text-sm"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  )
}
