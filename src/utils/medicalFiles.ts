import type { MedicalLabUpload } from '../models/types'
import { hashStringFNV1a32 } from './hash'

export function computeMedicalFilesSignature(files: MedicalLabUpload[]): string {
  const normalized = files
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) => ({
      id: f.id,
      uploadedAt: f.uploadedAt,
      name: f.name,
      mimeType: f.mimeType,
      dataUrlHash: hashStringFNV1a32(f.dataUrl),
    }))

  return hashStringFNV1a32(JSON.stringify(normalized))
}
