import { useMemo } from 'react'

// Muscle name → SVG region ID mapping
const MUSCLE_REGIONS: Record<string, string[]> = {
  'chest': ['chest-l', 'chest-r'],
  'pecs': ['chest-l', 'chest-r'],
  'pectorals': ['chest-l', 'chest-r'],
  'shoulders': ['shoulder-l', 'shoulder-r'],
  'deltoids': ['shoulder-l', 'shoulder-r'],
  'delts': ['shoulder-l', 'shoulder-r'],
  'anterior deltoid': ['shoulder-l', 'shoulder-r'],
  'biceps': ['bicep-l', 'bicep-r'],
  'triceps': ['tricep-l', 'tricep-r'],
  'forearms': ['forearm-l', 'forearm-r'],
  'abs': ['abs'],
  'core': ['abs', 'obliques'],
  'abdominals': ['abs'],
  'obliques': ['obliques'],
  'quadriceps': ['quad-l', 'quad-r'],
  'quads': ['quad-l', 'quad-r'],
  'hamstrings': ['hamstring-l', 'hamstring-r'],
  'glutes': ['glute-l', 'glute-r'],
  'calves': ['calf-l', 'calf-r'],
  'back': ['upper-back', 'lower-back'],
  'lats': ['upper-back'],
  'latissimus dorsi': ['upper-back'],
  'upper back': ['upper-back'],
  'lower back': ['lower-back'],
  'traps': ['trap-l', 'trap-r'],
  'trapezius': ['trap-l', 'trap-r'],
  'rhomboids': ['upper-back'],
  'hip flexors': ['hip-l', 'hip-r'],
  'full body': ['chest-l', 'chest-r', 'shoulder-l', 'shoulder-r', 'bicep-l', 'bicep-r', 'abs', 'quad-l', 'quad-r', 'upper-back'],
}

function getColor(count: number): string {
  if (count === 0) return '#1e293b' // gray - not trained
  if (count <= 2) return '#22c55e'  // green - balanced
  if (count <= 3) return '#f59e0b'  // amber - moderate
  return '#ef4444'                   // red - overworked
}

function getLabel(count: number): string {
  if (count === 0) return 'Not trained'
  if (count <= 2) return 'Balanced'
  if (count <= 3) return 'Well trained'
  return 'Overworked'
}

interface MuscleHeatmapProps {
  days: any[]
}

