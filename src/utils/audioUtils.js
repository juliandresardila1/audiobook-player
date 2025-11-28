/**
 * Format seconds to HH:MM:SS or MM:SS
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Get audio file metadata (duration, etc.)
 */
export function getAudioMetadata(file) {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve({
        duration: Math.floor(audio.duration),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      })
    })

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load audio metadata'))
    })

    audio.src = url
  })
}

/**
 * Compress audio file if it exceeds 150MB
 * Note: True compression requires server-side processing with ffmpeg
 * This is a placeholder for client-side validation
 */
export async function compressAudioIfNeeded(file) {
  const MAX_SIZE_MB = 150
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

  if (file.size <= MAX_SIZE_BYTES) {
    return { file, compressed: false }
  }

  // For now, we'll reject files over 150MB
  // In production, you'd send to a server endpoint for ffmpeg compression
  throw new Error(`File size (${formatFileSize(file.size)}) exceeds ${MAX_SIZE_MB}MB limit. Please compress the file before uploading.`)
}

/**
 * Generate unique session ID for progress tracking
 */
export function getSessionId() {
  let sessionId = localStorage.getItem('audiobook_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('audiobook_session_id', sessionId)
  }
  return sessionId
}
