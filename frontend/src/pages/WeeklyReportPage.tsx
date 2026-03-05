import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ClipboardList, Sparkles, Loader2, Calendar } from 'lucide-react'

export default function WeeklyReportPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: api.reports.getWeekly,
  })

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-2">
          <ClipboardList className="w-10 h-10 text-primary-400" /> Weekly AI Insights
        </h1>
        <p className="text-surface-400">Personalized feedback on your consistency, challenges, and overall wellness.</p>
      </div>

      <div className="glass-card p-0 overflow-hidden relative border-primary-500/20 shadow-2xl shadow-primary-500/5">
        <div className="bg-gradient-to-r from-primary-500/10 to-accent-500/10 p-6 border-b border-surface-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-800 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">AI Progress Summary</h2>
              <div className="flex items-center gap-1.5 text-xs text-surface-400 mt-0.5">
                 <Calendar className="w-3 h-3" />
                 Last 7 Days Analysis
              </div>
            </div>
          </div>
          <button 
            onClick={() => refetch()}
            className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
              <p className="text-surface-400 animate-pulse">Consulting AROMI for your insights...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-400 font-medium">Failed to generate report.</p>
              <button onClick={() => refetch()} className="btn-surface mt-4">Try Again</button>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-surface-200 leading-relaxed text-lg">
                {data?.summary || "No summary available."}
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface-800/50 p-6 border-t border-surface-700/50">
          <div className="flex items-start gap-4">
            <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            </div>
            <p className="text-sm text-surface-400 italic leading-relaxed">
              "This report is generated based on your activity data and challenges completed over the past week. Consistency is the key to long-term success!"
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
