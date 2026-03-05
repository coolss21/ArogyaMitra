import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Zap, Clock, Wrench, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

const EVENT_COLORS: Record<string, string> = {
  planner_decision: 'badge-blue',
  tool_call: 'badge-purple',
  tool_result: 'badge-green',
  tool_error: 'badge-red',
  agent_response: 'badge-green',
  verify_retry: 'badge-amber',
  max_steps_reached: 'badge-amber',
  planner_error: 'badge-red',
}

const EVENT_ICONS: Record<string, any> = {
  planner_decision: Zap,
  tool_call: Wrench,
  tool_result: CheckCircle,
  tool_error: XCircle,
  agent_response: CheckCircle,
  verify_retry: RefreshCw,
  max_steps_reached: AlertTriangle,
  planner_error: XCircle,
}

export default function AgentEventsPage() {
  const queryClient = useQueryClient()
  const { data: events, isLoading } = useQuery({
    queryKey: ['agent-events'],
    queryFn: () => api.aromi.events(200),
    refetchInterval: 5000, // auto-refresh every 5s
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="w-8 h-8 text-amber-400" />Agent Event Log
          </h1>
          <p className="text-surface-400 mt-1">Proof of agentic behavior — every planner step, tool call, and result</p>
        </div>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['agent-events'] })} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="glass-card p-4">
        <p className="text-xs text-surface-400 mb-3 font-semibold uppercase tracking-wider">Event Types</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_COLORS).map(([type, cls]) => (
            <span key={type} className={cls}>{type.replace(/_/g, ' ')}</span>
          ))}
        </div>
      </div>

      {/* Events */}
      {isLoading ? (
        <div className="text-center py-16 text-surface-400">
          <div className="w-8 h-8 border-2 border-surface-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
          Loading events…
        </div>
      ) : !events?.length ? (
        <div className="glass-card p-12 text-center">
          <Zap className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No agent events yet</h3>
          <p className="text-surface-400">Send a message to AROMI to see the agent in action</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event: any) => {
            const Icon = EVENT_ICONS[event.event_type] || Zap
            const badgeClass = EVENT_COLORS[event.event_type] || 'badge-blue'
            return (
              <div key={event.id} className="glass-card p-4 hover:border-surface-600/70 transition-all">
                <div className="flex items-start gap-4">
                  {/* Step indicator */}
                  <div className="w-8 h-8 bg-surface-700/50 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-surface-300">
                    {event.step}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className={badgeClass}>
                        <Icon className="w-3 h-3 mr-1 inline" />{event.event_type.replace(/_/g, ' ')}
                      </span>
                      {event.tool_name && (
                        <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                          {event.tool_name}()
                        </span>
                      )}
                      {event.latency_ms && (
                        <span className="text-xs text-surface-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{event.latency_ms}ms
                        </span>
                      )}
                      <span className="text-xs text-surface-500 ml-auto">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {event.rationale && (
                      <p className="text-xs text-surface-300 italic mb-2">"{event.rationale}"</p>
                    )}

                    {event.tool_args && Object.keys(event.tool_args).length > 0 && (
                      <details className="mb-2">
                        <summary className="text-xs text-surface-400 cursor-pointer hover:text-surface-300">Args</summary>
                        <pre className="text-xs text-surface-300 bg-surface-900/60 rounded-lg p-3 mt-1 overflow-x-auto">
                          {JSON.stringify(event.tool_args, null, 2)}
                        </pre>
                      </details>
                    )}

                    {event.result && !event.error && (
                      <details>
                        <summary className="text-xs text-surface-400 cursor-pointer hover:text-surface-300">Result</summary>
                        <pre className="text-xs text-surface-300 bg-surface-900/60 rounded-lg p-3 mt-1 overflow-x-auto">
                          {JSON.stringify(event.result, null, 2).slice(0, 800)}
                        </pre>
                      </details>
                    )}

                    {event.error && (
                      <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mt-1">
                        Error: {event.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-surface-600 font-mono mt-2 pl-12 truncate">
                  session: {event.session_id}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
