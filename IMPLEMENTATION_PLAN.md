# Audiobook Player - Implementation Plan

## Overview
This plan outlines the complete implementation of the audiobook hosting platform with embeddable player functionality.

---

## Phase 1: Core Infrastructure & Routing ⚙️

### 1.1 Main App Setup
**File:** `src/App.jsx`

**Features:**
- React Router setup
- Routes:
  - `/` - Dashboard (admin interface)
  - `/player/:type/:id` - Embeddable player
    - `/player/audiobook/:audiobookId`
    - `/player/playlist/:playlistId`
- Global state management (if needed)
- Error boundaries

**Technical Notes:**
- Use BrowserRouter for admin, allow iframe embedding
- Minimal styling for embeddable player route
- Pass audiobook/playlist ID via URL params

---

## Phase 2: Admin Dashboard 📊

### 2.1 Dashboard Page Layout
**File:** `src/pages/Dashboard.jsx`

**Sections:**
1. **Header**
   - App title/logo
   - Quick stats (total audiobooks, total tracks)

2. **Audiobooks Grid**
   - Display all audiobooks as cards
   - "+ New Audiobook" button

3. **Playlists Section** (below audiobooks)
   - Display playlists
   - "+ New Playlist" button

**State Management:**
- Load audiobooks from Supabase
- Load playlists from Supabase
- Refresh on create/update/delete

---

### 2.2 Audiobook Card Component
**File:** `src/components/AudiobookCard.jsx`

**Display:**
- Thumbnail image
- Audiobook name
- Author
- Track count
- Total duration
- Created date

**Actions:**
- Click to view/edit
- Delete button (with confirmation)
- "Get Embed Code" button

**Props:**
```javascript
{
  audiobook: {
    id, name, author, created_date,
    thumbnail_url, track_count, total_duration
  },
  onEdit: () => {},
  onDelete: () => {},
  onGetEmbed: () => {}
}
```

---

### 2.3 Create/Edit Audiobook Modal
**File:** `src/components/AudiobookForm.jsx`

**Fields:**
- Name (required)
- Author
- Created Date (date picker)
- Description (textarea)
- Thumbnail upload

**Modes:**
- Create new audiobook
- Edit existing audiobook

**Validation:**
- Name is required
- Thumbnail size limit (5MB)

---

## Phase 3: Track Management 🎵

### 3.1 Track Upload Component
**File:** `src/components/UploadAudio.jsx`

**Features:**
- Drag-and-drop or click to upload
- Multiple file selection
- File validation:
  - Format: MP3 only
  - Size: Max 150MB per file
  - Auto-extract metadata (duration, title from filename)
- Upload progress bar
- Batch upload support

**Process Flow:**
1. User selects MP3 files
2. Validate each file
3. Extract metadata (duration)
4. Upload to Supabase Storage (`audio-files` bucket)
5. Create track record in database
6. Auto-increment track_number
7. Update audiobook stats

**Error Handling:**
- Show error for files > 150MB
- Show error for non-MP3 files
- Retry failed uploads

---

### 3.2 Track List Component
**File:** `src/components/TrackList.jsx`

**Features:**
- Display all tracks for an audiobook
- Sortable/reorderable (drag-and-drop)
- Track info: number, name, duration
- Edit track name inline
- Delete track (with confirmation)
- Play preview button

**Drag & Drop:**
- Use HTML5 drag-and-drop API
- Update track_number on reorder
- Persist to database

**Props:**
```javascript
{
  audiobookId: string,
  tracks: [],
  onReorder: (tracks) => {},
  onUpdate: (trackId, data) => {},
  onDelete: (trackId) => {}
}
```

---

## Phase 4: Audio Player 🎮

### 4.1 Main Audio Player Component
**File:** `src/components/AudioPlayer.jsx`

**UI Elements:**

**Top Section:**
- Album art / Thumbnail
- Current track name
- Author name

**Controls:**
```
[⏮️ Prev] [⏪ -10s] [▶️/⏸️ Play/Pause] [⏩ +10s] [⏭️ Next]
```

**Progress Bar:**
- Seekable timeline
- Current time / Total time
- Click to seek
- Drag to scrub

