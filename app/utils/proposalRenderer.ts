import type { ProposalFrontMatter, ProposalPage, ParsedProposal } from '~/types/document'

// --- Inline markdown → HTML converter ---
function markdownToHtml(md: string): string {
  let html = md
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')

  // Convert blocks
  const lines = html.split('\n')
  const output: string[] = []
  let inList = false
  let inTable = false
  let tableRows: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true
        tableRows = []
      }
      // Skip separator row
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue
      tableRows.push(line)
      continue
    } else if (inTable) {
      output.push(renderTable(tableRows))
      inTable = false
      tableRows = []
    }

    // Headings (## and ###)
    const h3 = line.match(/^### (.+)/)
    if (h3) { output.push(`<h3 class="ss-h3">${h3[1]!}</h3>`); continue }
    const h2 = line.match(/^## (.+)/)
    if (h2) { output.push(`<h2 class="ss-h2">${h2[1]!}</h2>`); continue }

    // Unordered list
    if (line.match(/^\s*[-*] /)) {
      if (!inList) { output.push('<ul class="ss-list">'); inList = true }
      output.push(`<li>${line.replace(/^\s*[-*] /, '')}</li>`)
      continue
    } else if (inList) {
      output.push('</ul>')
      inList = false
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      output.push('<hr class="ss-hr">')
      continue
    }

    // Paragraph (non-empty lines)
    if (line.trim()) {
      output.push(`<p class="ss-body">${line}</p>`)
    }
  }

  if (inList) output.push('</ul>')
  if (inTable) output.push(renderTable(tableRows))

  return output.join('\n')
}

function renderTable(rows: string[]): string {
  if (!rows.length) return ''
  const parseRow = (r: string) =>
    r.split('|').filter(c => c.trim()).map(c => c.trim())

  const header = parseRow(rows[0]!)
  const body = rows.slice(1).map(parseRow)

  return `<table class="ss-table">
    <thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${body.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`
}

// --- Highlight {{variables}} ---
function highlightVars(html: string, filled: Record<string, string> = {}): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const val = filled[name]
    if (val) return `<span class="ss-var ss-var--filled">${val}</span>`
    return `<span class="ss-var">${name.replace(/_/g, ' ')}</span>`
  })
}