export default function MuscleHeatmap({ days }: MuscleHeatmapProps) {
  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    // Initialize all regions
    Object.values(MUSCLE_REGIONS).flat().forEach(r => { counts[r] = 0 })

    for (const day of days) {
      if (day.type === 'rest' || day.type === 'Rest') continue
      for (const ex of day.main_workout || []) {
        for (const muscle of ex.target_muscles || []) {
          const lower = muscle.toLowerCase()
          // Check each mapping
          for (const [key, regions] of Object.entries(MUSCLE_REGIONS)) {
            if (lower.includes(key) || key.includes(lower)) {
              regions.forEach(r => { counts[r] = (counts[r] || 0) + 1 })
            }
          }
        }
      }
    }
    return counts
  }, [days])

  const getRegionColor = (id: string) => getColor(muscleCounts[id] || 0)

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
        <span className="text-2xl">🏋️</span> Muscle Activity Heatmap
      </h3>
      <p className="text-xs text-surface-400 mb-4">Based on your 7-day workout plan</p>

      <div className="flex items-start justify-center gap-8">
        {/* Front View */}
        <div className="text-center">
          <p className="text-[10px] text-surface-500 mb-2 uppercase tracking-widest">Front</p>
          <svg viewBox="0 0 200 380" className="w-36 h-auto">
            {/* Head */}
            <circle cx="100" cy="30" r="20" fill="#334155" stroke="#475569" strokeWidth="1" />
            {/* Neck */}
            <rect x="92" y="50" width="16" height="15" fill="#334155" rx="3" />
            {/* Traps */}
            <path id="trap-l" d="M75,65 Q85,55 92,65 L92,75 L75,75 Z" fill={getRegionColor('trap-l')} opacity="0.8" rx="2" />
            <path id="trap-r" d="M125,65 Q115,55 108,65 L108,75 L125,75 Z" fill={getRegionColor('trap-r')} opacity="0.8" rx="2" />
            {/* Shoulders */}
            <ellipse id="shoulder-l" cx="68" cy="80" rx="15" ry="12" fill={getRegionColor('shoulder-l')} opacity="0.8" />
            <ellipse id="shoulder-r" cx="132" cy="80" rx="15" ry="12" fill={getRegionColor('shoulder-r')} opacity="0.8" />
            {/* Chest */}
            <ellipse id="chest-l" cx="82" cy="100" rx="18" ry="15" fill={getRegionColor('chest-l')} opacity="0.8" />
            <ellipse id="chest-r" cx="118" cy="100" rx="18" ry="15" fill={getRegionColor('chest-r')} opacity="0.8" />
            {/* Biceps */}
            <ellipse id="bicep-l" cx="55" cy="115" rx="8" ry="18" fill={getRegionColor('bicep-l')} opacity="0.8" />
            <ellipse id="bicep-r" cx="145" cy="115" rx="8" ry="18" fill={getRegionColor('bicep-r')} opacity="0.8" />
            {/* Forearms */}
            <ellipse id="forearm-l" cx="48" cy="155" rx="7" ry="20" fill={getRegionColor('forearm-l')} opacity="0.8" />
            <ellipse id="forearm-r" cx="152" cy="155" rx="7" ry="20" fill={getRegionColor('forearm-r')} opacity="0.8" />
            {/* Abs */}
            <rect id="abs" x="82" y="118" width="36" height="40" fill={getRegionColor('abs')} opacity="0.8" rx="6" />
            {/* Obliques */}
            <rect id="obliques" x="72" y="125" width="10" height="30" fill={getRegionColor('obliques')} opacity="0.6" rx="4" />
            <rect x="118" y="125" width="10" height="30" fill={getRegionColor('obliques')} opacity="0.6" rx="4" />
            {/* Hips */}
            <ellipse id="hip-l" cx="82" cy="170" rx="12" ry="8" fill={getRegionColor('hip-l')} opacity="0.6" />
            <ellipse id="hip-r" cx="118" cy="170" rx="12" ry="8" fill={getRegionColor('hip-r')} opacity="0.6" />
            {/* Quads */}
            <ellipse id="quad-l" cx="82" cy="220" rx="16" ry="40" fill={getRegionColor('quad-l')} opacity="0.8" />
            <ellipse id="quad-r" cx="118" cy="220" rx="16" ry="40" fill={getRegionColor('quad-r')} opacity="0.8" />
            {/* Calves */}
            <ellipse id="calf-l" cx="80" cy="305" rx="10" ry="30" fill={getRegionColor('calf-l')} opacity="0.8" />
            <ellipse id="calf-r" cx="120" cy="305" rx="10" ry="30" fill={getRegionColor('calf-r')} opacity="0.8" />
            {/* Feet */}
            <ellipse cx="80" cy="345" rx="10" ry="5" fill="#334155" />
            <ellipse cx="120" cy="345" rx="10" ry="5" fill="#334155" />
          </svg>
        </div>

        {/* Back View */}
        <div className="text-center">
          <p className="text-[10px] text-surface-500 mb-2 uppercase tracking-widest">Back</p>
          <svg viewBox="0 0 200 380" className="w-36 h-auto">
            {/* Head */}
            <circle cx="100" cy="30" r="20" fill="#334155" stroke="#475569" strokeWidth="1" />
            <rect x="92" y="50" width="16" height="15" fill="#334155" rx="3" />
            {/* Upper Back */}
            <rect id="upper-back" x="72" y="70" width="56" height="45" fill={getRegionColor('upper-back')} opacity="0.8" rx="8" />
            {/* Lower Back */}
            <rect id="lower-back" x="78" y="118" width="44" height="38" fill={getRegionColor('lower-back')} opacity="0.8" rx="6" />
            {/* Triceps */}
            <ellipse id="tricep-l" cx="55" cy="115" rx="8" ry="18" fill={getRegionColor('tricep-l')} opacity="0.8" />
            <ellipse id="tricep-r" cx="145" cy="115" rx="8" ry="18" fill={getRegionColor('tricep-r')} opacity="0.8" />
            {/* Glutes */}
            <ellipse id="glute-l" cx="85" cy="172" rx="16" ry="14" fill={getRegionColor('glute-l')} opacity="0.8" />
            <ellipse id="glute-r" cx="115" cy="172" rx="16" ry="14" fill={getRegionColor('glute-r')} opacity="0.8" />
            {/* Hamstrings */}
            <ellipse id="hamstring-l" cx="82" cy="225" rx="14" ry="38" fill={getRegionColor('hamstring-l')} opacity="0.8" />
            <ellipse id="hamstring-r" cx="118" cy="225" rx="14" ry="38" fill={getRegionColor('hamstring-r')} opacity="0.8" />
            {/* Calves (back) */}
            <ellipse cx="80" cy="305" rx="10" ry="30" fill={getRegionColor('calf-l')} opacity="0.7" />
            <ellipse cx="120" cy="305" rx="10" ry="30" fill={getRegionColor('calf-r')} opacity="0.7" />
            {/* Feet */}
            <ellipse cx="80" cy="345" rx="10" ry="5" fill="#334155" />
            <ellipse cx="120" cy="345" rx="10" ry="5" fill="#334155" />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {[
          { color: '#1e293b', label: 'Not trained' },
          { color: '#22c55e', label: 'Balanced' },
          { color: '#f59e0b', label: 'Moderate' },
          { color: '#ef4444', label: 'Overworked' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-surface-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
