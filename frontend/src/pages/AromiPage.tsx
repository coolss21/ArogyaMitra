import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Bot, Send, User, Zap, AlertTriangle, Wrench } from 'lucide-react'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  tools_called?: string[]
  steps_taken?: number
  adjustment_triggered?: boolean
}

const WELCOME: Msg = {
  role: 'assistant',
  content: "Hi! I'm **AROMI**, your agentic AI wellness coach 🤖💚\n\nI can generate workout plans, nutrition plans, adjust your program, and remember your preferences — all through intelligent tool use.\n\n*Disclaimer: I'm an AI coach, not a medical professional. For medical concerns, consult a healthcare provider.*",
}

export default function AromiPage() {
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    // Load existing history on mount
    api.aromi.getHistory().then(res => {
      if (res.history && res.history.length > 0) {
        // Only prepend welcome message if the history doesn't start with an assistant message
        setMsgs([WELCOME, ...res.history])
        setSessionId(res.session_id)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, thinking])

  const chatMutation = useMutation({
    mutationFn: (msg: string) => api.aromi.chat(msg, sessionId || undefined),
    onSuccess: (data) => {
      setSessionId(data.session_id)
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        tools_called: data.tools_called,
        steps_taken: data.steps_taken,
        adjustment_triggered: data.adjustment_triggered,
      }])
      // Refresh workout/nutrition if they were generated
      if (data.tools_called?.includes('generate_workout_plan')) {
        queryClient.invalidateQueries({ queryKey: ['workout-latest'] })
      }
      if (data.tools_called?.includes('generate_nutrition_plan')) {
        queryClient.invalidateQueries({ queryKey: ['nutrition-latest'] })
      }
      if (data.tools_called?.includes('adjust_plans')) {
        queryClient.invalidateQueries({ queryKey: ['workout-latest'] })
      }
    },
    onError: (err: any) => {
      toast.error(err.message)
      setMsgs(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` }])
    },
    onSettled: () => setThinking(false),
  })

  function send() {
    if (!input.trim() || thinking) return
    const msg = input.trim()
    setInput('')
    setMsgs(prev => [...prev, { role: 'user', content: msg }])
    setThinking(true)
    chatMutation.mutate(msg)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AROMI</h1>
          <p className="text-xs text-surface-400">Agentic AI Coach · Planner → Tools → Memory</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {msgs.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-accent-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[82%] ${msg.role === 'user' ? 'bg-primary-500/15 border border-primary-500/25 rounded-2xl rounded-tr-md' : 'bg-surface-800/70 border border-surface-700/40 rounded-2xl rounded-tl-md'} p-4`}>
              {/* Tool call badges */}
              {msg.tools_called && msg.tools_called.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {msg.tools_called.map((t, j) => (
                    <span key={j} className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                      <Wrench className="w-3 h-3" />{t}
                    </span>
                  ))}
                  <span className="flex items-center gap-1 text-xs bg-surface-700/60 text-surface-400 px-2 py-0.5 rounded-full">
                    <Zap className="w-3 h-3" />{msg.steps_taken} step{msg.steps_taken !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
              {msg.adjustment_triggered && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5" />Plan adjusted! Check the Workout page.
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-primary-400" />
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-accent-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-surface-800/70 border border-surface-700/40 rounded-2xl rounded-tl-md p-4">
              <div className="flex items-center gap-2 text-xs text-surface-400 mb-1">
                <Zap className="w-3 h-3 text-blue-400 animate-pulse" /> Agent running planner loop…
              </div>
              <div className="flex gap-1.5">
                {[0,150,300].map(d => <div key={d} className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 mt-3 mb-2 flex-wrap flex-shrink-0">
        {['Generate my workout plan', 'Make a nutrition plan', 'I injured my shoulder', 'I\'m traveling tomorrow'].map(p => (
          <button key={p} onClick={() => { setInput(p); }} className="text-xs bg-surface-700/50 hover:bg-surface-700 border border-surface-600/50 text-surface-300 px-3 py-1.5 rounded-full transition-all">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="glass-card p-3 flex items-end gap-3 flex-shrink-0">
        <textarea
          id="aromi-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask AROMI anything — plans, adjustments, advice…"
          className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 resize-none outline-none min-h-[40px] max-h-[120px]"
          rows={1}
        />
        <button
          id="aromi-send"
          onClick={send}
          disabled={!input.trim() || thinking}
          className="w-10 h-10 bg-gradient-to-br from-blue-400 to-accent-500 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
