import type { ProposalFrontMatter, ProposalPage, ParsedProposal } from '~/types/document'

// ─── Helpers ────────────────────────────────────────────────────────────────

function v(vars: Record<string, string>, fm: ProposalFrontMatter, key: string): string {
  return vars[key] || (fm as Record<string, string | string[]>)[key] as string || ''
}

/** Replace {{var}} with plain text — R1: NO highlights, NO pills */
function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    return vars[name] || name.replace(/_/g, ' ')
  })
}

/** Minimal markdown→HTML for body content inside pages */
function mdToHtml(md: string, vars: Record<string, string>): string {
  let text = interpolate(md, vars)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')

  const lines = text.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false
  let inTable = false
  let tableRows: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) { inTable = true; tableRows = [] }
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue
      tableRows.push(line)
      continue
    } else if (inTable) {
      out.push(renderTable(tableRows))
      inTable = false; tableRows = []
    }

    // H3
    const h3 = line.match(/^### (.+)/)
    if (h3) { out.push(`<h3 class="label">${h3[1]!}</h3>`); continue }
    // H2
    const h2 = line.match(/^## (.+)/)
    if (h2) { out.push(`<h2 class="section-sub">${h2[1]!}</h2>`); continue }

    // Unordered list
    if (/^\s*[-*] /.test(line)) {
      if (!inUl) { if (inOl) { out.push('</ol>'); inOl = false }; out.push('<ul class="dash-list">'); inUl = true }
      out.push(`<li>${line.replace(/^\s*[-*] /, '')}</li>`)
      continue
    } else if (inUl) { out.push('</ul>'); inUl = false }

    // Ordered list
    if (/^\s*\d+\.\s/.test(line)) {
      if (!inOl) { if (inUl) { out.push('</ul>'); inUl = false }; out.push('<ol class="num-list">'); inOl = true }
      out.push(`<li>${line.replace(/^\s*\d+\.\s/, '')}</li>`)
      continue
    } else if (inOl) { out.push('</ol>'); inOl = false }

    // HR
    if (/^---+$/.test(line.trim())) { out.push('<hr class="rule">'); continue }

    // Non-empty → paragraph
    if (line.trim()) out.push(`<p class="body">${line}</p>`)
  }
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')
  if (inTable) out.push(renderTable(tableRows))

  return out.join('\n')
}

