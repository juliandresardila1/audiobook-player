import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Music, Plus, Code } from 'lucide-react'
import AudiobookForm from '../components/AudiobookForm'
import EmbedCodeModal from '../components/EmbedCodeModal'

export default function Dashboard() {
  const navigate = useNavigate()
  const [audiobooks, setAudiobooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [embedAudiobook, setEmbedAudiobook] = useState(null)

  useEffect(() => {
    loadAudiobooks()
  }, [])

  const loadAudiobooks = async () => {
    try {
      const { data, error } = await supabase
        .from('audiobooks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAudiobooks(data || [])
    } catch (err) {
      console.error('Error loading audiobooks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setShowForm(true)
  }

  const handleSaveAudiobook = (savedAudiobook) => {
    // Add new audiobook to list and navigate to it
    setAudiobooks(prev => [savedAudiobook, ...prev])
    navigate(`/audiobook/${savedAudiobook.id}`)
  }

  const handleCloseForm = () => {
    setShowForm(false)
  }

  const handleAudiobookClick = (audiobookId) => {
    navigate(`/audiobook/${audiobookId}`)
  }

  const handleGetEmbedCode = (e, audiobook) => {
    e.stopPropagation() // Prevent card click
    setEmbedAudiobook(audiobook)
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-12 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent text-shadow">
              Audiobook Player
            </h1>
            <p className="text-gray-600 mt-2">Manage and host your audiobooks</p>
          </div>
          <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            New Audiobook
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Music size={24} />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Audiobooks</p>
                <p className="text-3xl font-bold text-gray-800">{audiobooks.length}</p>
              </div>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                <Music size={24} />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Tracks</p>
                <p className="text-3xl font-bold text-gray-800">
                  {audiobooks.reduce((sum, ab) => sum + (ab.track_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Music size={24} />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Duration</p>
                <p className="text-3xl font-bold text-gray-800">0h</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Audiobooks Grid */}
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Audiobooks</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : audiobooks.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center">
            <Music size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No audiobooks yet</h3>
            <p className="text-gray-600 mb-6">Create your first audiobook to get started</p>
            <button onClick={handleCreateNew} className="btn-primary">
              <Plus size={20} className="inline mr-2" />
              Create Audiobook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {audiobooks.map((audiobook) => (
              <div
                key={audiobook.id}
                className="glass p-6 rounded-2xl card-hover cursor-pointer group relative"
              >
                <div onClick={() => handleAudiobookClick(audiobook.id)}>
                  <div className="aspect-square bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                    {audiobook.thumbnail_url ? (
                      <img
                        src={audiobook.thumbnail_url}
                        alt={audiobook.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music size={48} className="text-gray-400" />
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-1 truncate">{audiobook.name}</h3>
                  <p className="text-gray-600 text-sm truncate">{audiobook.author || 'Unknown Author'}</p>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>{audiobook.track_count || 0} tracks</span>
                    <span>{new Date(audiobook.created_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Get Embed Code Button */}
                {audiobook.track_count > 0 && (
                  <button
                    onClick={(e) => handleGetEmbedCode(e, audiobook)}
                    className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white border border-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    title="Get embed code"
                  >
                    <Code size={18} className="text-gray-700" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audiobook Form Modal */}
      {showForm && (
        <AudiobookForm
          audiobook={null}
          onClose={handleCloseForm}
          onSave={handleSaveAudiobook}
        />
      )}

      {/* Embed Code Modal */}
      {embedAudiobook && (
        <EmbedCodeModal
          audiobook={embedAudiobook}
          onClose={() => setEmbedAudiobook(null)}
        />
      )}
    </div>
  )
}
