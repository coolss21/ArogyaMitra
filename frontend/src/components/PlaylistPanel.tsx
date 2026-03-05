import { useState } from 'react'
import { Music, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

const PLAYLISTS: Record<string, { name: string; emoji: string; spotify: string; youtube: string }[]> = {
  'strength': [
    { name: 'Heavy Lifting Power', emoji: '🏋️', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', youtube: 'https://www.youtube.com/results?search_query=heavy+lifting+workout+music' },
    { name: 'Beast Mode', emoji: '💪', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX70RN3TfnE9m', youtube: 'https://www.youtube.com/results?search_query=beast+mode+gym+music' },
  ],
  'hiit': [
    { name: 'HIIT Cardio Burn', emoji: '🔥', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX32NsLKyzScr', youtube: 'https://www.youtube.com/results?search_query=hiit+workout+music+playlist' },
    { name: 'High Energy Dance', emoji: '⚡', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX6GwdWRQMQpq', youtube: 'https://www.youtube.com/results?search_query=high+energy+workout+music' },
  ],
  'cardio': [
    { name: 'Run Wild', emoji: '🏃', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DWUVpAXiEPK8P', youtube: 'https://www.youtube.com/results?search_query=running+playlist+2024' },
    { name: 'Cardio Beats', emoji: '❤️', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX0HRj9P7NxeE', youtube: 'https://www.youtube.com/results?search_query=cardio+workout+playlist' },
  ],
  'yoga': [
    { name: 'Peaceful Flow', emoji: '🧘', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX9uKNf5jGX6m', youtube: 'https://www.youtube.com/results?search_query=yoga+meditation+music' },
    { name: 'Deep Stretch', emoji: '🌿', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u', youtube: 'https://www.youtube.com/results?search_query=stretching+relaxation+music' },
  ],
  'default': [
    { name: 'Workout Motivation', emoji: '🎵', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX70RN3TfnE9m', youtube: 'https://www.youtube.com/results?search_query=workout+motivation+music' },
    { name: 'Pump Up Hits', emoji: '🎧', spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', youtube: 'https://www.youtube.com/results?search_query=gym+pump+up+songs' },
  ],
}

function getPlaylistsForType(workoutType: string): typeof PLAYLISTS['default'] {
  const lower = workoutType.toLowerCase()
  if (lower.includes('strength') || lower.includes('upper') || lower.includes('lower') || lower.includes('push') || lower.includes('pull') || lower.includes('legs')) return PLAYLISTS.strength
  if (lower.includes('hiit') || lower.includes('circuit') || lower.includes('tabata')) return PLAYLISTS.hiit
  if (lower.includes('cardio') || lower.includes('run') || lower.includes('cycling')) return PLAYLISTS.cardio
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('flexibility') || lower.includes('mobility')) return PLAYLISTS.yoga
  return PLAYLISTS.default
}

export default function PlaylistPanel({ workoutType }: { workoutType: string }) {
  const [open, setOpen] = useState(false)
  const playlists = getPlaylistsForType(workoutType)

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-700/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
            <Music className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Workout Playlists</p>
            <p className="text-[10px] text-surface-500">Curated music for your session</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 animate-slide-up">
          {playlists.map((pl, i) => (
            <div key={i} className="bg-surface-800/40 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{pl.emoji}</span>
                <span className="text-sm font-medium text-surface-200">{pl.name}</span>
              </div>
              <div className="flex gap-2">
                <a href={pl.spotify} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                  Spotify <ExternalLink className="w-3 h-3" />
                </a>
                <a href={pl.youtube} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                  YouTube <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
