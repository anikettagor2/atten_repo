/**
 * Script to download face-api.js models
 * Run with: node scripts/download-models.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const MODEL_BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models')

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
]

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        file.close()
        fs.unlinkSync(dest)
        downloadFile(response.headers.location, dest).then(resolve).catch(reject)
      } else {
        file.close()
        fs.unlinkSync(dest)
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
      }
    }).on('error', (err) => {
      file.close()
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function downloadModels() {
  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true })
  }

  console.log('Downloading face-api.js models...')
  console.log(`Destination: ${MODELS_DIR}\n`)

  for (const model of models) {
    const url = `${MODEL_BASE_URL}/${model}`
    const dest = path.join(MODELS_DIR, model)
    
    try {
      console.log(`Downloading ${model}...`)
      await downloadFile(url, dest)
      console.log(`✓ Downloaded ${model}\n`)
    } catch (error) {
      console.error(`✗ Failed to download ${model}:`, error.message)
      process.exit(1)
    }
  }

  console.log('All models downloaded successfully!')
}

downloadModels().catch(console.error)






