import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import AudiobookDetail from './pages/AudiobookDetail'
import EmbedPlayer from './pages/EmbedPlayer'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/audiobook/:id" element={<AudiobookDetail />} />
        <Route path="/player/audiobook/:id" element={<EmbedPlayer type="audiobook" />} />
        <Route path="/player/playlist/:id" element={<EmbedPlayer type="playlist" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
