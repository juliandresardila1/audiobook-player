import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { X, Upload, Save, Move } from 'lucide-react'

export default function AudiobookForm({ audiobook, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    author: '',
    description: '',
    created_date: new Date().toISOString().split('T')[0],
    thumbnail_position: 'center'
  })
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const imagePreviewRef = useRef(null)

  useEffect(() => {
    if (audiobook) {
      setFormData({
        name: audiobook.name || '',
        author: audiobook.author || '',
        description: audiobook.description || '',
        created_date: audiobook.created_date || new Date().toISOString().split('T')[0],
        thumbnail_position: audiobook.thumbnail_position || 'center'
      })
      if (audiobook.thumbnail_url) {
        setThumbnailPreview(audiobook.thumbnail_url)
      }
    }
  }, [audiobook])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImagePositionChange = (e) => {
    if (!imagePreviewRef.current || !isDraggingImage) return

    const rect = imagePreviewRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x))
    const clampedY = Math.max(0, Math.min(100, y))

    setFormData(prev => ({
      ...prev,
      thumbnail_position: `${clampedX.toFixed(1)}% ${clampedY.toFixed(1)}%`
    }))
  }

  const handleImageMouseDown = (e) => {
    e.preventDefault()
    setIsDraggingImage(true)
    handleImagePositionChange(e)
  }

  const handleImageMouseMove = (e) => {
    if (isDraggingImage) {
      handleImagePositionChange(e)
    }
  }

  const handleImageMouseUp = () => {
    setIsDraggingImage(false)
  }

  useEffect(() => {
    if (isDraggingImage) {
      window.addEventListener('mousemove', handleImageMouseMove)
      window.addEventListener('mouseup', handleImageMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleImageMouseMove)
        window.removeEventListener('mouseup', handleImageMouseUp)
      }
    }
  }, [isDraggingImage])

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }

      setThumbnailFile(file)
      setThumbnailPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const uploadThumbnail = async (audiobookId) => {
    if (!thumbnailFile) return null

    try {
      const fileExt = thumbnailFile.name.split('.').pop()
      const fileName = `${audiobookId}-${Date.now()}.${fileExt}`
      const filePath = `audiobook-thumbnails/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, thumbnailFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('Error uploading thumbnail:', err)
      throw err
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Audiobook name is required')
        setLoading(false)
        return
      }

      if (audiobook) {
        // Update existing audiobook
        let updateData = { ...formData }

        // Upload new thumbnail if changed
        if (thumbnailFile) {
          const thumbnailUrl = await uploadThumbnail(audiobook.id)
          updateData.thumbnail_url = thumbnailUrl
        }

        const { error: updateError } = await supabase
          .from('audiobooks')
          .update(updateData)
          .eq('id', audiobook.id)

        if (updateError) throw updateError

        onSave({ ...audiobook, ...updateData })
      } else {
        // Create new audiobook
        const { data: newAudiobook, error: insertError } = await supabase
          .from('audiobooks')
          .insert([formData])
          .select()
          .single()

        if (insertError) throw insertError

        // Upload thumbnail if provided
        if (thumbnailFile) {
          const thumbnailUrl = await uploadThumbnail(newAudiobook.id)

          const { error: updateError } = await supabase
            .from('audiobooks')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('id', newAudiobook.id)

          if (updateError) throw updateError

          newAudiobook.thumbnail_url = thumbnailUrl
        }

        onSave(newAudiobook)
      }

      onClose()
    } catch (err) {
      console.error('Error saving audiobook:', err)
      setError(err.message || 'Failed to save audiobook')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-dark p-8 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {audiobook ? 'Edit Audiobook' : 'New Audiobook'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-smooth"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thumbnail (optional)
            </label>
            <div className="flex items-start gap-4">
              {thumbnailPreview ? (
                <div className="space-y-3">
                  <div
                    ref={imagePreviewRef}
                    className="relative w-32 h-32 rounded-xl overflow-hidden cursor-move border-2 border-primary-300"
                    onMouseDown={handleImageMouseDown}
                  >
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover pointer-events-none select-none"
                      style={{ objectPosition: formData.thumbnail_position }}
                      draggable={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
                        <Move size={16} className="text-primary-600" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailFile(null)
                        setThumbnailPreview(null)
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-smooth pointer-events-auto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 max-w-[128px]">
                    <Move size={12} className="inline mr-1" />
                    Click and drag to position
                  </div>
                </div>
              ) : (
                <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-smooth">
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-xs text-gray-600">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  Recommended: Square image (1:1 ratio), at least 500x500px. Max 5MB.
                </p>
                {thumbnailPreview && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Quick Presets
                    </label>
                    <div className="grid grid-cols-3 gap-1 max-w-[140px]">
                      {['top', 'center', 'bottom'].map((vPos) => (
                        ['left', 'center', 'right'].map((hPos) => {
                          const position = vPos === 'center' && hPos === 'center' ? 'center' : `${vPos} ${hPos}`
                          return (
                            <button
                              key={position}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, thumbnail_position: position }))}
                              className={`w-10 h-10 border-2 rounded transition-smooth ${
                                formData.thumbnail_position === position
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-300 hover:border-primary-300'
                              }`}
                              title={position}
                            >
                              <div className={`w-full h-full flex items-${vPos === 'top' ? 'start' : vPos === 'bottom' ? 'end' : 'center'} justify-${hPos === 'left' ? 'start' : hPos === 'right' ? 'end' : 'center'}`}>
                                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                              </div>
                            </button>
                          )
                        })
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Position: {formData.thumbnail_position}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Audiobook Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input-primary"
              placeholder="Enter audiobook name"
              required
            />
          </div>

          {/* Author */}
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
              Author
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleInputChange}
              className="input-primary"
              placeholder="Enter author name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input-primary min-h-[100px] resize-y"
              placeholder="Enter a description for this audiobook"
              rows={4}
            />
          </div>

          {/* Created Date */}
          <div>
            <label htmlFor="created_date" className="block text-sm font-medium text-gray-700 mb-2">
              Publication Date
            </label>
            <input
              type="date"
              id="created_date"
              name="created_date"
              value={formData.created_date}
              onChange={handleInputChange}
              className="input-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {audiobook ? 'Update Audiobook' : 'Create Audiobook'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
