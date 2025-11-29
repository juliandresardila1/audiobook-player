import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, Edit2, Trash2, Music, Upload, GripVertical, Code, Save, Check } from 'lucide-react'
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingTrackId, setEditingTrackId] = useState(null)
  const [editingTrackName, setEditingTrackName] = useState('')
  const [longPressTimer, setLongPressTimer] = useState(null)
  const [isDraggingMobile, setIsDraggingMobile] = useState(false)

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

  const handleDrop = (e, targetTrack) => {
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
    setHasUnsavedChanges(true)
  }

  const handleSaveTrackOrder = async () => {
    setIsSaving(true)
    try {
      console.log('Starting to save track order...', tracks.map(t => ({ id: t.id, track_number: t.track_number })))

      // STEP 1: Set all tracks to temporary negative numbers to avoid unique constraint conflicts
      const tempUpdates = tracks.map((track, index) =>
        supabase
          .from('tracks')
          .update({ track_number: -(index + 1) })
          .eq('id', track.id)
      )

      const tempResults = await Promise.all(tempUpdates)
      const tempErrors = tempResults.filter(result => result.error)
      if (tempErrors.length > 0) {
        console.error('❌ Errors setting temporary track numbers:', tempErrors)
        throw new Error('Failed to set temporary track numbers')
      }

      console.log('Step 1: Set temporary numbers ✓')

      // STEP 2: Update all tracks to their final track numbers
      const finalUpdates = tracks.map(track =>
        supabase
          .from('tracks')
          .update({ track_number: track.track_number })
          .eq('id', track.id)
      )

      const finalResults = await Promise.all(finalUpdates)
      const finalErrors = finalResults.filter(result => result.error)
      if (finalErrors.length > 0) {
        console.error('❌ Errors setting final track numbers:', finalErrors)
        throw new Error('Failed to set final track numbers')
      }

      console.log('Step 2: Set final numbers ✓')
      console.log('✅ Track order saved successfully!')
      setHasUnsavedChanges(false)

      // Reload data to confirm the save worked
      await loadAudiobookData()

      // Show success feedback briefly
      setTimeout(() => {
        setIsSaving(false)
      }, 1500)
    } catch (err) {
      console.error('❌ Error updating track order:', err)
      console.error('Error stack:', err.stack)
      alert(`Failed to save track order: ${err.message || 'Unknown error'}`)
      setIsSaving(false)
      loadAudiobookData() // Reload on error
    }
  }

  const handleEditTrack = (track) => {
    setEditingTrackId(track.id)
    setEditingTrackName(track.name)
  }

  const handleSaveTrackName = async (trackId) => {
    if (!editingTrackName.trim()) {
      alert('Track name cannot be empty')
      return
    }

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ name: editingTrackName.trim() })
        .eq('id', trackId)

      if (error) throw error

      setTracks(prev => prev.map(t =>
        t.id === trackId ? { ...t, name: editingTrackName.trim() } : t
      ))
      setEditingTrackId(null)
      setEditingTrackName('')
    } catch (err) {
      console.error('Error updating track name:', err)
      alert('Failed to update track name')
    }
  }

  const handleCancelEdit = () => {
    setEditingTrackId(null)
    setEditingTrackName('')
  }

  const handleDragEnd = () => {
    setDraggedTrack(null)
  }

  // Touch event handlers for mobile - long press to drag
  const handleTouchStart = (e, track) => {
    // Only on drag handle
    if (!e.target.closest('.drag-handle')) return

    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer)
    }

    // Start long press timer (500ms)
    const timer = setTimeout(() => {
      setDraggedTrack(track)
      setIsDraggingMobile(true)
      setLongPressTimer(null) // Clear timer after it fires
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 500)

    setLongPressTimer(timer)
  }

  const handleTouchMove = (e) => {
    // If dragging is active, allow movement
    if (isDraggingMobile && draggedTrack) {
      // Prevent scrolling while dragging
      e.preventDefault()

      const touch = e.touches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const trackElement = element?.closest('[data-track-id]')

      if (trackElement) {
        const targetTrackId = trackElement.getAttribute('data-track-id')
        const targetTrack = tracks.find(t => t.id === targetTrackId)

        if (targetTrack && targetTrack.id !== draggedTrack.id) {
          const draggedIndex = tracks.findIndex(t => t.id === draggedTrack.id)
          const targetIndex = tracks.findIndex(t => t.id === targetTrack.id)

          const newTracks = [...tracks]
          newTracks.splice(draggedIndex, 1)
          newTracks.splice(targetIndex, 0, draggedTrack)

          const updatedTracks = newTracks.map((track, index) => ({
            ...track,
            track_number: index + 1
          }))

          setTracks(updatedTracks)
          setHasUnsavedChanges(true)
        }
      }
    } else if (longPressTimer) {
      // Cancel long press if user moves before timer completes
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleTouchEnd = () => {
    // Clear timer if touch ended before long press completed
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    setDraggedTrack(null)
    setIsDraggingMobile(false)
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-smooth mb-4 text-sm sm:text-base"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Thumbnail */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {audiobook.thumbnail_url ? (
              <img
                src={audiobook.thumbnail_url}
                alt={audiobook.name}
                className="w-full h-full object-cover"
                style={{ objectPosition: audiobook.thumbnail_position || 'center' }}
              />
            ) : (
              <Music size={48} className="sm:w-16 sm:h-16 text-gray-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 break-words">
              {audiobook.name}
            </h1>
            {audiobook.author && (
              <p className="text-lg sm:text-xl text-gray-600 mb-3 sm:mb-4">{audiobook.author}</p>
            )}
            {audiobook.description && (
              <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">{audiobook.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-0">
              <span>{tracks.length} tracks</span>
              <span>{formatTime(audiobook.total_duration || 0)}</span>
              <span className="hidden sm:inline">Created {new Date(audiobook.created_date).toLocaleDateString()}</span>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setShowEditForm(true)}
                className="btn-secondary flex items-center gap-2 text-sm sm:text-base"
              >
                <Edit2 size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Edit Details</span>
                <span className="sm:hidden">Edit</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary flex items-center gap-2 text-sm sm:text-base"
              >
                <Upload size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Upload Tracks</span>
                <span className="sm:hidden">Upload</span>
              </button>
              {tracks.length > 0 && (
                <button
                  onClick={() => setShowEmbedModal(true)}
                  className="btn-secondary flex items-center gap-2 text-sm sm:text-base"
                >
                  <Code size={16} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Get Embed Code</span>
                  <span className="sm:hidden">Embed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {tracks.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Player</h2>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Track Management</h2>
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveTrackOrder}
              disabled={isSaving}
              className={`btn-primary flex items-center gap-2 ${isSaving ? 'opacity-75' : ''}`}
            >
              {isSaving ? (
                <>
                  <Check size={18} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Order
                </>
              )}
            </button>
          )}
        </div>

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
          <div className="max-w-3xl mx-auto space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                data-track-id={track.id}
                draggable={editingTrackId !== track.id}
                onDragStart={(e) => handleDragStart(e, track)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, track)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, track)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  transform: draggedTrack?.id === track.id && isDraggingMobile ? 'scale(1.05) rotate(2deg)' : 'none',
                  transition: draggedTrack?.id === track.id && isDraggingMobile ? 'none' : 'all 0.2s ease',
                }}
                className={`glass p-1.5 sm:p-2 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-smooth hover:bg-white/80 hover:shadow-lg select-none ${
                  draggedTrack?.id === track.id && isDraggingMobile ? 'opacity-70 shadow-2xl z-50 bg-white' : ''
                } ${editingTrackId === track.id ? '' : ''}`}
              >
                {/* Drag Handle */}
                <div
                  className={`drag-handle p-2 -m-2 cursor-move touch-manipulation rounded flex-shrink-0 transition-colors ${
                    draggedTrack?.id === track.id && isDraggingMobile ? 'bg-primary-100' : 'active:bg-primary-50'
                  }`}
                  title="Long press to drag"
                >
                  <GripVertical size={16} className={`transition-colors ${
                    draggedTrack?.id === track.id && isDraggingMobile ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                </div>

                {/* Track Number */}
                <div className="w-5 sm:w-7 text-center text-gray-600 font-medium flex-shrink-0 text-xs sm:text-sm">
                  {track.track_number}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  {editingTrackId === track.id ? (
                    <input
                      type="text"
                      value={editingTrackName}
                      onChange={(e) => setEditingTrackName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTrackName(track.id)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="w-full px-2 py-0.5 border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs sm:text-sm"
                      autoFocus
                    />
                  ) : (
                    <h3 className="font-medium text-gray-800 truncate text-xs sm:text-sm">
                      {track.name}
                    </h3>
                  )}
                  {track.chapter_title && editingTrackId !== track.id && (
                    <p className="text-xs text-gray-600 truncate">{track.chapter_title}</p>
                  )}
                </div>

                {/* Duration */}
                <div className="text-xs text-gray-600 flex-shrink-0">
                  {formatTime(track.duration || 0)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                  {editingTrackId === track.id ? (
                    <>
                      <button
                        onClick={() => handleSaveTrackName(track.id)}
                        className="p-1 sm:p-1.5 hover:bg-green-100 rounded transition-smooth text-green-600"
                        title="Save"
                      >
                        <Check size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 sm:p-1.5 hover:bg-gray-100 rounded transition-smooth text-gray-600"
                        title="Cancel"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditTrack(track)}
                        className="p-1 sm:p-1.5 hover:bg-blue-100 rounded transition-smooth text-blue-600"
                        title="Edit track name"
                      >
                        <Edit2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="p-1 sm:p-1.5 hover:bg-red-100 rounded transition-smooth text-red-600"
                        title="Delete track"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </>
                  )}
                </div>
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
