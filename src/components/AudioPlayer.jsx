import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react'
import { formatTime } from '../utils/audioUtils'
import { supabase } from '../lib/supabase'

export default function AudioPlayer({ audiobook, tracks, compact = false, autoplay = false }) {
  const audioRef = useRef(null)
  const progressBarRef = useRef(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentTrack = tracks[currentTrackIndex]
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      handleNext()
    }

    const handleError = (e) => {
      console.error('Audio error:', e)
      setError('Failed to load audio. Please try again.')
      setIsLoading(false)
      setIsPlaying(false)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [])

  // Load track when currentTrackIndex changes
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return

    const audio = audioRef.current
    const wasPlaying = !audio.paused

    setIsLoading(true)
    setError(null)
    audio.src = currentTrack.audio_url
    audio.load()

    if (wasPlaying || (autoplay && currentTrackIndex === 0)) {
      audio.play().catch(err => {
        console.error('Autoplay failed:', err)
        setIsPlaying(false)
      })
    }
  }, [currentTrackIndex, currentTrack, autoplay])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Play failed:', err)
          setError('Failed to play audio')
        })
    }
  }

  const handleNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(prev => prev + 1)
    } else {
      // Loop back to first track
      setCurrentTrackIndex(0)
      setIsPlaying(false)
    }
  }

  const handlePrevious = () => {
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      audioRef.current.currentTime = 0
    } else if (currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1)
    }
  }

  const handleSeek = (e) => {
    if (!audioRef.current || !progressBarRef.current) return

    const rect = progressBarRef.current.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const newTime = pos * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleSkipForward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(currentTime + 10, duration)
  }

  const handleSkipBackward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(currentTime - 10, 0)
  }

  const handleTrackClick = (index) => {
    setCurrentTrackIndex(index)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (newVolume > 0) setIsMuted(false)
  }

  const cycleSpeed = () => {
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setPlaybackSpeed(speeds[nextIndex])
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!tracks || tracks.length === 0) {
    return (
      <div className="glass p-8 rounded-2xl text-center">
        <p className="text-gray-600">No tracks available</p>
      </div>
    )
  }

  return (
    <div className={`glass rounded-2xl overflow-hidden ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}`}>
      {/* Album Art & Track Info */}
      <div className={`flex items-center gap-2 sm:gap-3 md:gap-4 ${compact ? 'mb-3 sm:mb-4' : 'mb-4 sm:mb-6'}`}>
        <div className={`bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${compact ? 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16' : 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20'}`}>
          {audiobook?.thumbnail_url ? (
            <img
              src={audiobook.thumbnail_url}
              alt={audiobook.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: audiobook?.thumbnail_position || 'center' }}
            />
          ) : (
            <div className="text-xl sm:text-2xl">🎵</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-gray-800 truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base md:text-lg'}`}>
            {currentTrack?.name || 'No track selected'}
          </h3>
          {audiobook?.author && (
            <p className={`text-gray-600 truncate ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
              {audiobook.author}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            Track {currentTrackIndex + 1} of {tracks.length}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-3 sm:mb-4">
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="h-2.5 sm:h-2 bg-gray-200 rounded-full cursor-pointer group relative touch-manipulation"
        >
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all group-hover:h-3"
            style={{ width: `${progress}%` }}
          />
          {/* Progress indicator dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5 sm:mt-2">
          <span className="text-xs text-gray-600">{formatTime(currentTime)}</span>
          <span className="text-xs text-gray-600">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        {/* Skip Backward 10s */}
        <button
          onClick={handleSkipBackward}
          className="p-2 sm:p-2.5 hover:bg-white/50 rounded-lg transition-smooth text-gray-700 touch-manipulation active:scale-95"
          title="Rewind 10 seconds"
        >
          <RotateCcw size={20} className="sm:w-5 sm:h-5" />
        </button>

        {/* Previous Track */}
        <button
          onClick={handlePrevious}
          disabled={currentTrackIndex === 0 && currentTime < 3}
          className="p-2 sm:p-2.5 hover:bg-white/50 rounded-lg transition-smooth text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
          title="Previous track"
        >
          <SkipBack size={22} className="sm:w-6 sm:h-6" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 rounded-full text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 touch-manipulation active:scale-95"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={22} fill="white" className="sm:w-6 sm:h-6" />
          ) : (
            <Play size={22} fill="white" className="ml-1 sm:w-6 sm:h-6" />
          )}
        </button>

        {/* Next Track */}
        <button
          onClick={handleNext}
          disabled={currentTrackIndex === tracks.length - 1}
          className="p-2 sm:p-2.5 hover:bg-white/50 rounded-lg transition-smooth text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
          title="Next track"
        >
          <SkipForward size={22} className="sm:w-6 sm:h-6" />
        </button>

        {/* Skip Forward 10s */}
        <button
          onClick={handleSkipForward}
          className="p-2 sm:p-2.5 hover:bg-white/50 rounded-lg transition-smooth text-gray-700 touch-manipulation active:scale-95"
          title="Forward 10 seconds"
        >
          <RotateCw size={20} className="sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Additional Controls */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-1 max-w-[160px] sm:max-w-[200px] md:max-w-xs">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-white/50 rounded-lg transition-smooth text-gray-700 flex-shrink-0 touch-manipulation active:scale-95"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={20} className="sm:w-5 sm:h-5" />
            ) : (
              <Volume2 size={20} className="sm:w-5 sm:h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1.5 sm:h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider touch-manipulation"
            aria-label="Volume"
          />
        </div>

        {/* Playback Speed */}
        <button
          onClick={cycleSpeed}
          className="px-3 py-2 sm:px-3.5 sm:py-2 bg-white/70 hover:bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-smooth flex-shrink-0 touch-manipulation active:scale-95 min-w-[3rem]"
          title="Playback speed"
          aria-label={`Playback speed: ${playbackSpeed}x`}
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Track List */}
      {!compact && tracks.length > 1 && (
        <div className="border-t border-gray-200 pt-3 sm:pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Tracks</h4>
          <div className="max-h-56 sm:max-h-64 md:max-h-96 overflow-y-auto custom-scrollbar space-y-1">
            {tracks.map((track, index) => (
              <button
                key={track.id}
                onClick={() => handleTrackClick(index)}
                className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg text-left transition-smooth touch-manipulation active:scale-[0.98] ${
                  index === currentTrackIndex
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-white/50'
                }`}
              >
                <span className={`text-xs sm:text-sm font-medium flex-shrink-0 w-5 sm:w-6 ${
                  index === currentTrackIndex ? 'text-primary-600' : 'text-gray-500'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm truncate ${
                    index === currentTrackIndex ? 'text-primary-800 font-medium' : 'text-gray-700'
                  }`}>
                    {track.name}
                  </p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(track.duration)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
