import { readMultipartFormData } from 'h3'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const file = formData[0]
  if (!file.data || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file' })
  }

  const extension = file.filename.split('.').pop()?.toLowerCase()
  let text = ''

  if (extension === 'pdf') {
    const pdfParse = await import('pdf-parse')
    const result = await pdfParse.default(file.data)
    text = result.text
  } else if (extension === 'docx' || extension === 'doc') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer: file.data })
    text = result.value
  } else {
    // Plain text fallback
    text = file.data.toString('utf-8')
  }

  return { text, filename: file.filename }
})
