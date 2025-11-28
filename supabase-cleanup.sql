-- Clean up script - Run this FIRST to remove existing tables and policies
-- Then run the supabase-schema.sql file

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access to audiobooks" ON audiobooks;
DROP POLICY IF EXISTS "Public write access to audiobooks" ON audiobooks;
DROP POLICY IF EXISTS "Public read access to tracks" ON tracks;
DROP POLICY IF EXISTS "Public write access to tracks" ON tracks;
DROP POLICY IF EXISTS "Public read access to playlists" ON playlists;
DROP POLICY IF EXISTS "Public write access to playlists" ON playlists;
DROP POLICY IF EXISTS "Public read access to playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Public write access to playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Public read access to playback_progress" ON playback_progress;
DROP POLICY IF EXISTS "Public write access to playback_progress" ON playback_progress;

-- Drop existing tables (CASCADE will remove all related data)
DROP TABLE IF EXISTS playback_progress CASCADE;
DROP TABLE IF EXISTS playlist_tracks CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS audiobooks CASCADE;

-- Drop storage bucket
DELETE FROM storage.buckets WHERE id = 'audiobook-files';

-- Success message
SELECT 'Database cleaned successfully! Now run supabase-schema.sql' AS message;
