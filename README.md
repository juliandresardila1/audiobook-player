# Audiobook Player

A custom audiobook hosting platform with embeddable player for your website.

## Features

- 📚 Upload and manage audiobooks
- 🎵 Individual tracks and playlists
- 🎨 Custom metadata (name, author, date, thumbnails)
- 🔄 Drag-and-drop track reordering
- 🎮 Full-featured audio player
  - Play/pause, skip forward/back
  - Playback speed control (0.5x - 2x)
  - Volume control
  - Progress tracking (resume where you left off)
- 🌐 Embeddable player (iframe)
- 📋 Copy embed code for your website

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (PostgreSQL + Storage)
- **Hosting:** Netlify
- **Icons:** Lucide React

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase-schema.sql`
5. Click **Run** to create all tables and storage buckets

### 2. Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy your **Project URL**
3. Copy your **anon/public key**

### 3. Configure Environment Variables

1. Edit the `.env` file in the project root
2. Replace with your actual credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install and Run

```bash
# Install dependencies (already done)
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/          # React components
│   ├── AudioPlayer.jsx  # Main audio player component
│   ├── AudiobookCard.jsx
│   ├── TrackList.jsx
│   └── UploadAudio.jsx
├── pages/              # Route pages
│   ├── Dashboard.jsx   # Admin dashboard
│   └── EmbedPlayer.jsx # Embeddable player
├── lib/
│   └── supabase.js     # Supabase client
├── utils/
│   └── audioUtils.js   # Audio utilities
└── App.jsx             # Main app with routing
```

## Database Schema

### Tables

**audiobooks**
- id, name, author, created_date
- thumbnail_url, description
- total_duration, track_count

**tracks**
- id, audiobook_id, name
- track_number, duration
- audio_url, file_size

**playlists**
- id, name, thumbnail_url
- description, is_public

**playlist_tracks**
- playlist_id, track_id, track_order

**playback_progress**
- audiobook_id, track_id
- progress_seconds, playback_speed
- session_id (for resume feature)

## Usage

### Admin Dashboard
1. Navigate to `/` (home)
2. Create a new audiobook
3. Upload tracks (MP3, max 150MB each)
4. Add metadata and thumbnail
5. Reorder tracks as needed
6. Click **Get Embed Code**

### Embedding in Your Website
```html
<iframe
  width="100%"
  height="400"
  frameborder="0"
  src="https://your-app.netlify.app/player/audiobook/abc-123">
</iframe>
```

## File Size Limits

- **Max file size:** 150MB per track
- **Format:** MP3 only
- Files exceeding 150MB will be rejected with an error message
- For compression, use external tools before uploading

## Deployment (Netlify)

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click **New site from Git**
4. Connect your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables in Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy!

## Next Steps

- [ ] Run `npm run dev` to start development
- [ ] Configure Supabase credentials in `.env`
- [ ] Test uploading an audiobook
- [ ] Customize player styling
- [ ] Deploy to Netlify

## Support

For issues or questions, refer to:
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
- [React Router Docs](https://reactrouter.com)