// --- Per-page renderers ---
function renderCoverPage(fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const companyName = vars['company_name'] || fm.company_name || 'Company Name'
  const projectTitle = vars['project_title'] || fm.project_title || 'Project Title'
  const clientName = vars['client_name'] || fm.client_name || 'Client Name'
  const date = vars['date'] || fm.date || ''

  return `<div class="ss-page ss-page--dark">
    <div class="ss-cover">
      <div class="ss-cover__wordmark">${companyName}</div>
      <div class="ss-cover__details">
        <hr class="ss-hr ss-hr--light">
        <div class="ss-cover__grid">
          <div>
            <div class="ss-label">Project</div>
            <div class="ss-cover__value">${projectTitle}</div>
          </div>
          <div>
            <div class="ss-label">Client</div>
            <div class="ss-cover__value">${clientName}</div>
          </div>
          <div>
            <div class="ss-label">Date</div>
            <div class="ss-cover__value">${date}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

function renderHelloPage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const body = highlightVars(markdownToHtml(page.content), vars)
  return `<div class="ss-page ss-page--blush">
    <div class="ss-page__header">
      <div class="ss-page__logo">${vars['company_name'] || fm.company_name || ''}</div>
    </div>
    <div class="ss-hello">
      <h1 class="ss-display">Hello.</h1>
      <div class="ss-hello__body">${body}</div>
    </div>
  </div>`
}

function renderStagePage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const stageNum = page.stageNumber ?? ''
  const version = page.stageVersion ?? ''
  const title = page.title || ''
  const body = highlightVars(markdownToHtml(page.content), vars)

  return `<div class="ss-page ss-page--grey">
    <div class="ss-page__header">
      <div class="ss-page__logo">${vars['company_name'] || fm.company_name || ''}</div>
      <div class="ss-page__pagemeta">${title}</div>
    </div>
    <div class="ss-stage">
      <div class="ss-stage__head">
        <div class="ss-stage__number">Stage ${stageNum}</div>
        <h2 class="ss-display ss-display--sm">${title}</h2>
        ${version ? `<div class="ss-stage__version">${version}</div>` : ''}
      </div>
      <hr class="ss-hr">
      <div class="ss-stage__body ss-grid">${body}</div>
    </div>
  </div>`
}

function renderFeePage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const body = highlightVars(markdownToHtml(page.content), vars)
  return `<div class="ss-page ss-page--grey">
    <div class="ss-page__header">
      <div class="ss-page__logo">${vars['company_name'] || fm.company_name || ''}</div>
      <div class="ss-page__pagemeta">Fee</div>
    </div>
    <div class="ss-fee">
      <h1 class="ss-display">Fee<br>Summary.</h1>
      <hr class="ss-hr">
      <div class="ss-fee__body">${body}</div>
    </div>
  </div>`
}

function renderSummaryPage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const body = highlightVars(markdownToHtml(page.content), vars)
  return `<div class="ss-page ss-page--grey">
    <div class="ss-page__header">
      <div class="ss-page__logo">${vars['company_name'] || fm.company_name || ''}</div>
      <div class="ss-page__pagemeta">Summary</div>
    </div>
    <div class="ss-summary">
      <h1 class="ss-display">Project<br>Summary.</h1>
      <hr class="ss-hr">
      <div class="ss-summary__body">${body}</div>
    </div>
  </div>`
}

function renderAppendixPage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const body = highlightVars(markdownToHtml(page.content), vars)
  const title = page.title || 'Appendix'
  return `<div class="ss-page ss-page--grey">
    <div class="ss-page__header">
      <div class="ss-page__logo">${vars['company_name'] || fm.company_name || ''}</div>
      <div class="ss-page__pagemeta">${title}</div>
    </div>
    <div class="ss-appendix">
      <h1 class="ss-display">${title}.</h1>
      <hr class="ss-hr">
      <div class="ss-appendix__body">${body}</div>
    </div>
  </div>`
}

function renderThankYouPage(fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const email = vars['contact_email'] || fm.contact_email || ''
  const phone = vars['contact_phone'] || fm.contact_phone || ''
  const domain = vars['company_domain'] || fm.company_domain || ''
  const socials = fm.socials || []

  return `<div class="ss-page ss-page--dark">
    <div class="ss-thankyou">
      <h1 class="ss-display ss-display--lg">Thank<br>You.</h1>
      <hr class="ss-hr ss-hr--light">
      <div class="ss-thankyou__contact">
        ${email ? `<div class="ss-thankyou__row"><span class="ss-label">Email</span><span>${email}</span></div>` : ''}
        ${phone ? `<div class="ss-thankyou__row"><span class="ss-label">Phone</span><span>${phone}</span></div>` : ''}
        ${domain ? `<div class="ss-thankyou__row"><span class="ss-label">Web</span><span>${domain}</span></div>` : ''}
        ${socials.length ? `<div class="ss-thankyou__socials">${socials.map(s => `<span class="ss-social">${s}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  </div>`
}

// --- Page router ---
function renderPage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  switch (page.type) {
    case 'cover': return renderCoverPage(fm, vars)
    case 'hello': return renderHelloPage(page, fm, vars)
    case 'stage': return renderStagePage(page, fm, vars)
    case 'fee': return renderFeePage(page, fm, vars)
    case 'summary': return renderSummaryPage(page, fm, vars)
    case 'appendix': return renderAppendixPage(page, fm, vars)
    case 'thankyou': return renderThankYouPage(fm, vars)
  }
}

// --- CSS ---
const shoreStudioCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
  --bg-dark: #000000;
  --bg-blush: #F7DCCB;
  --bg-grey: #E8E8E8;
  --text-dark: #000000;
  --text-light: #FFFFFF;
  --text-muted: #666666;
  --font: 'Inter', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  background: #C0C0C0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

@page {
  size: A4;
  margin: 0;
}

/* -- Page shell -- */
.ss-page {
  width: 210mm;
  min-height: 297mm;
  padding: 48px 56px;
  position: relative;
  page-break-after: always;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  border-radius: 2px;
}
.ss-page:last-child { page-break-after: avoid; }

@media print {
  body { background: none; padding: 0; gap: 0; }
  .ss-page { box-shadow: none; border-radius: 0; height: 297mm; overflow: hidden; }
}
.ss-page--dark  { background: var(--bg-dark); color: var(--text-light); }
.ss-page--blush { background: var(--bg-blush); color: var(--text-dark); }
.ss-page--grey  { background: var(--bg-grey); color: var(--text-dark); }

.ss-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}
.ss-page__logo {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ss-page__pagemeta {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* -- Typography -- */
.ss-display {
  font-size: 104px;
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.03em;
  margin-bottom: 32px;
}
.ss-display--sm {
  font-size: 64px;
}
.ss-display--lg {
  font-size: 120px;
}
.ss-h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  margin-top: 24px;
}
.ss-h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  margin-top: 20px;
}
.ss-body {
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 8px;
  color: var(--text-dark);
}
.ss-page--dark .ss-body { color: var(--text-light); }
.ss-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.ss-page--dark .ss-label { color: rgba(255,255,255,0.5); }

/* -- HR -- */
.ss-hr {
  border: none;
  border-top: 1px solid rgba(0,0,0,0.15);
  margin: 24px 0;
}
.ss-hr--light { border-top-color: rgba(255,255,255,0.2); }

/* -- Grid (12-col) -- */
.ss-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}
.ss-grid > * { grid-column: span 12; }
.ss-grid > .ss-h2,
.ss-grid > .ss-h3 { grid-column: span 12; }

/* -- Cover -- */
.ss-cover {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.ss-cover__wordmark {
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  margin-bottom: 48px;
  color: var(--text-light);
}
.ss-cover__details { margin-top: auto; }
.ss-cover__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 24px;
}
.ss-cover__value {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-light);
}

/* -- Hello -- */
.ss-hello { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.ss-hello__body { max-width: 520px; }
.ss-hello__body .ss-body { font-size: 16px; line-height: 1.8; }

/* -- Stage -- */
.ss-stage { flex: 1; }
.ss-stage__head { margin-bottom: 16px; }
.ss-stage__number {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.ss-stage__version {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
.ss-stage__body { margin-top: 16px; }

/* -- Fee -- */
.ss-fee { flex: 1; }
.ss-fee__body { margin-top: 16px; }

/* -- Summary -- */
.ss-summary { flex: 1; }
.ss-summary__body { margin-top: 16px; }

/* -- Appendix -- */
.ss-appendix { flex: 1; }
.ss-appendix__body { margin-top: 16px; }

/* -- Thank You -- */
.ss-thankyou {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.ss-thankyou__contact { margin-top: 24px; }
.ss-thankyou__row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.ss-thankyou__row .ss-label { margin-bottom: 0; }
.ss-thankyou__socials {
  display: flex;
  gap: 24px;
  margin-top: 24px;
}
.ss-social {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
}

/* -- Table -- */
.ss-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin: 16px 0;
}
.ss-table th {
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.2);
  color: var(--text-muted);
}
.ss-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

/* -- List -- */
.ss-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}
.ss-list li {
  position: relative;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 6px;
}
.ss-list li::before {
  content: '—';
  position: absolute;
  left: 0;
  color: var(--text-muted);
}

/* -- Variable highlights -- */
.ss-var {
  background: rgba(255, 200, 50, 0.25);
  padding: 1px 6px;
  border-radius: 3px;
  font-style: italic;
}
.ss-var--filled {
  background: rgba(100, 200, 100, 0.15);
  font-style: normal;
}
`

// --- Main render function ---
export function renderProposalHtml(proposal: ParsedProposal, filledVars: Record<string, string> = {}): string {
  const pages = proposal.pages.map(p => renderPage(p, proposal.frontMatter, filledVars)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${shoreStudioCSS}</style>
</head>
<body>
${pages}
</body>
</html>`
}

export { shoreStudioCSS }
