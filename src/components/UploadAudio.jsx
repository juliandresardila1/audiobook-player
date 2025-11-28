import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { uploadToR2, generateR2Key } from '../lib/r2'
import { X, Upload, FileAudio, Trash2, Check } from 'lucide-react'
import { getAudioMetadata, compressAudioIfNeeded, formatFileSize } from '../utils/audioUtils'

export default function UploadAudio({ audiobookId, onClose, onUploadComplete }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({})
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files || [])

    // Filter and validate MP3 files
    const mp3Files = selectedFiles.filter(file => {
      if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
        alert(`${file.name} is not an MP3 file. Only MP3 files are supported.`)
        return false
      }
      return true
    })

    // Process files and extract metadata
    const processedFiles = await Promise.all(
      mp3Files.map(async (file, index) => {
        try {
          // Check file size
          const isValid = await compressAudioIfNeeded(file)
          if (!isValid) {
            alert(`${file.name} exceeds 150MB. Please compress the file and try again.`)
            return null
          }

          // Extract metadata
          const metadata = await getAudioMetadata(file)

          // Auto-extract track name from filename
          const trackName = file.name
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/_/g, ' ') // Replace underscores with spaces
            .replace(/^\d+[-.\s]*/, '') // Remove leading numbers like "01 - " or "01. "
            .trim()

          return {
            id: `${Date.now()}-${index}`,
            file,
            name: trackName,
            duration: metadata.duration || 0,
            size: file.size,
            status: 'pending', // pending, uploading, complete, error
            progress: 0,
            error: null
          }
        } catch (err) {
          console.error('Error processing file:', file.name, err)
          return null
        }
      })
    )

    // Add valid files to list
    const validFiles = processedFiles.filter(f => f !== null)
    setFiles(prev => [...prev, ...validFiles])
  }

  const handleRemoveFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleNameChange = (fileId, newName) => {
    setFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, name: newName } : f)
    )
  }

  const uploadFile = async (fileData, trackNumber) => {
    try {
      // Update status to uploading
      setFiles(prev =>
        prev.map(f => f.id === fileData.id ? { ...f, status: 'uploading' } : f)
      )

      // Upload to Cloudflare R2
      const fileExt = 'mp3'
      const r2Key = generateR2Key(audiobookId, trackNumber, fileExt)

      // Upload with progress tracking
      const publicUrl = await uploadToR2(fileData.file, r2Key, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        setProgress(prev => ({ ...prev, [fileData.id]: percentCompleted }))
      })

      // Create track record in database
      const { error: dbError } = await supabase
        .from('tracks')
        .insert([{
          audiobook_id: audiobookId,
          name: fileData.name,
          track_number: trackNumber,
          duration: Math.round(fileData.duration),
          audio_url: publicUrl,
          file_size: fileData.size
        }])

      if (dbError) throw dbError

      // Update status to complete
      setFiles(prev =>
        prev.map(f => f.id === fileData.id ? { ...f, status: 'complete' } : f)
      )

      return true
    } catch (err) {
      console.error('Error uploading file:', err)

      setFiles(prev =>
        prev.map(f =>
          f.id === fileData.id
            ? { ...f, status: 'error', error: err.message }
            : f
        )
      )

      return false
    }
  }

  const handleUploadAll = async () => {
    if (files.length === 0) return

    setUploading(true)

    try {
      // Get current max track number
      const { data: existingTracks, error: tracksError } = await supabase
        .from('tracks')
        .select('track_number')
        .eq('audiobook_id', audiobookId)
        .order('track_number', { ascending: false })
        .limit(1)

      if (tracksError) throw tracksError

      let nextTrackNumber = existingTracks.length > 0
        ? existingTracks[0].track_number + 1
        : 1

      // Upload files sequentially
      for (const fileData of files) {
        if (fileData.status === 'pending' || fileData.status === 'error') {
          await uploadFile(fileData, nextTrackNumber)
          nextTrackNumber++
        }
      }

      // Check if all uploads succeeded
      const allComplete = files.every(f => f.status === 'complete')

      if (allComplete) {
        setTimeout(() => {
          onUploadComplete()
          onClose()
        }, 500)
      }
    } catch (err) {
      console.error('Error during upload:', err)
      alert('Failed to upload tracks. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <Check size={20} className="text-green-400" />
      case 'error':
        return <X size={20} className="text-red-400" />
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      default:
        return <FileAudio size={20} className="text-gray-400" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Upload Audio Tracks</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-white/10 rounded-lg transition-smooth disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Upload Area */}
        <div className="mb-6">
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-300 rounded-xl p-12 text-center transition-smooth ${
              uploading
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:border-primary-500 hover:bg-primary-50'
            }`}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-2">
              Drop MP3 files here or click to browse
            </p>
            <p className="text-sm text-gray-600">
              Maximum file size: 150MB per file. Files will be uploaded in the order shown.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,.mp3"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Files to Upload ({files.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {files.map((fileData, index) => (
                <div
                  key={fileData.id}
                  className="glass p-4 rounded-xl flex items-center gap-4 relative overflow-hidden"
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(fileData.status)}
                  </div>

                  {/* Track Number */}
                  <div className="w-8 text-center text-gray-600 font-medium flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Track Name Input */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={fileData.name}
                      onChange={(e) => handleNameChange(fileData.id, e.target.value)}
                      disabled={uploading}
                      className="w-full bg-white/70 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white disabled:opacity-50"
                      placeholder="Track name"
                    />
                    {fileData.error && (
                      <p className="text-xs text-red-400 mt-1">{fileData.error}</p>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="text-sm text-gray-600 flex-shrink-0 text-right min-w-[80px]">
                    <div>{formatFileSize(fileData.size)}</div>
                    {fileData.status === 'uploading' && (
                      <div className="text-xs text-primary-400 font-medium">
                        {progress[fileData.id] || 0}%
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {fileData.status === 'uploading' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-300 ease-out"
                        style={{ width: `${progress[fileData.id] || 0}%` }}
                      />
                    </div>
                  )}

                  {/* Remove Button */}
                  {!uploading && fileData.status !== 'complete' && (
                    <button
                      onClick={() => handleRemoveFile(fileData.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-smooth text-red-600 flex-shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleUploadAll}
            disabled={files.length === 0 || uploading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload {files.length} Track{files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={uploading}
            className="btn-secondary"
          >
            {uploading ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
