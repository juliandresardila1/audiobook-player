import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Initialize R2 client with credentials
const r2Client = new S3Client({
  region: 'auto',
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY
  }
})

/**
 * Upload a file to Cloudflare R2
 * @param {File} file - The file to upload
 * @param {string} key - The object key (path) in the bucket
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToR2(file, key, onProgress) {
  try {
    // Convert File to ArrayBuffer for browser compatibility
    const arrayBuffer = await file.arrayBuffer()

    const command = new PutObjectCommand({
      Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'audio/mpeg',
      ContentLength: file.size
    })

    // Upload the file
    await r2Client.send(command)

    // Note: The AWS SDK doesn't natively support progress for browser uploads
    // If progress is needed, we'd need to implement chunked uploads
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size })
    }

    // Generate public URL
    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`

    return publicUrl
  } catch (error) {
    console.error('R2 upload error:', error)
    throw new Error(`Failed to upload to R2: ${error.message}`)
  }
}

/**
 * Generate a unique file path for R2 storage
 * @param {string} audiobookId - The audiobook ID
 * @param {number} trackNumber - The track number
 * @param {string} fileExtension - File extension (default: mp3)
 * @returns {string} - The generated file path
 */
export function generateR2Key(audiobookId, trackNumber, fileExtension = 'mp3') {
  const timestamp = Date.now()
  return `tracks/${audiobookId}/${trackNumber}-${timestamp}.${fileExtension}`
}

export { r2Client }
