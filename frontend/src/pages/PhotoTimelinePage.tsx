import { useState, useEffect, useRef } from 'react'
import { Camera, Upload, Trash2, Image as ImageIcon, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProgressPhoto {
  id: string
  date: string
  dataUrl: string
}

export default function PhotoTimelinePage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [beforeId, setBeforeId] = useState<string>('')
  const [afterId, setAfterId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('aromi_progress_photos')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPhotos(parsed)
        if (parsed.length >= 2) {
          setBeforeId(parsed[0].id)
          setAfterId(parsed[parsed.length - 1].id)
        } else if (parsed.length === 1) {
          setBeforeId(parsed[0].id)
        }
      } catch (e) {
        console.error('Failed to parse photos', e)
      }
    }
  }, [])

  // Save to localStorage whenever photos change
  useEffect(() => {
    localStorage.setItem('aromi_progress_photos', JSON.stringify(photos))
  }, [photos])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Limit size to ~5MB to avoid quota issues for now
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const newPhoto: ProgressPhoto = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        dataUrl
      }
      
      const newPhotos = [...photos, newPhoto].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setPhotos(newPhotos)
      toast.success('Photo added!')
      
      if (!beforeId) setBeforeId(newPhoto.id)
      else if (!afterId || afterId === beforeId) setAfterId(newPhoto.id)
      else setAfterId(newPhoto.id) // update "after" to newest
    }
    reader.readAsDataURL(file)
  }

  const deletePhoto = (id: string) => {
    const newPhotos = photos.filter(p => p.id !== id)
    setPhotos(newPhotos)
    if (beforeId === id) setBeforeId(newPhotos[0]?.id || '')
    if (afterId === id) setAfterId(newPhotos.length > 1 ? newPhotos[newPhotos.length - 1].id : '')
    toast.success('Photo deleted')
  }

  const beforePhoto = photos.find(p => p.id === beforeId)
  const afterPhoto = photos.find(p => p.id === afterId)

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Camera className="w-8 h-8 text-primary-400" /> Photo Timeline</h1>
          <p className="text-surface-400 mt-1">Track your visual progress over time. Photos are stored securely on your device.</p>
        </div>
        
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Upload className="w-4 h-4" /> Upload Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-surface-600/50">
          <div className="w-16 h-16 bg-surface-700/50 rounded-2xl flex items-center justify-center mb-4 text-surface-400">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No photos yet</h2>
          <p className="text-surface-400 max-w-md mx-auto mb-6">Start tracking your visual progress by uploading your first photo.</p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add First Photo
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Comparison View */}
          {photos.length >= 2 && (
            <div className="glass-card p-6 border-primary-500/20">
              <h2 className="text-lg font-semibold mb-4">Before & After Comparison</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-surface-300">Before</label>
                    <select 
                      value={beforeId} 
                      onChange={(e) => setBeforeId(e.target.value)}
                      className="input-field py-1 px-2 text-sm max-w-[150px]"
                    >
                      {photos.map(p => <option key={p.id} value={p.id}>{p.date}</option>)}
                    </select>
                  </div>
                  <div className="aspect-[3/4] bg-surface-800 rounded-xl overflow-hidden border border-surface-700/50 relative group">
                    {beforePhoto ? (
                      <img src={beforePhoto.dataUrl} alt="Before" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-surface-500"><ImageIcon className="w-8 h-8" /></div>
                    )}
                  </div>
                </div>

                {/* After */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-surface-300">After</label>
                    <select 
                      value={afterId} 
                      onChange={(e) => setAfterId(e.target.value)}
                      className="input-field py-1 px-2 text-sm max-w-[150px]"
                    >
                      {photos.map(p => <option key={p.id} value={p.id}>{p.date}</option>)}
                    </select>
                  </div>
                  <div className="aspect-[3/4] bg-surface-800 rounded-xl overflow-hidden border border-surface-700/50 relative group">
                    {afterPhoto ? (
                      <img src={afterPhoto.dataUrl} alt="After" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-surface-500"><ImageIcon className="w-8 h-8" /></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Gallery */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Timeline Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-[3/4] border border-surface-700/50 bg-surface-800">
                  <img src={photo.dataUrl} alt={photo.date} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <span className="text-sm font-medium text-white mb-2">{photo.date}</span>
                    <button 
                      onClick={() => deletePhoto(photo.id)}
                      className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-lg backdrop-blur text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