function renderTable(rows: string[]): string {
  if (!rows.length) return ''
  const parseRow = (r: string) => r.split('|').filter(c => c.trim()).map(c => c.trim())
  const header = parseRow(rows[0]!)
  const body = rows.slice(1).map(parseRow)
  const lastColIdx = header.length - 1

  return `<table class="fee-table">
<thead><tr>${header.map((h, i) => `<th${i === lastColIdx ? ' class="right"' : ''}>${h}</th>`).join('')}</tr></thead>
<tbody>${body.map(row => `<tr>${row.map((c, i) => `<td${i === lastColIdx ? ' class="right"' : ''}>${c}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table>`
}

/** Shared wordmark + footer-url for interior pages */
function pageChrome(fm: ProposalFrontMatter, vars: Record<string, string>, invert = false): string {
  const company = v(vars, fm, 'company_name')
  const domain = v(vars, fm, 'company_domain')
  const cls = invert ? ' inv' : ''
  return `<div class="wordmark${cls}">${company}.</div>
<div class="footer-url${cls}">${domain}</div>`
}

// ─── Page renderers ─────────────────────────────────────────────────────────

function renderCover(fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const company = v(vars, fm, 'company_name')
  const project = v(vars, fm, 'project_title')
  const subject = v(vars, fm, 'project_subject')
  const date = v(vars, fm, 'date')
  const client = v(vars, fm, 'client_name')
  const domain = v(vars, fm, 'company_domain')

  return `<div class="page cover">
  <div class="cover-top-url">${domain}</div>
  <div class="cover-center">
    <div class="cover-mark">${company}.</div>
    <hr class="rule inv">
    <p class="body inv">${project}</p>
    ${subject ? `<p class="body inv">${subject}</p>` : ''}
  </div>
  <div class="cover-bottom">
    <div class="label-pair">
      <div class="label inv">Date</div>
      <div class="body inv">${date}</div>
    </div>
    <div class="label-pair">
      <div class="label inv">Prepared for</div>
      <div class="body inv">${client}</div>
    </div>
  </div>
  <div class="footer-url inv">${domain}</div>
</div>`
}

function renderLetter(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const body = mdToHtml(page.content, vars)
  const signerName = v(vars, fm, 'signer_name')
  const signerRole = v(vars, fm, 'signer_role')
  const sigSvg = vars['signer_signature_svg'] || fm.signer_signature_svg || ''

  const defaultSig = `<svg width="180" height="60" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M 10 40 Q 30 10, 50 30 T 90 35 Q 110 45, 140 25 L 170 30" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M 145 30 L 165 30" fill="none" stroke="#111" stroke-width="1"/>
      </svg>`

  const sigContent = sigSvg
    ? (sigSvg.startsWith('<') ? sigSvg : `<img src="${sigSvg}" style="max-width:180px;max-height:80px" />`)
    : defaultSig

  return `<div class="page letter">
  ${pageChrome(fm, vars)}
  <div class="letter-content">
    <h1 class="display">Hello.</h1>
    <hr class="rule">
    <div class="letter-body">${body}</div>
    <div class="letter-sig">
      ${sigContent}
      ${signerName ? `<div class="label" style="margin-top:16px">${signerName}</div>` : ''}
      ${signerRole ? `<p class="body">${signerRole}</p>` : ''}
    </div>
  </div>
</div>`
}

function renderStage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const num = page.stageNumber ?? ''
  const ver = page.stageVersion ?? `${num}.0`
  const title = page.title || ''
  const body = mdToHtml(page.content, vars)
  const meta = page.meta

  const feeVal = meta?.fee ? interpolate(meta.fee, vars) : ''
  const timeVal = meta?.time ? interpolate(meta.time, vars) : ''
  const deliverables = meta?.deliverables ? mdToHtml(meta.deliverables, vars) : ''
  const note = meta?.note ? interpolate(meta.note, vars) : ''

  return `<div class="page stage">
  ${pageChrome(fm, vars)}
  <div class="stage-content">
    <div class="stage-left">
      <div class="stage-title">Stage ${num}</div>
    </div>
    <div class="stage-right">
      <div class="stage-header">
        <span class="section-sub">${title}</span>
        <span class="section-num">${ver}</span>
      </div>
      <hr class="rule">
      <div class="stage-body">${body}</div>
      ${(feeVal || timeVal) ? `
      <hr class="rule" style="margin-top:48px">
      <div class="stat-row">
        ${feeVal ? `<div class="stat-cell"><div class="label">Fee</div><div class="stat">${feeVal}</div></div>` : ''}
        ${timeVal ? `<div class="stat-cell"><div class="label">Time</div><div class="stat">${timeVal}</div></div>` : ''}
      </div>` : ''}
      ${(deliverables || note) ? `
      <div class="footnote-row">
        ${deliverables ? `<div class="footnote-col"><div class="label">Deliverables:</div><div class="footnote-body">${deliverables}</div></div>` : ''}
        ${note ? `<div class="footnote-col"><div class="label">Please note:</div><p class="footnote-body">${note}</p></div>` : ''}
      </div>` : ''}
    </div>
  </div>
</div>`
}

function renderFee(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  // Split content: find the table, then terms after it
  const content = interpolate(page.content, vars)
  const lines = content.split('\n')
  const tableLines: string[] = []
  const termLines: string[] = []
  let pastTable = false
  let foundTable = false

  for (const line of lines) {
    if (line.includes('|') && line.trim().startsWith('|')) {
      foundTable = true
      if (!/^\|[\s\-:|]+\|$/.test(line.trim())) tableLines.push(line)
    } else if (foundTable && !pastTable && !line.trim()) {
      pastTable = true
    } else if (pastTable || !foundTable) {
      termLines.push(line)
    }
  }

  // Parse table — find total row
  let tableHtml = ''
  let totalLabel = ''
  let totalValue = ''
  if (tableLines.length) {
    const parseRow = (r: string) => r.split('|').filter(c => c.trim()).map(c => c.trim())
    const header = parseRow(tableLines[0]!)
    const bodyRows = tableLines.slice(1).map(parseRow)

    // Check if last row is a total
    const lastRow = bodyRows[bodyRows.length - 1]
    if (lastRow && lastRow.some(c => /\*\*total\*\*/i.test(c) || /^total$/i.test(c))) {
      const totalRow = bodyRows.pop()!
      totalLabel = 'Total'
      totalValue = (totalRow[totalRow.length - 1] || '').replace(/\*\*/g, '')
    }

    const lastIdx = header.length - 1
    tableHtml = `<table class="fee-table">
<thead><tr>${header.map((h, i) => `<th${i === lastIdx ? ' class="right"' : ''}>${h}</th>`).join('')}</tr></thead>
<tbody>${bodyRows.map(row => `<tr>${row.map((c, i) => `<td${i === lastIdx ? ' class="right"' : ''}>${c.replace(/\*\*/g, '')}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table>`
  }

  const termsHtml = mdToHtml(termLines.join('\n').trim(), vars)

  return `<div class="page fee">
  ${pageChrome(fm, vars)}
  <div class="fee-content">
    <h1 class="display">Fee.</h1>
    <hr class="rule">
    ${tableHtml}
    ${(totalLabel && totalValue) ? `
    <div class="fee-total">
      <hr class="rule" style="margin-top:48px">
      <div class="fee-total-row">
        <span class="stat">${totalLabel}</span>
        <span class="stat">${totalValue}</span>
      </div>
    </div>` : ''}
    ${termsHtml ? `<div class="fee-terms">${termsHtml}</div>` : ''}
  </div>
</div>`
}

function renderSummary(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const body = mdToHtml(page.content, vars)

  return `<div class="page summary">
  ${pageChrome(fm, vars)}
  <div class="summary-content">
    <h1 class="display">Summary.</h1>
    <hr class="rule">
    <div class="summary-body">${body}</div>
    <hr class="rule" style="margin-top:48px">
    <div class="client-acceptance">Client acceptance</div>
    <div class="sig-fields">
      <div class="sig-field">
        <div class="label">Name</div>
        <div class="sig-space"></div>
        <div class="sig-rule"></div>
      </div>
      <div class="sig-field">
        <div class="label">Signed</div>
        <div class="sig-space"></div>
        <div class="sig-rule"></div>
      </div>
      <div class="sig-field">
        <div class="label">Date</div>
        <div class="sig-space"></div>
        <div class="sig-rule"></div>
      </div>
    </div>
  </div>
</div>`
}

function renderAppendix(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const body = mdToHtml(page.content, vars)

  return `<div class="page appendix">
  ${pageChrome(fm, vars)}
  <div class="appendix-content">
    <h1 class="display">Appendix.</h1>
    <hr class="rule">
    <div class="appendix-body">${body}</div>
  </div>
</div>`
}

function renderThankYou(fm: ProposalFrontMatter, vars: Record<string, string>): string {
  const email = v(vars, fm, 'contact_email')
  const phone = v(vars, fm, 'contact_phone')
  const domain = v(vars, fm, 'company_domain')
  const rawSocials = fm.socials || []
  // De-duplicate: remove "Website" from socials if domain is shown
  const socials = domain
    ? rawSocials.filter(s => s.toLowerCase() !== 'website')
    : rawSocials

  return `<div class="page thanks">
  ${pageChrome(fm, vars, true)}
  <div class="thanks-content">
    <h1 class="display inv">Thank you.</h1>
    <hr class="rule inv">
    <div class="thanks-contact">
      ${email ? `<p class="body inv">${email}</p>` : ''}
      ${phone ? `<p class="body inv">${phone}</p>` : ''}
    </div>
    <div class="thanks-socials">
      <hr class="rule inv">
      ${socials.map(s => `<p class="body inv">${s}</p>`).join('\n')}
    </div>
  </div>
</div>`
}

function renderPage(page: ProposalPage, fm: ProposalFrontMatter, vars: Record<string, string>): string {
  switch (page.type) {
    case 'cover': return renderCover(fm, vars)
    case 'hello': return renderLetter(page, fm, vars)
    case 'stage': return renderStage(page, fm, vars)
    case 'fee': return renderFee(page, fm, vars)
    case 'summary': return renderSummary(page, fm, vars)
    case 'appendix': return renderAppendix(page, fm, vars)
    case 'thankyou': return renderThankYou(fm, vars)
  }
}

// ─── CSS ────────────────────────────────────────────────────────────────────

const shoreStudioCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

:root {
  --bg-dark: #000000;
  --bg-blush: #F7DCCB;
  --bg-grey: #E8E8E8;
  --ink: #111111;
  --ink-inv: #FFFFFF;
  --rule-color: #111111;
  --rule-inv: #FFFFFF;
  --muted: #666666;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--ink);
  letter-spacing: -0.005em;
  background: transparent;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

@page { size: A4; margin: 0; }

/* ── Page shell ── */
.page {
  width: 210mm;
  min-height: 297mm;
  padding: 64px;
  position: relative;
  page-break-after: always;
  box-shadow: 0 2px 16px rgba(0,0,0,0.12);
}
.page:last-child { page-break-after: avoid; }

@media print {
  body { background: none; padding: 0; gap: 0; }
  .page { box-shadow: none; height: 297mm; overflow: hidden; }
}

.cover   { background: var(--bg-dark); color: var(--ink-inv); }
.letter  { background: var(--bg-blush); color: var(--ink); }
.stage   { background: var(--bg-grey); color: var(--ink); }
.fee     { background: var(--bg-grey); color: var(--ink); }
.summary { background: var(--bg-grey); color: var(--ink); }
.appendix{ background: var(--bg-grey); color: var(--ink); }
.thanks  { background: var(--bg-dark); color: var(--ink-inv); }

/* ── Chrome: wordmark + footer ── */
.wordmark {
  position: absolute;
  top: 48px; left: 64px;
  font-size: 18px; font-weight: 400; line-height: 1;
  color: var(--ink);
}
.wordmark.inv { color: var(--ink-inv); }
.footer-url {
  position: absolute;
  bottom: 48px; right: 64px;
  font-size: 12px; font-weight: 600; line-height: 1;
  color: var(--ink);
}
.footer-url.inv { color: var(--ink-inv); }

/* ── Typography ── */
.display {
  font-size: 104px;
  font-weight: 400;
  line-height: 1.0;
  letter-spacing: -0.02em;
  margin-bottom: 0;
  color: var(--ink);
}
.display.inv { color: var(--ink-inv); }

.cover-mark {
  font-size: 104px;
  font-weight: 400;
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: var(--ink-inv);
}

.stage-title {
  font-size: 48px;
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.section-sub {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--ink);
  margin: 0;
}

.section-num {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--ink);
}

.body {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.55;
  margin-bottom: 8px;
  color: var(--ink);
}
.body.inv { color: var(--ink-inv); }

.label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
  margin-bottom: 4px;
}
.label.inv { color: rgba(255,255,255,0.5); }

.stat {
  font-size: 32px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--ink);
}

/* ── Rules ── */
.rule {
  border: none;
  border-top: 1px solid var(--rule-color);
  margin: 16px 0 24px 0;
}
.rule.inv { border-top-color: var(--rule-inv); }

/* ── Lists ── */
.dash-list {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}
.dash-list li {
  position: relative;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.55;
  margin-bottom: 8px;
  font-weight: 400;
}
.dash-list li::before {
  content: '\\2014';
  position: absolute;
  left: 0;
  color: var(--muted);
}

.num-list {
  padding-left: 24px;
  margin: 8px 0;
}
.num-list li {
  font-size: 14px;
  line-height: 1.55;
  margin-bottom: 8px;
  font-weight: 400;
}

/* ── Table ── */
.fee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin: 16px 0;
}
.fee-table th {
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule-color);
  color: var(--ink);
}
.fee-table th.right { text-align: right; }
.fee-table td {
  padding: 12px 0;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  font-weight: 400;
  vertical-align: top;
}
.fee-table td.right { text-align: right; }

