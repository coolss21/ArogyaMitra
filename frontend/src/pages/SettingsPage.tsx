import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, clearToken } from '../lib/api'
import toast from 'react-hot-toast'
import { Settings, Shield, Download, Trash2, Brain, Plus, Trash, Stethoscope } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [injuryInput, setInjuryInput] = useState('')

  const queryClient = useQueryClient()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.auth.me })
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.profile.get })
  const { data: memories, refetch: refetchMemory } = useQuery({ queryKey: ['memories'], queryFn: api.aromi.memory.list })

  const deleteAccount = useMutation({
    mutationFn: api.profile.delete,
    onSuccess: () => { clearToken(); toast.success('Account deleted'); navigate('/login') },
    onError: (e: any) => toast.error(e.message),
  })

  const updateProfile = useMutation({
    mutationFn: (data: any) => api.profile.update(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profile updated!') },
    onError: (e: any) => toast.error(e.message),
  })

  const addMemory = useMutation({
    mutationFn: () => api.aromi.memory.set(newKey, newVal),
    onSuccess: () => { refetchMemory(); setNewKey(''); setNewVal(''); toast.success('Memory saved!') },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMemory = useMutation({
    mutationFn: (key: string) => api.aromi.memory.delete(key),
    onSuccess: () => { refetchMemory(); toast.success('Memory deleted') },
    onError: (e: any) => toast.error(e.message),
  })

  async function exportData() {
    try {
      const data = await api.profile.export()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'arogyamitra_export.json'; a.click()
      toast.success('Data exported!')
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Settings className="w-8 h-8 text-surface-400" />Settings</h1>
      </div>

      {/* Account */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary-400" />Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-surface-700/50"><span className="text-surface-400">Email</span><span>{user?.email}</span></div>
          <div className="flex justify-between py-2 border-b border-surface-700/50"><span className="text-surface-400">Role</span><span className="capitalize badge-blue">{user?.role}</span></div>
          <div className="flex justify-between py-2"><span className="text-surface-400">Joined</span><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
        </div>
      </div>

      {/* Smart Injury Recovery */}
      <div className="glass-card p-6 border-accent-500/20">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Stethoscope className="w-5 h-5 text-accent-400" />Smart Injury Recovery</h2>
        <p className="text-xs text-surface-400 mb-4">AROMI will automatically adapt your workouts to avoid stressing injured areas.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-surface-300">Current Injuries / Conditions</label>
            <textarea 
              className="input-field min-h-[80px]" 
              placeholder="e.g. 'Lower back pain', 'Sprained right ankle'"
              defaultValue={profile?.injuries || ''}
              onChange={e => setInjuryInput(e.target.value)}
            />
          </div>
          <button 
            onClick={() => updateProfile.mutate({ injuries: injuryInput || null })} 
            disabled={updateProfile.isPending}
            className="btn-accent px-4 py-2 text-sm"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Injuries'}
          </button>
        </div>
      </div>

      {/* AROMI Memory */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-blue-400" />AROMI Memory</h2>
        <p className="text-xs text-surface-400 mb-4">Key-value facts AROMI remembers about you across sessions</p>
        <div className="flex gap-2 mb-4">
          <input className="input-field" placeholder="key (eg: prefers_morning)" value={newKey} onChange={e => setNewKey(e.target.value)} />
          <input className="input-field" placeholder="value" value={newVal} onChange={e => setNewVal(e.target.value)} />
          <button onClick={() => addMemory.mutate()} disabled={!newKey || !newVal} className="btn-primary flex items-center gap-2 whitespace-nowrap"><Plus className="w-4 h-4" /></button>
        </div>
        {memories?.length ? (
          <div className="space-y-2">
            {memories.map((m: any) => (
              <div key={m.key} className="flex items-center justify-between py-2 px-3 bg-surface-700/40 rounded-lg text-sm">
                <span className="font-mono text-blue-300">{m.key}</span>
                <span className="text-surface-300 flex-1 mx-4 truncate">{m.value}</span>
                <button onClick={() => deleteMemory.mutate(m.key)} className="text-surface-500 hover:text-red-400 transition-colors"><Trash className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : <p className="text-surface-500 text-sm">No memories stored yet</p>}
      </div>

      {/* Data export */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Download className="w-5 h-5 text-primary-400" />Data Export</h2>
        <p className="text-sm text-surface-400 mb-4">Download all your data as JSON</p>
        <button onClick={exportData} className="btn-secondary flex items-center gap-2"><Download className="w-4 h-4" />Export Data</button>
      </div>

      {/* Delete account */}
      <div className="glass-card p-6 border-red-500/20">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400"><Trash2 className="w-5 h-5" />Danger Zone</h2>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
            <Trash2 className="w-4 h-4" />Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">This will permanently delete your account and all data. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => deleteAccount.mutate()} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">Yes, Delete Everything</button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
