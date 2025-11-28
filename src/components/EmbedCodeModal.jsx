import { useState } from 'react'
import { X, Copy, Check, ExternalLink } from 'lucide-react'

export default function EmbedCodeModal({ audiobook, onClose }) {
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('500')
  const [copied, setCopied] = useState(false)

  // Get the current domain (will be localhost in dev, your domain in production)
  const baseUrl = window.location.origin
  const embedUrl = `${baseUrl}/player/audiobook/${audiobook.id}`

  const embedCode = `<iframe
  width="${width}"
  height="${height}"
  src="${embedUrl}"
  frameborder="0"
  scrolling="no"
  seamless
  allow="autoplay"
  style="border-radius: 16px;"
  title="${audiobook.name}">
</iframe>`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleOpenPreview = () => {
    window.open(embedUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-dark p-8 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Embed Code</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-smooth"
          >
            <X size={24} />
          </button>
        </div>

        {/* Audiobook Info */}
        <div className="mb-6 p-4 bg-white/50 rounded-xl">
          <h3 className="font-semibold text-gray-800">{audiobook.name}</h3>
          {audiobook.author && (
            <p className="text-sm text-gray-600">{audiobook.author}</p>
          )}
        </div>

        {/* Customization Options */}
        <div className="mb-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Customize Player</h3>

          {/* Width */}
          <div>
            <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-2">
              Width
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="input-primary flex-1"
                placeholder="e.g., 100%, 800px"
              />
              <button
                onClick={() => setWidth('100%')}
                className="btn-secondary"
              >
                100%
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use percentage (e.g., 100%) or pixels (e.g., 800px)
            </p>
          </div>

          {/* Height */}
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-2">
              Height (pixels)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="input-primary flex-1"
                placeholder="e.g., 500"
                min="300"
                max="1000"
              />
              <button
                onClick={() => setHeight('500')}
                className="btn-secondary"
              >
                Reset
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 450-600px
            </p>
          </div>
        </div>

        {/* Embed Code */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Embed Code
            </label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/70 hover:bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-smooth"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Code
                </>
              )}
            </button>
          </div>
          <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {embedCode}
          </pre>
        </div>

        {/* Preview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Preview
            </label>
            <button
              onClick={handleOpenPreview}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/70 hover:bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-smooth"
            >
              <ExternalLink size={16} />
              Open in New Tab
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <iframe
              src={embedUrl}
              width="100%"
              height={height}
              frameBorder="0"
              scrolling="no"
              seamless
              allow="autoplay"
              className="rounded-xl"
              title={`Preview: ${audiobook.name}`}
            />
          </div>
        </div>

        {/* Direct Link */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Direct Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={embedUrl}
              readOnly
              className="input-primary flex-1 font-mono text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(embedUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="btn-secondary"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Share this link directly or use it to test the player
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">How to Use</h4>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Copy the embed code above</li>
            <li>Paste it into your website's HTML</li>
            <li>The player will appear wherever you paste the code</li>
            <li>Visitors can play the audiobook directly on your site</li>
          </ol>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