/* ══════ COVER ══════ */
.cover-top-url {
  position: absolute;
  top: 48px; right: 64px;
  font-size: 12px; font-weight: 600;
  color: var(--ink-inv);
}

.cover-center {
  position: absolute;
  top: 50%;
  left: 64px;
  right: 64px;
  transform: translateY(-50%);
}

.cover-bottom {
  position: absolute;
  bottom: 120px;
  left: 64px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.label-pair {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ══════ LETTER ══════ */
.letter-content {
  padding-top: 25%;
}
.letter-body {
  max-width: 480px;
}
.letter-body .body {
  margin-bottom: 12px;
}
.letter-sig {
  margin-top: 48px;
}

/* ══════ STAGE ══════ */
.stage-content {
  display: grid;
  grid-template-columns: 30% 65%;
  column-gap: 5%;
  padding-top: 25%;
}
.stage-left  { grid-column: 1; white-space: nowrap; }
.stage-right { grid-column: 2; }

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.stage-body { margin-top: 16px; }

.stat-row {
  display: flex;
  gap: 24px;
  margin-top: 24px;
}
.stat-cell {
  min-width: 35%;
}
.stat-cell .label { margin-bottom: 8px; }

.footnote-row {
  display: flex;
  gap: 24px;
  margin-top: 24px;
}
.footnote-col {
  flex: 1;
}
.footnote-body {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--ink);
  margin-top: 4px;
}
.footnote-body .dash-list li { font-size: 13px; }

/* ══════ FEE ══════ */
.fee-content {
  padding-top: 18%;
}
.fee-total-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 8px;
}
.fee-terms {
  margin-top: 64px;
}
.fee-terms .body {
  font-size: 13px;
  max-width: 560px;
}

/* ══════ SUMMARY ══════ */
.summary-content {
  padding-top: 18%;
}
.summary-body { margin-bottom: 24px; }
.client-acceptance {
  font-size: 48px;
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
  color: var(--ink);
}
.sig-fields {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-top: 24px;
}
.sig-field {}
.sig-space { height: 48px; }
.sig-rule {
  border-top: 1px solid var(--rule-color);
}

/* ══════ APPENDIX ══════ */
.appendix-content {
  padding-top: 14%;
}
.appendix-body .section-sub {
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 8px;
}
.appendix-body .body {
  font-size: 13px;
}

/* ══════ THANK YOU ══════ */
.thanks-content {
  position: absolute;
  bottom: 120px;
  left: 64px;
  right: 64px;
}
.thanks-contact {
  margin-bottom: 80px;
}
.thanks-contact .body { margin-bottom: 4px; }
.thanks-socials .body {
  margin-bottom: 4px;
}
`

// ─── Main export ────────────────────────────────────────────────────────────

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
