import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'eudr-exports'
const PUBLIC_URL = process.env.R2_PUBLIC_URL || ''

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType
  })

  await r2Client.send(command)

  return `${PUBLIC_URL}/${key}`
}

export async function getFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })

  const response = await r2Client.send(command)
  
  if (!response.Body) {
    throw new Error('File not found')
  }

  const stream = response.Body as ReadableStream
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  return Buffer.concat(chunks)
}

export function generateExportPath(clientId: string, filename: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `exports/${clientId}/${date}/${filename}`
}