**Additional Controls:**
- 🔊 Volume slider
- ⚡ Speed control (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- 🔁 Loop mode (off, track, all)

**Track List:**
- Scrollable list of all tracks
- Click to jump to track
- Highlight current track
- Show duration for each track

**Features to Implement:**

**1. Playback Management**
- Play/pause current track
- Skip to next/previous track
- Seek forward/back 10 seconds
- Seek to specific time

**2. Progress Tracking**
- Save progress every 5 seconds
- Resume from last position on reload
- Use session ID from localStorage
- Update `playback_progress` table

**3. Playback Speed**
- Dropdown with speed options
- Persist selected speed in playback_progress
- Apply speed to audio element

**4. State Management**
```javascript
{
  currentTrackIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1.0,
  playbackSpeed: 1.0,
  tracks: [],
  audiobook: {}
}
```

**Props:**
```javascript
{
  audiobookId: string,
  playlistId: string, // OR
  autoplay: boolean,
  compact: boolean // For embed mode
}
```

---

### 4.2 Player Modes

**Admin Mode** (Dashboard):
- Full controls
- Edit track list
- Manage metadata

**Embed Mode** (Public):
- Clean, minimal UI
- No edit capabilities
- Just playback controls
- Optimized for iframe

---

## Phase 5: Embeddable Player 🌐

### 5.1 Embed Player Page
**File:** `src/pages/EmbedPlayer.jsx`

**URL Routes:**
- `/player/audiobook/:id`
- `/player/playlist/:id`

**Features:**
- Fetch audiobook/playlist data from URL param
- Render AudioPlayer in compact mode
- Minimal styling (clean, branded)
- No navigation, no headers
- Optimized for iframe embedding

**Styling:**
- Dark theme (or configurable)
- Responsive (mobile-friendly)
- No scrollbars if possible
- Height: ~400-500px recommended

**Loading States:**
- Show loading spinner
- Handle "not found" errors
- Handle "private" playlists (future)

---

### 5.2 Embed Code Generator
**File:** `src/components/EmbedCodeModal.jsx`

**Features:**
- Modal/dialog when user clicks "Get Embed Code"
- Generate iframe code with:
  - Audiobook/playlist ID
  - Configurable width (default: 100%)
  - Configurable height (default: 400px)
  - Frameborder=0, scrolling=no
- Copy to clipboard button
- Preview embed (iframe preview)

**Generated Code Example:**
```html
<iframe
  width="100%"
  height="400"
  frameborder="0"
  scrolling="no"
  seamless
  src="https://your-app.netlify.app/player/audiobook/abc-123-def">
</iframe>
```

**Customization Options:**
- Width (%, px)
- Height (px)
- Autoplay (yes/no)
- Theme (light/dark - future)

---

## Phase 6: Playlist Management 📝

### 6.1 Playlist Components
**Files:**
- `src/components/PlaylistCard.jsx`
- `src/components/PlaylistForm.jsx`

**Features:**

**PlaylistCard:**
- Similar to AudiobookCard
- Display: name, thumbnail, track count
- Actions: edit, delete, get embed code

**PlaylistForm:**
- Create/edit playlist
- Add tracks from any audiobook
- Reorder tracks
- Set thumbnail

**Track Selection:**
- Modal showing all tracks from all audiobooks
- Search/filter tracks
- Multi-select to add to playlist
- Drag to reorder within playlist

---

## Phase 7: Additional Features ✨

### 7.1 Thumbnail Management
**Component:** Part of AudiobookForm

**Features:**
- Upload thumbnail image
- Crop/resize (optional)
- Preview before save
- Delete thumbnail
- Default placeholder if none

### 7.2 Search & Filter
**Dashboard:**
- Search audiobooks by name/author
- Filter by date
- Sort by: name, date, duration

### 7.3 Analytics (Optional - Future)
**Track:**
- Play count per audiobook/track
- Total listen time
- Popular tracks
- Display in dashboard

---

## Implementation Order 📋

### **Week 1: Core Foundation**
- [ ] Phase 1: App.jsx with routing
- [ ] Phase 2: Dashboard layout
- [ ] AudiobookCard component
- [ ] AudiobookForm (create/edit)
- [ ] Basic Supabase CRUD

### **Week 2: Audio Management**
- [ ] Phase 3: UploadAudio component
- [ ] TrackList component
- [ ] Drag-and-drop reordering
- [ ] Track editing/deletion

### **Week 3: Player Development**
- [ ] Phase 4.1: AudioPlayer component
- [ ] Playback controls (play, pause, skip)
- [ ] Progress bar and seeking
- [ ] Volume and speed controls

### **Week 4: Embed & Polish**
- [ ] Phase 4.2: Progress tracking
- [ ] Phase 5: EmbedPlayer page
- [ ] EmbedCodeModal
- [ ] Testing embeds

### **Week 5: Playlists & Final**
- [ ] Phase 6: Playlist management
- [ ] Phase 7: Thumbnails, search
- [ ] Bug fixes and polish
- [ ] Deploy to Netlify

---

## Technical Considerations 🔧

### State Management
**Options:**
1. **React Context** (for global state like current player)
2. **Local State** (for forms, UI state)
3. **Supabase Realtime** (optional - for live updates)

**Recommendation:** Start with local state + React Context for player

### Audio Playback
**HTML5 Audio Element:**
```javascript
const audioRef = useRef(new Audio())

// Controls
audioRef.current.play()
audioRef.current.pause()
audioRef.current.currentTime = 30 // Seek to 30s
audioRef.current.playbackRate = 1.5 // 1.5x speed
audioRef.current.volume = 0.8 // 80% volume
```

**Events:**
- `timeupdate` - Track progress
- `ended` - Auto-play next track
- `loadedmetadata` - Get duration
- `error` - Handle playback errors

### Progress Tracking Strategy
**Save progress every 5 seconds:**
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    if (isPlaying) {
      saveProgress(currentTrackId, currentTime, playbackSpeed)
    }
  }, 5000)
  return () => clearInterval(interval)
}, [isPlaying, currentTime])
```

### File Upload Strategy
**Chunked uploads for large files:**
- Supabase supports up to 50MB per request
- For 50-150MB files, upload in chunks
- Show progress bar
- Handle retry on failure

### Responsive Design
**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Player Considerations:**
- Mobile: Stack controls vertically
- Embed: Optimize for 400px height

---

## Styling Approach 🎨

### Option 1: Tailwind CSS (Recommended)
**Pros:**
- Fast development
- Consistent design system
- Small bundle size
- Already used in your Composer Collab project

**Install:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Option 2: CSS Modules
**Pros:**
- Scoped styles
- No class name conflicts

### Option 3: Styled Components
**Pros:**
- CSS-in-JS
- Dynamic styling

**Recommendation:** Use Tailwind CSS for consistency with your other project

---

## Testing Plan 🧪

### Manual Testing Checklist
- [ ] Upload audiobook with 5+ tracks
- [ ] Reorder tracks
- [ ] Play through entire audiobook
- [ ] Test playback speed (0.5x - 2x)
- [ ] Test volume control
- [ ] Test skip forward/back
- [ ] Close browser, reopen - should resume
- [ ] Generate embed code
- [ ] Test embed in external HTML file
- [ ] Test on mobile device
- [ ] Test different audio durations

### Edge Cases
- [ ] Empty audiobook (no tracks)
- [ ] Single track audiobook
- [ ] Very long track (3+ hours)
- [ ] Network interruption during upload
- [ ] Invalid file formats
- [ ] Files > 150MB

---

## Deployment Checklist 🚀

### Pre-Deployment
- [ ] Set up Supabase project
- [ ] Run SQL schema
- [ ] Configure environment variables
- [ ] Test locally with production Supabase
- [ ] Build for production (`npm run build`)

### Netlify Setup
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Enable HTTPS
- [ ] Custom domain (optional)

### Post-Deployment
- [ ] Test embed codes with production URL
- [ ] Update CORS settings if needed
- [ ] Test on multiple browsers
- [ ] Share embed example

---

## Future Enhancements 💡

### V2 Features
- [ ] Multiple users / authentication
- [ ] Private audiobooks
- [ ] Password-protected embeds
- [ ] Chapters/bookmarks within tracks
- [ ] Download audiobooks (optional)
- [ ] Transcripts / captions
- [ ] Dark/light theme toggle
- [ ] Custom player colors
- [ ] Analytics dashboard
- [ ] RSS feed for podcasts
- [ ] Social sharing
- [ ] Comments/notes

### Advanced Features
- [ ] Server-side audio compression (ffmpeg)
- [ ] Streaming optimization
- [ ] Offline mode (PWA)
- [ ] Mobile app (React Native)

---

## Questions for Review ❓

Before we start implementation, please confirm:

1. **Styling:** Should we use Tailwind CSS (like Composer Collab)?
2. **Player design:** Do you have a specific look in mind? (Show examples if yes)
3. **Track naming:** Auto-extract from filename or manual entry?
4. **Playlists:** Priority for MVP or can wait?
5. **Deployment:** Do you already have a Netlify account?
6. **Supabase:** Have you created a Supabase project yet?

---

## Ready to Build! 🎯

Once you review this plan and answer any questions, we'll proceed with implementation in this order:

**Step 1:** Set up Tailwind CSS (if approved)
**Step 2:** Build App.jsx with routing
**Step 3:** Build Dashboard + Audiobook CRUD
**Step 4:** Build Upload & Track management
**Step 5:** Build Audio Player
**Step 6:** Build Embeddable Player
**Step 7:** Deploy!

Let me know if you want to adjust anything in this plan!
