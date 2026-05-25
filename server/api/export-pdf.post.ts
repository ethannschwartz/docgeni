export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { html, css, completeHtml } = body

  if (!html && !completeHtml) {
    throw createError({ statusCode: 400, statusMessage: 'No HTML provided' })
  }

  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({ headless: true })
  const page = await browser.newPage()

  // For proposals, completeHtml is already a full document
  const fullHtml = completeHtml || `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
    .contract-page {
      width: 210mm;
      min-height: 297mm;
      padding: 25mm 20mm;
      page-break-after: always;
      position: relative;
    }
    .contract-page:last-child { page-break-after: avoid; }
    ${css || ''}
  </style>
</head>
<body>${html}</body>
</html>`

  await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  })

  await browser.close()

  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="contract.pdf"')

  return pdf
})
