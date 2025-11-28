import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AudioPlayer from '../components/AudioPlayer'

export default function EmbedPlayer({ type }) {
  const { id } = useParams()
  const [audiobook, setAudiobook] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPlayerData()
  }, [id, type])

  const loadPlayerData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (type === 'audiobook') {
        // Load audiobook and its tracks
        const { data: audiobookData, error: audiobookError } = await supabase
          .from('audiobooks')
          .select('*')
          .eq('id', id)
          .single()

        if (audiobookError) throw audiobookError

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('*')
          .eq('audiobook_id', id)
          .order('track_number', { ascending: true })

        if (tracksError) throw tracksError

        setAudiobook(audiobookData)
        setTracks(tracksData || [])
      } else if (type === 'playlist') {
        // Load playlist and its tracks
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select('*')
          .eq('id', id)
          .single()

        if (playlistError) throw playlistError

        const { data: playlistTracksData, error: playlistTracksError } = await supabase
          .from('playlist_tracks')
          .select(`
            track_order,
            tracks (*)
          `)
          .eq('playlist_id', id)
          .order('track_order', { ascending: true })

        if (playlistTracksError) throw playlistTracksError

        // Extract tracks from the join result
        const tracksData = playlistTracksData.map(pt => pt.tracks)

        setAudiobook({
          id: playlistData.id,
          name: playlistData.name,
          author: null,
          thumbnail_url: playlistData.thumbnail_url,
          description: playlistData.description
        })
        setTracks(tracksData || [])
      }
    } catch (err) {
      console.error('Error loading player data:', err)
      setError(err.message || 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading player...</p>
        </div>
      </div>
    )
  }

  if (error || !audiobook) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-dark p-8 rounded-2xl text-center max-w-md">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Content Not Found</h2>
          <p className="text-gray-600">
            {error || `This ${type} could not be found or has been removed.`}
          </p>
        </div>
      </div>
    )
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-dark p-8 rounded-2xl text-center max-w-md">
          <div className="text-5xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Tracks Available</h2>
          <p className="text-gray-600">
            This {type} doesn't have any tracks yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <AudioPlayer
          audiobook={audiobook}
          tracks={tracks}
          compact={false}
          autoplay={false}
        />

        {/* Branding footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            Powered by Audiobook Player
          </p>
        </div>
      </div>
    </div>
  )
}
