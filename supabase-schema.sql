-- Audiobook Player Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Audiobooks table
CREATE TABLE IF NOT EXISTS audiobooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  author TEXT,
  created_date DATE DEFAULT CURRENT_DATE,
  thumbnail_url TEXT,
  description TEXT,
  total_duration INTEGER DEFAULT 0, -- Total duration in seconds
  track_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audiobook_id UUID REFERENCES audiobooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  track_number INTEGER NOT NULL,
  duration INTEGER, -- Duration in seconds
  audio_url TEXT NOT NULL,
  file_size BIGINT, -- File size in bytes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(audiobook_id, track_number)
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playlist tracks junction table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  track_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, track_id),
  UNIQUE(playlist_id, track_order)
);

-- Playback progress tracking
CREATE TABLE IF NOT EXISTS playback_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audiobook_id UUID REFERENCES audiobooks(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  progress_seconds REAL DEFAULT 0, -- Current position in seconds
  playback_speed REAL DEFAULT 1.0, -- Playback speed (1.0, 1.5, 2.0, etc.)
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT, -- Browser session identifier
  UNIQUE(audiobook_id, session_id)
);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_audiobooks_updated_at ON audiobooks;
CREATE TRIGGER update_audiobooks_updated_at
  BEFORE UPDATE ON audiobooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update audiobook total_duration and track_count
CREATE OR REPLACE FUNCTION update_audiobook_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE audiobooks
  SET
    total_duration = (
      SELECT COALESCE(SUM(duration), 0)
      FROM tracks
      WHERE audiobook_id = COALESCE(NEW.audiobook_id, OLD.audiobook_id)
    ),
    track_count = (
      SELECT COUNT(*)
      FROM tracks
      WHERE audiobook_id = COALESCE(NEW.audiobook_id, OLD.audiobook_id)
    )
  WHERE id = COALESCE(NEW.audiobook_id, OLD.audiobook_id);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update audiobook stats when tracks change
DROP TRIGGER IF EXISTS update_audiobook_stats_trigger ON tracks;
CREATE TRIGGER update_audiobook_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tracks
  FOR EACH ROW EXECUTE FUNCTION update_audiobook_stats();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public access to audio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update audio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete audio files" ON storage.objects;

DROP POLICY IF EXISTS "Public access to thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete thumbnails" ON storage.objects;

-- Storage policies for audio files (public access for embedding)
CREATE POLICY "Public access to audio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-files');

CREATE POLICY "Anyone can upload audio files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Anyone can update audio files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'audio-files');

CREATE POLICY "Anyone can delete audio files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audio-files');

-- Storage policies for thumbnails (public access for embedding)
CREATE POLICY "Public access to thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can upload thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can update thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can delete thumbnails"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thumbnails');

-- Enable Row Level Security (but allow public access for single-user app)
ALTER TABLE audiobooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress ENABLE ROW LEVEL SECURITY;

-- Public access policies (since it's single-user and public embeds)
DROP POLICY IF EXISTS "Public read access to audiobooks" ON audiobooks;
CREATE POLICY "Public read access to audiobooks"
  ON audiobooks FOR SELECT
  USING (true);

CREATE POLICY "Public write access to audiobooks"
  ON audiobooks FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Public read access to tracks" ON tracks;
CREATE POLICY "Public read access to tracks"
  ON tracks FOR SELECT
  USING (true);

CREATE POLICY "Public write access to tracks"
  ON tracks FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Public read access to playlists" ON playlists;
CREATE POLICY "Public read access to playlists"
  ON playlists FOR SELECT
  USING (true);

CREATE POLICY "Public write access to playlists"
  ON playlists FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Public access to playlist_tracks" ON playlist_tracks;
CREATE POLICY "Public access to playlist_tracks"
  ON playlist_tracks FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Public access to playback_progress" ON playback_progress;
CREATE POLICY "Public access to playback_progress"
  ON playback_progress FOR ALL
  USING (true);
