import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Play, Pause, SkipForward, ChevronRight, Clock, Dumbbell, CheckCircle, Trophy, ArrowLeft, Target, XCircle, Lock, CalendarDays, Smile } from 'lucide-react'
import { format, startOfWeek, addDays, isToday, isBefore, startOfDay } from 'date-fns'
import PlaylistPanel from '../components/PlaylistPanel'

type SessionState = 'idle' | 'exercising' | 'resting' | 'complete'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function WorkoutTimerPage() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const dayParam = parseInt(params.get('day') || '-1')

  const { data: plan } = useQuery({
    queryKey: ['workout-latest'],
    queryFn: api.plans.getWorkout,
    retry: false,
  })

  const { data: progressLogs } = useQuery({
    queryKey: ['progress-logs'],
    queryFn: () => api.progress.logs(7),
  })

  const logMutation = useMutation({
    mutationFn: () => api.progress.log({
      date: format(new Date(), 'yyyy-MM-dd'),
      workout_completed: true,
      notes: `Completed workout: ${currentDay?.day_name || 'Day ' + (selectedDay + 1)}`,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress-summary'] })
      qc.invalidateQueries({ queryKey: ['progress-logs'] })
      toast.success('Workout logged! Great job! 🔥')
    },
  })

  const days = plan?.plan_data?.days || []

  // Calculate which plan day maps to today
  const now = new Date()
  const todayDayOfWeek = now.getDay() // 0=Sun, 1=Mon, ...
  const todayIdx = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1 // Convert to 0=Mon ... 6=Sun
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday

  // Build week schedule: map each day of the week to plan days
  const weekSchedule = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const planDay = days[i] || null
    const dateStr = format(date, 'yyyy-MM-dd')
    const isCompletedDay = (progressLogs || []).some(
      (log: any) => log.date === dateStr && log.workout_completed
    )
    const isMissed = isBefore(startOfDay(date), startOfDay(now)) && !isCompletedDay
    const isTodayDate = isToday(date)
    const isFuture = !isBefore(startOfDay(date), startOfDay(now)) && !isTodayDate

    return {
      idx: i,
      date,
      dateStr,
      dayName: DAY_NAMES[i],
      planDay,
      isCompleted: isCompletedDay,
      isMissed: isMissed && planDay?.type !== 'rest',
      isToday: isTodayDate,
      isFuture,
      isRest: planDay?.type === 'rest' || planDay?.type === 'Rest',
    }
  })

  const autoDay = dayParam >= 0 ? dayParam : todayIdx
  const [selectedDay, setSelectedDay] = useState(Math.min(autoDay, days.length - 1))
  const currentDay = days[selectedDay]
  const exercises = currentDay?.main_workout || []
  const selectedSchedule = weekSchedule[selectedDay]

  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [restTime, setRestTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [completedSets, setCompletedSets] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [mood, setMood] = useState<number | null>(null) // 1-5 scale

  const timerRef = useRef<number | null>(null)
  const restRef = useRef<number | null>(null)

  const currentEx = exercises[currentExIdx]
  
  // Feature: Mood-Based Adaptation
  // If mood <= 2, reduce sets by 1 (minimum 1 set). If >= 4, keep full sets.
  const getAdjustedSets = (ex: any) => {
    const baseSets = parseInt(ex.sets) || 3
    if (mood && mood <= 2) return Math.max(1, baseSets - 1)
    return baseSets
  }

  const maxSets = currentEx ? getAdjustedSets(currentEx) : 3

  const totalSets = exercises.reduce((acc: number, ex: any) => acc + getAdjustedSets(ex), 0)

  // Elapsed time timer
  useEffect(() => {
    if (sessionState !== 'idle' && sessionState !== 'complete' && !isPaused) {
      timerRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [sessionState, isPaused])

  // Rest countdown timer
  useEffect(() => {
    if (sessionState === 'resting' && restTime > 0 && !isPaused) {
      restRef.current = window.setInterval(() => {
        setRestTime(t => {
          if (t <= 1) {
            setSessionState('exercising')
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => { if (restRef.current) clearInterval(restRef.current) }
  }, [sessionState, restTime, isPaused])
  const startSession = () => {
    setSessionState('exercising')
    setElapsed(0)
    setCurrentExIdx(0)
    setCurrentSet(1)
    setCompletedSets(0)
  }

  const completeSet = () => {
    setCompletedSets(c => c + 1)
    if (currentSet >= maxSets) {
      if (currentExIdx >= exercises.length - 1) {
        setSessionState('complete')
        logMutation.mutate()
      } else {
        setCurrentExIdx(i => i + 1)
        setCurrentSet(1)
        setRestTime(exercises[currentExIdx + 1]?.rest_seconds || 60)
        setSessionState('resting')
      }
    } else {
      setCurrentSet(s => s + 1)
      setRestTime(currentEx?.rest_seconds || 60)
      setSessionState('resting')
    }
  }

  const skipRest = () => {
    setRestTime(0)
    setSessionState('exercising')
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  if (!plan?.plan_data || days.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-card p-12 text-center">
          <Dumbbell className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Workout Plan</h3>
          <p className="text-surface-400 mb-4">Generate a workout plan first to start a session.</p>
          <Link to="/workout" className="btn-primary text-sm inline-flex items-center gap-2">
            <Dumbbell className="w-4 h-4" /> Go to Workout
          </Link>
        </div>
      </div>
    )
  }

  // ── COMPLETE SCREEN ──
  if (sessionState === 'complete') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <div className="glass-card p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Trophy className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Workout Complete!</h2>
          <p className="text-surface-400 mb-6">{currentDay?.day_name || 'Great session!'}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-800/50 rounded-xl p-4">
              <p className="text-2xl font-bold text-primary-400">{formatTime(elapsed)}</p>
              <p className="text-[10px] text-surface-500 uppercase">Duration</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4">
              <p className="text-2xl font-bold text-accent-400">{exercises.length}</p>
              <p className="text-[10px] text-surface-500 uppercase">Exercises</p>
            </div>
            <div className="bg-surface-800/50 rounded-xl p-4">
              <p className="text-2xl font-bold text-amber-400">{completedSets}</p>
              <p className="text-[10px] text-surface-500 uppercase">Sets</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to="/workout" className="btn-secondary text-sm flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Plan
            </Link>
            <Link to="/progress" className="btn-primary text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> View Progress
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── IDLE / DAY SELECTION ──
  if (sessionState === 'idle') {
    const canStart = selectedSchedule?.isToday && !selectedSchedule?.isCompleted && !selectedSchedule?.isRest

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link to="/workout" className="p-2 hover:bg-surface-700/50 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-surface-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Play className="w-8 h-8 text-primary-400" />Live Workout
            </h1>
            <p className="text-surface-400 mt-1">
              <CalendarDays className="w-4 h-4 inline mr-1" />
              Week of {format(weekStart, 'MMM dd')} — Today is <span className="text-white font-medium">{DAY_NAMES[todayIdx]}</span>
            </p>
          </div>
        </div>

        {/* Weekly schedule */}
        <div className="grid grid-cols-7 gap-2">
          {weekSchedule.map((ws) => {
            const isSelected = selectedDay === ws.idx
            let statusColor = 'border-transparent'
            let statusBg = ''
            let StatusIcon = null as any

            if (ws.isCompleted) {
              statusColor = 'border-green-500/50'
              statusBg = 'bg-green-500/5'
              StatusIcon = CheckCircle
            } else if (ws.isMissed) {
              statusColor = 'border-red-500/30'
              statusBg = 'bg-red-500/5'
              StatusIcon = XCircle
            } else if (ws.isToday) {
              statusColor = 'border-primary-500/50'
              statusBg = 'bg-primary-500/5'
            } else if (ws.isRest) {
              statusBg = 'bg-surface-800/30'
            } else if (ws.isFuture) {
              StatusIcon = Lock
            }

            return (
              <button
                key={ws.idx}
                onClick={() => setSelectedDay(ws.idx)}
                className={`glass-card p-3 text-center transition-all border-2 ${statusColor} ${statusBg} ${
                  isSelected ? 'ring-2 ring-primary-400/50 scale-105' : 'hover:scale-102'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                  ws.isToday ? 'text-primary-400' : 'text-surface-500'
                }`}>
                  {ws.dayName.slice(0, 3)}
                </p>
                <p className={`text-lg font-bold mt-1 ${
                  ws.isToday ? 'text-white' : 'text-surface-400'
                }`}>
                  {format(ws.date, 'dd')}
                </p>
                <div className="mt-1.5">
                  {ws.isCompleted && <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />}
                  {ws.isMissed && <XCircle className="w-4 h-4 text-red-400 mx-auto" />}
                  {ws.isToday && !ws.isCompleted && <div className="w-2 h-2 bg-primary-400 rounded-full mx-auto animate-pulse" />}
                  {ws.isFuture && !ws.isRest && <Lock className="w-3 h-3 text-surface-600 mx-auto" />}
                  {ws.isRest && <span className="text-[9px] text-surface-600">REST</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Status banner */}
        {selectedSchedule?.isCompleted && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">
              You've already completed <span className="font-bold">{weekSchedule[selectedDay]?.dayName}'s</span> workout! Great job!
            </p>
          </div>
        )}
        {selectedSchedule?.isMissed && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">
              You missed <span className="font-bold">{weekSchedule[selectedDay]?.dayName}'s</span> workout. Stay consistent — tomorrow is a new day!
            </p>
          </div>
        )}
        {selectedSchedule?.isFuture && (
          <div className="bg-surface-700/30 border border-surface-600/30 rounded-xl p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-surface-500 flex-shrink-0" />
            <p className="text-sm text-surface-400">
              <span className="font-bold">{weekSchedule[selectedDay]?.dayName}'s</span> workout will unlock on that day. Come back then!
            </p>
          </div>
        )}

        {/* Exercise preview */}
        {currentDay && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{currentDay.day_name}</h3>
              <span className="text-[10px] uppercase bg-surface-700/60 text-surface-400 px-3 py-1 rounded-full">{currentDay.type}</span>
            </div>

            {/* Playlist Panel */}
            <div className="mb-6">
              <PlaylistPanel workoutType={currentDay.type} />
            </div>

            {currentDay.type === 'rest' || currentDay.type === 'Rest' ? (
              <div className="text-center py-8">
                <p className="text-surface-400 text-lg">Rest Day 😴</p>
                <p className="text-surface-500 text-sm mt-2">Recovery is part of the plan. Stretch, hydrate, and relax.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-6">
                  {exercises.map((ex: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 bg-surface-700/40 rounded-lg">
                      <span className="w-7 h-7 bg-primary-500/15 rounded-lg flex items-center justify-center text-primary-400 text-xs font-bold">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ex.exercise}</p>
                        <p className="text-xs text-surface-400">{ex.sets} sets × {ex.reps} · {ex.rest_seconds}s rest</p>
                      </div>
                      {ex.target_muscles && (
                        <div className="flex gap-1">
                          {ex.target_muscles.slice(0, 2).map((m: string, j: number) => (
                            <span key={j} className="text-[9px] bg-surface-700 text-surface-400 px-1.5 py-0.5 rounded">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mood Picker */}
                {canStart && (
                  <div className="bg-surface-800/50 rounded-xl p-4 mb-6 border border-surface-700/50">
                    <p className="text-sm text-surface-300 font-medium mb-3 flex items-center gap-2">
                      <Smile className="w-4 h-4 text-primary-400" /> How are you feeling today?
                    </p>
                    <div className="flex justify-between items-center gap-2">
                      {[
                        { val: 1, emoji: '😫', label: 'Exhausted' },
                        { val: 2, emoji: '🥱', label: 'Tired' },
                        { val: 3, emoji: '😐', label: 'Okay' },
                        { val: 4, emoji: '🙂', label: 'Good' },
                        { val: 5, emoji: '🔥', label: 'Pumped' },
                      ].map(m => (
                        <button
                          key={m.val}
                          onClick={() => setMood(m.val)}
                          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                            mood === m.val
                              ? 'bg-primary-500/20 ring-1 ring-primary-500/50 scale-105'
                              : 'hover:bg-surface-700 hover:scale-105 grayscale opacity-50 hover:grayscale-0 hover:opacity-100'
                          }`}
                        >
                          <span className="text-2xl mb-1">{m.emoji}</span>
                          <span className="text-[9px] text-surface-400">{m.label}</span>
                        </button>
                      ))}
                    </div>
                    {mood && mood <= 2 && (
                      <p className="text-xs text-amber-400 mt-3 animate-fade-in bg-amber-500/10 p-2 rounded flex items-center gap-2">
                        <span>💡</span>
                        <span><b>Light Mode Activated:</b> Sets reduced by 1 to prioritize recovery.</span>
                      </p>
                    )}
                    {mood && mood >= 5 && (
                      <p className="text-xs text-green-400 mt-3 animate-fade-in bg-green-500/10 p-2 rounded flex items-center gap-2">
                        <span>🔥</span>
                        <span><b>Beast Mode:</b> Let's crush this workout!</span>
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={startSession}
                  disabled={!canStart || mood === null}
                  className={`w-full py-4 text-lg font-bold flex items-center justify-center gap-3 rounded-xl transition-all ${
                    canStart && mood !== null
                      ? 'btn-primary hover:scale-[1.02]'
                      : 'bg-surface-800 text-surface-600 cursor-not-allowed'
                  }`}
                >
                  {canStart ? (
                    mood === null ? (
                      <><Smile className="w-5 h-5" /> Select mood to start</>
                    ) : (
                      <><Play className="w-6 h-6" /> Start Today's Workout</>
                    )
                  ) : selectedSchedule?.isCompleted ? (
                    <><CheckCircle className="w-6 h-6" /> Already Completed</>
                  ) : selectedSchedule?.isMissed ? (
                    <><XCircle className="w-6 h-6" /> Missed</>
                  ) : (
                    <><Lock className="w-6 h-6" /> Locked</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── ACTIVE SESSION (exercising / resting) ──
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-white">{formatTime(elapsed)}</div>
          <button
            onClick={() => setIsPaused(p => !p)}
            className="p-2 hover:bg-surface-700/50 rounded-xl transition-colors"
          >
            {isPaused ? <Play className="w-5 h-5 text-primary-400" /> : <Pause className="w-5 h-5 text-surface-400" />}
          </button>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-surface-300">Exercise {currentExIdx + 1}/{exercises.length}</p>
          <p className="text-xs text-surface-500">{completedSets}/{totalSets} sets total</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main exercise card */}
      {sessionState === 'exercising' && currentEx && (
        <div className="glass-card p-8 text-center">
          <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-2">
            Exercise {currentExIdx + 1} of {exercises.length}
          </p>
          <h2 className="text-3xl font-bold text-white mb-4">{currentEx.exercise}</h2>
          
          {currentEx.target_muscles && currentEx.target_muscles.length > 0 && (
            <div className="flex gap-2 justify-center mb-6">
              {currentEx.target_muscles.map((m: string, i: number) => (
                <span key={i} className="text-xs bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full flex items-center gap-1">
                  <Target className="w-3 h-3" /> {m}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="bg-surface-800/60 rounded-2xl px-8 py-5 relative">
              {mood && mood <= 2 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
                  Light Mode
                </span>
              )}
              <p className="text-4xl font-bold text-primary-400">{currentSet}<span className="text-surface-500 text-xl">/{maxSets}</span></p>
              <p className="text-[10px] text-surface-500 uppercase mt-1">Current Set</p>
            </div>
            <div className="bg-surface-800/60 rounded-2xl px-8 py-5">
              <p className="text-4xl font-bold text-accent-400">{currentEx.reps}</p>
              <p className="text-[10px] text-surface-500 uppercase mt-1">Reps</p>
            </div>
          </div>

          <button
            onClick={completeSet}
            className="btn-primary w-full max-w-xs mx-auto py-4 text-lg font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform"
          >
            <CheckCircle className="w-6 h-6" /> Complete Set
          </button>
        </div>
      )}

      {/* Rest timer */}
      {sessionState === 'resting' && (
        <div className="glass-card p-8 text-center">
          <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-4">Rest Time</p>
          
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="url(#gradient)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - restTime / (currentEx?.rest_seconds || 60))}`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818CF8" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">{restTime}</span>
            </div>
          </div>

          <p className="text-sm text-surface-400 mb-6">
            Next: <span className="text-white font-medium">
              {currentSet < maxSets ? `${currentEx?.exercise} — Set ${currentSet + 1}` : exercises[currentExIdx + 1]?.exercise || 'Done!'}
            </span>
          </p>

          <button
            onClick={skipRest}
            className="btn-secondary text-sm flex items-center gap-2 mx-auto"
          >
            <SkipForward className="w-4 h-4" /> Skip Rest
          </button>
        </div>
      )}

      {/* Exercise list (mini) */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-3">Exercises</p>
        <div className="space-y-1">
          {exercises.map((ex: any, i: number) => {
            const rowMaxSets = getAdjustedSets(ex)
            return (
              <div
                key={i}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-all ${
                  i === currentExIdx
                    ? 'bg-primary-500/10 text-primary-400 font-medium'
                    : i < currentExIdx
                      ? 'text-surface-600 line-through'
                      : 'text-surface-400'
                }`}
              >
                {i < currentExIdx ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : i === currentExIdx ? (
                  <ChevronRight className="w-4 h-4 text-primary-400" />
                ) : (
                  <span className="w-4 h-4 text-center text-xs text-surface-600">{i + 1}</span>
                )}
                <span>{ex.exercise}</span>
                <span className="ml-auto text-xs text-surface-600">{rowMaxSets}×{ex.reps}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
