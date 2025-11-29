import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Music, Plus, Code, Trash2 } from 'lucide-react'
import AudiobookForm from '../components/AudiobookForm'
import EmbedCodeModal from '../components/EmbedCodeModal'

export default function Dashboard() {
  const navigate = useNavigate()
  const [audiobooks, setAudiobooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [embedAudiobook, setEmbedAudiobook] = useState(null)
  const [totalDuration, setTotalDuration] = useState(0)

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

      // Calculate total duration from all tracks
      const { data: allTracks, error: tracksError } = await supabase
        .from('tracks')
        .select('duration')

      if (tracksError) throw tracksError

      const total = (allTracks || []).reduce((sum, track) => sum + (track.duration || 0), 0)
      setTotalDuration(total)
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

  const handleDeleteAudiobook = async (e, audiobookId) => {
    e.stopPropagation() // Prevent card click

    if (!confirm('Are you sure you want to delete this audiobook? This will also delete all its tracks.')) return

    try {
      // Delete all tracks first
      const { error: tracksError } = await supabase
        .from('tracks')
        .delete()
        .eq('audiobook_id', audiobookId)

      if (tracksError) throw tracksError

      // Then delete the audiobook
      const { error: audiobookError } = await supabase
        .from('audiobooks')
        .delete()
        .eq('id', audiobookId)

      if (audiobookError) throw audiobookError

      // Remove from state
      setAudiobooks(prev => prev.filter(ab => ab.id !== audiobookId))
    } catch (err) {
      console.error('Error deleting audiobook:', err)
      alert('Failed to delete audiobook. Please try again.')
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8 sm:mb-12 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent text-shadow">
              Audiobook Player
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage and host your audiobooks</p>
          </div>
          <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus size={20} />
            <span className="sm:inline">New Audiobook</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mt-6 sm:mt-8">
          <div className="glass p-4 sm:p-6 rounded-xl sm:rounded-2xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                <Music size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Total Audiobooks</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{audiobooks.length}</p>
              </div>
            </div>
          </div>
          <div className="glass p-4 sm:p-6 rounded-xl sm:rounded-2xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center flex-shrink-0">
                <Music size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Total Tracks</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {audiobooks.reduce((sum, ab) => sum + (ab.track_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass p-4 sm:p-6 rounded-xl sm:rounded-2xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <Music size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm">Total Duration</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Audiobooks Grid */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Your Audiobooks</h2>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {audiobooks.map((audiobook) => (
              <div
                key={audiobook.id}
                className="glass p-4 sm:p-6 rounded-xl sm:rounded-2xl card-hover cursor-pointer group relative"
              >
                <div onClick={() => handleAudiobookClick(audiobook.id)}>
                  <div className="aspect-square bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-lg sm:rounded-xl mb-3 sm:mb-4 flex items-center justify-center overflow-hidden">
                    {audiobook.thumbnail_url ? (
                      <img
                        src={audiobook.thumbnail_url}
                        alt={audiobook.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: audiobook.thumbnail_position || 'center' }}
                      />
                    ) : (
                      <Music size={40} className="sm:w-12 sm:h-12 text-gray-400" />
                    )}
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg text-gray-800 mb-1 truncate">{audiobook.name}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm truncate">{audiobook.author || 'Unknown Author'}</p>
                  <div className="mt-3 sm:mt-4 flex items-center justify-between text-xs sm:text-sm text-gray-500">
                    <span>{audiobook.track_count || 0} tracks</span>
                    <span className="hidden sm:inline">{new Date(audiobook.created_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {audiobook.track_count > 0 && (
                    <button
                      onClick={(e) => handleGetEmbedCode(e, audiobook)}
                      className="p-1.5 sm:p-2 bg-white/90 hover:bg-white border border-gray-200 rounded-lg transition-all shadow-lg touch-manipulation"
                      title="Get embed code"
                    >
                      <Code size={16} className="sm:w-[18px] sm:h-[18px] text-gray-700" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDeleteAudiobook(e, audiobook.id)}
                    className="p-1.5 sm:p-2 bg-white/90 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-all shadow-lg touch-manipulation"
                    title="Delete audiobook"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px] text-red-600" />
                  </button>
                </div>
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
