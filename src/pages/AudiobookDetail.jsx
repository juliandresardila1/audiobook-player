import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, Edit2, Trash2, Music, Upload, GripVertical, Code } from 'lucide-react'
import { formatTime } from '../utils/audioUtils'
import AudiobookForm from '../components/AudiobookForm'
import UploadAudio from '../components/UploadAudio'
import AudioPlayer from '../components/AudioPlayer'
import EmbedCodeModal from '../components/EmbedCodeModal'

export default function AudiobookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [audiobook, setAudiobook] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEmbedModal, setShowEmbedModal] = useState(false)
  const [draggedTrack, setDraggedTrack] = useState(null)

  useEffect(() => {
    loadAudiobookData()
  }, [id])

  const loadAudiobookData = async () => {
    try {
      setLoading(true)

      // Load audiobook
      const { data: audiobookData, error: audiobookError } = await supabase
        .from('audiobooks')
        .select('*')
        .eq('id', id)
        .single()

      if (audiobookError) throw audiobookError
      setAudiobook(audiobookData)

      // Load tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('audiobook_id', id)
        .order('track_number', { ascending: true })

      if (tracksError) throw tracksError
      setTracks(tracksData || [])
    } catch (err) {
      console.error('Error loading audiobook:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAudiobook = (updatedAudiobook) => {
    setAudiobook(updatedAudiobook)
  }

  const handleDeleteTrack = async (trackId) => {
    if (!confirm('Are you sure you want to delete this track?')) return

    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId)

      if (error) throw error

      setTracks(prev => prev.filter(t => t.id !== trackId))
    } catch (err) {
      console.error('Error deleting track:', err)
      alert('Failed to delete track')
    }
  }

  const handleDragStart = (e, track) => {
    setDraggedTrack(track)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetTrack) => {
    e.preventDefault()

    if (!draggedTrack || draggedTrack.id === targetTrack.id) return

    const draggedIndex = tracks.findIndex(t => t.id === draggedTrack.id)
    const targetIndex = tracks.findIndex(t => t.id === targetTrack.id)

    // Reorder tracks array
    const newTracks = [...tracks]
    newTracks.splice(draggedIndex, 1)
    newTracks.splice(targetIndex, 0, draggedTrack)

    // Update track numbers
    const updatedTracks = newTracks.map((track, index) => ({
      ...track,
      track_number: index + 1
    }))

    setTracks(updatedTracks)
    setDraggedTrack(null)

    // Update database
    try {
      const updates = updatedTracks.map(track => ({
        id: track.id,
        track_number: track.track_number
      }))

      for (const update of updates) {
        await supabase
          .from('tracks')
          .update({ track_number: update.track_number })
          .eq('id', update.id)
      }
    } catch (err) {
      console.error('Error updating track order:', err)
      loadAudiobookData() // Reload on error
    }
  }

  const handleDragEnd = () => {
    setDraggedTrack(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!audiobook) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-dark p-8 rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Audiobook not found</h2>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            <ArrowLeft size={20} className="inline mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-smooth mb-4"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="flex items-start gap-6">
          {/* Thumbnail */}
          <div className="w-48 h-48 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {audiobook.thumbnail_url ? (
              <img
                src={audiobook.thumbnail_url}
                alt={audiobook.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music size={64} className="text-gray-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{audiobook.name}</h1>
            {audiobook.author && (
              <p className="text-xl text-gray-600 mb-4">{audiobook.author}</p>
            )}
            {audiobook.description && (
              <p className="text-gray-700 mb-4">{audiobook.description}</p>
            )}

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>{tracks.length} tracks</span>
              <span>{formatTime(audiobook.total_duration || 0)}</span>
              <span>Created {new Date(audiobook.created_date).toLocaleDateString()}</span>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => setShowEditForm(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit2 size={18} />
                Edit Details
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Upload size={18} />
                Upload Tracks
              </button>
              {tracks.length > 0 && (
                <button
                  onClick={() => setShowEmbedModal(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Code size={18} />
                  Get Embed Code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {tracks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Player</h2>
          <div className="max-w-3xl mx-auto">
            <AudioPlayer
              audiobook={audiobook}
              tracks={tracks}
              compact={false}
              autoplay={false}
            />
          </div>
        </section>
      )}

      {/* Tracks Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Track Management</h2>

        {tracks.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center">
            <Music size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No tracks yet</h3>
            <p className="text-gray-600 mb-6">Upload audio files to get started</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary"
            >
              <Upload size={20} className="inline mr-2" />
              Upload Tracks
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                draggable
                onDragStart={(e) => handleDragStart(e, track)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, track)}
                onDragEnd={handleDragEnd}
                className={`glass p-4 rounded-xl flex items-center gap-4 cursor-move transition-smooth hover:bg-white/80 hover:shadow-lg ${
                  draggedTrack?.id === track.id ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <GripVertical size={20} className="text-gray-400 flex-shrink-0" />

                {/* Track Number */}
                <div className="w-8 text-center text-gray-600 font-medium flex-shrink-0">
                  {track.track_number}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 truncate">{track.name}</h3>
                  {track.chapter_title && (
                    <p className="text-sm text-gray-600 truncate">{track.chapter_title}</p>
                  )}
                </div>

                {/* Duration */}
                <div className="text-sm text-gray-600 flex-shrink-0">
                  {formatTime(track.duration || 0)}
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleDeleteTrack(track.id)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-smooth text-red-600 flex-shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Form Modal */}
      {showEditForm && (
        <AudiobookForm
          audiobook={audiobook}
          onClose={() => setShowEditForm(false)}
          onSave={handleSaveAudiobook}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadAudio
          audiobookId={id}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            loadAudiobookData()
            setShowUploadModal(false)
          }}
        />
      )}

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <EmbedCodeModal
          audiobook={audiobook}
          onClose={() => setShowEmbedModal(false)}
        />
      )}
    </div>
  )
}
