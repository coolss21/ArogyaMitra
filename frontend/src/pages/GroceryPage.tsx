import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { ShoppingCart, Check, Copy, Apple, Beef, Milk, Wheat, Nut, Flame, Package } from 'lucide-react'

const CATEGORY_ICONS: Record<string, any> = {
  'Produce': Apple,
  'Protein': Beef,
  'Dairy': Milk,
  'Grains': Wheat,
  'Nuts & Seeds': Nut,
  'Spices & Condiments': Flame,
  'Other': Package,
}

const CATEGORY_COLORS: Record<string, string> = {
  'Produce': 'text-green-400 bg-green-500/10 border-green-500/20',
  'Protein': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Dairy': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Grains': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Nuts & Seeds': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Spices & Condiments': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Other': 'text-surface-400 bg-surface-500/10 border-surface-500/20',
}

export default function GroceryPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['grocery-list'],
    queryFn: api.grocery.list,
    retry: false,
  })

  const toggleItem = (name: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const totalItems = data?.total_items || 0
  const checkedCount = checked.size
  const progressPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  const copyToClipboard = () => {
    if (!data?.categories) return
    const lines: string[] = []
    for (const cat of data.categories) {
      lines.push(`\n${cat.category.toUpperCase()}`)
      for (const item of cat.items) {
        const mark = checked.has(item.name) ? '✅' : '⬜'
        lines.push(`  ${mark} ${item.name}`)
      }
    }
    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Grocery list copied!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-accent-400" />Grocery List
          </h1>
          <p className="text-surface-400 mt-1">Auto-generated from your active nutrition plan</p>
        </div>
        {data && (
          <button
            onClick={copyToClipboard}
            className="btn-secondary text-sm flex items-center gap-2 border-accent-500/30 text-accent-400 hover:bg-accent-500/10"
          >
            <Copy className="w-4 h-4" /> Copy List
          </button>
        )}
      </div>

      {/* Progress bar */}
      {data && totalItems > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-surface-300">
              Shopping Progress: <span className="text-accent-400">{checkedCount}/{totalItems}</span> items
            </p>
            <span className="text-sm font-bold text-accent-400">{progressPct}%</span>
          </div>
          <div className="h-3 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-green-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {progressPct === 100 && (
            <p className="text-xs text-green-400 mt-2 font-medium animate-pulse">
              All items checked! You're ready to cook! 🎉
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Nutrition Plan Found</h3>
          <p className="text-surface-400 mb-4">Generate a nutrition plan first, then come back here for your auto-generated grocery list.</p>
        </div>
      ) : data?.categories?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.categories.map((cat: any) => {
            const IconComp = CATEGORY_ICONS[cat.category] || Package
            const colorClasses = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.Other
            const catChecked = cat.items.filter((i: any) => checked.has(i.name)).length
            const allChecked = catChecked === cat.items.length

            return (
              <div key={cat.category} className={`glass-card overflow-hidden border ${colorClasses.split(' ')[2]}`}>
                <div className="flex items-center justify-between p-4 border-b border-surface-700/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClasses.split(' ').slice(1, 2).join(' ')}`}>
                      <IconComp className={`w-4 h-4 ${colorClasses.split(' ')[0]}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white">{cat.category}</h3>
                      <p className="text-[10px] text-surface-500">{catChecked}/{cat.items.length} items</p>
                    </div>
                  </div>
                  {allChecked && <Check className="w-5 h-5 text-green-400" />}
                </div>
                <div className="p-2">
                  {cat.items.map((item: any, idx: number) => {
                    const isChecked = checked.has(item.name)
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleItem(item.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                          isChecked
                            ? 'bg-green-500/5 text-surface-500'
                            : 'hover:bg-surface-700/30 text-surface-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-green-500 border-green-500'
                            : 'border-surface-600 group-hover:border-surface-400'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm flex-1 ${isChecked ? 'line-through' : ''}`}>
                          {item.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Empty List</h3>
          <p className="text-surface-400">No items could be extracted from your nutrition plan.</p>
        </div>
      )}
    </div>
  )
}
