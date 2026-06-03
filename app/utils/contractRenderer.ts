import type { ContractFrontMatter, ContractSection, ParsedContract } from '~/types/document'

// ─── Helpers ────────────────────────────────────────────────────────────────

function v(vars: Record<string, string>, fm: ContractFrontMatter, key: string): string {
  return vars[key] || fm[key] || ''
}

/** Replace {{var}} with plain text — no highlights, no pills */
function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    return vars[name] || name.replace(/_/g, ' ')
  })
}

/** Minimal markdown→HTML for contract body content */
function mdToHtml(md: string, vars: Record<string, string>): string {
  let text = interpolate(md, vars)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
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

    // H3 → sub-heading
    const h3 = line.match(/^### (.+)/)
    if (h3) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (inOl) { out.push('</ol>'); inOl = false }
      out.push(`<h3 class="sub-heading">${h3[1]!}</h3>`)
      continue
    }

    // Unordered list
    if (/^\s*[-*] /.test(line)) {
      if (!inUl) {
        if (inOl) { out.push('</ol>'); inOl = false }
        out.push('<ul class="prose-list">')
        inUl = true
      }
      out.push(`<li>${line.replace(/^\s*[-*] /, '')}</li>`)
      continue
    } else if (inUl) { out.push('</ul>'); inUl = false }

    // Ordered list
    if (/^\s*\d+\.\s/.test(line)) {
      if (!inOl) {
        if (inUl) { out.push('</ul>'); inUl = false }
        out.push('<ol class="prose-list-ol">')
        inOl = true
      }
      out.push(`<li>${line.replace(/^\s*\d+\.\s/, '')}</li>`)
      continue
    } else if (inOl) { out.push('</ol>'); inOl = false }

    // HR
    if (/^---+$/.test(line.trim())) continue // skip HRs — we don't use decorative rules

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

  return `<table class="contract-table">
<thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${body.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table>`
}

// ─── Page renderers ─────────────────────────────────────────────────────────

function renderFooter(fm: ContractFrontMatter, vars: Record<string, string>): string {
  const date = v(vars, fm, 'date')
  const supplier = v(vars, fm, 'supplier_name')
  const ref = v(vars, fm, 'doc_ref')

  return `<div class="footer">
    <span>${date}</span>
    <span>${supplier}</span>
    <span>${ref}</span>
  </div>`
}

function renderCover(fm: ContractFrontMatter, vars: Record<string, string>): string {
  const clientName = v(vars, fm, 'client_name')
  const docType = v(vars, fm, 'document_type')
  const brandSvg = fm.brand_mark_svg

  const mark = brandSvg || `<svg class="brand-mark"
       viewBox="0 0 640 760"
       xmlns="http://www.w3.org/2000/svg"
       width="460" height="546"
       style="position:absolute; right:-40px; bottom:-60px;">
    <rect x="0" y="20" width="300" height="440" rx="150" fill="#EDEEE6"/>
    <circle cx="430" cy="180" r="170" fill="#EDEEE6"/>
    <circle cx="430" cy="580" r="200" fill="#EDEEE6"/>
  </svg>`

  return `<section class="page cover">
  <div class="cover-title">
    <div>${clientName}</div>
    <div>${docType}</div>
  </div>
  ${mark}
  ${renderFooter(fm, vars)}
</section>`
}

function renderContentPage(section: ContractSection, fm: ContractFrontMatter, vars: Record<string, string>): string {
  const heading = interpolate(section.heading, vars)
  const body = mdToHtml(section.content, vars)

  return `<section class="page">
  <div class="content">
    <h2 class="section-heading">${heading}</h2>
    <div class="text-column">
      ${body}
    </div>
  </div>
  ${renderFooter(fm, vars)}
</section>`
}

function renderSigningPage(section: ContractSection, fm: ContractFrontMatter, vars: Record<string, string>): string {
  const heading = interpolate(section.heading, vars)
  const signerName = v(vars, fm, 'signer_name')
  const signerPosition = v(vars, fm, 'signer_position')
  const signerCompany = v(vars, fm, 'signer_company')
  const signedDate = v(vars, fm, 'signed_date')
  const signedDatetime = v(vars, fm, 'signed_datetime')
  const sigSvg = fm.signer_signature_svg

  return `<section class="page">
  <div class="content">
    <h2 class="section-heading">${heading}</h2>
    <div class="sig-stack">
      <div class="sig-field">
        <div class="sig-label">Full name</div>
        ${signerName ? `<div class="sig-value">${signerName}</div>` : ''}
        <div class="sig-line"></div>
      </div>
      <div class="sig-field">
        <div class="sig-label">Position</div>
        ${signerPosition ? `<div class="sig-value">${signerPosition}</div>` : ''}
        <div class="sig-line"></div>
      </div>
      <div class="sig-field">
        <div class="sig-label">Company name</div>
        ${signerCompany ? `<div class="sig-value">${signerCompany}</div>` : ''}
        <div class="sig-line"></div>
      </div>
      <div class="sig-field">
        <div class="sig-label">Date</div>
        ${signedDate ? `<div class="sig-value">${signedDate}</div>` : ''}
        <div class="sig-line"></div>
      </div>
      <div class="sig-field">
        <div class="sig-label">Signature</div>
        <div class="sig-signature">${sigSvg || ''}</div>
        ${signedDatetime ? `<div class="sig-cite">${signerName} (${signedDatetime})</div>` : ''}
        <div class="sig-line"></div>
      </div>
    </div>
  </div>
  ${renderFooter(fm, vars)}
</section>`
}

// ─── CSS ────────────────────────────────────────────────────────────────────

const studioSixtyOneCSS = `
@import url('https://fonts.googleapis.com/css2?family=Spectral:wght@300;400;500&family=Inter:wght@400;500;600&display=swap');

:root {
  --bg-cover:  #053923;
  --bg-paper:  #EDEEE6;
  --ink:       #0D3622;
  --ink-inv:   #FFFFFB;
  --muted:     #84927A;
  --rule:      #BCBFB6;
  --font-serif: 'Spectral', Georgia, serif;
  --font-sans:  'Inter', 'Helvetica Neue', Arial, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
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
  position: relative;
  background: var(--bg-paper);
  color: var(--ink);
  font-family: var(--font-sans);
  page-break-after: always;
  overflow: hidden;
}
.page:last-child { page-break-after: avoid; }

@media print {
  body { background: none; padding: 0; gap: 0; }
  .page { box-shadow: none; height: 297mm; }
}

.page.cover {
  background: var(--bg-cover);
  color: var(--ink-inv);
}

/* ── Content area ── */
.content {
  padding: 88px 88px 120px 88px;
  max-width: 100%;
}

.text-column {
  max-width: 720px;
}

/* ── Footer ── */
.footer {
  position: absolute;
  bottom: 56px;
  left: 88px;
  right: 88px;
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
  display: flex;
  gap: 56px;
  z-index: 2;
}

/* ── Typography: Headings (serif) ── */
.cover-title {
  position: absolute;
  top: 88px;
  left: 88px;
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 400;
  line-height: 1.15;
  color: var(--ink-inv);
}
.cover-title div {
  white-space: nowrap;
}

.section-heading {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0;
  color: var(--ink);
  margin-bottom: 32px;
}

/* ── Typography: Body (sans) ── */
.sub-heading {
  font-size: 15px;
  font-weight: 400;
  line-height: 1.4;
  margin: 28px 0 4px 0;
  color: var(--ink);
}

.body {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.55;
  margin-bottom: 8px;
  color: var(--ink);
}

.body strong {
  font-weight: 600;
}

/* ── Lists ── */
.prose-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 56px;
  max-width: 680px;
}
.prose-list li {
  font-size: 14px;
  line-height: 1.55;
  font-weight: 400;
  position: relative;
  padding-left: 20px;
  margin-bottom: 12px;
  color: var(--ink);
}
.prose-list li::before {
  content: "\\2022";
  position: absolute;
  left: 0;
  top: 0;
  color: var(--ink);
}

.prose-list-ol {
  padding-left: 76px;
  margin: 12px 0 0 0;
  max-width: 680px;
}
.prose-list-ol li {
  font-size: 14px;
  line-height: 1.55;
  font-weight: 400;
  margin-bottom: 12px;
  color: var(--ink);
}

/* ── Tables ── */
.contract-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}
.contract-table th,
.contract-table td {
  text-align: left;
  padding: 9px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 13px;
  line-height: 1.45;
  vertical-align: top;
  color: var(--ink);
}
.contract-table th {
  font-weight: 600;
  padding-bottom: 10px;
}
.contract-table td {
  font-weight: 400;
}
.contract-table td:first-child {
  font-weight: 600;
  width: 45%;
}

/* ── Signature fields ── */
.sig-stack {
  max-width: 440px;
  margin-top: 32px;
}
.sig-field {
  margin-bottom: 36px;
}
.sig-label {
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 14px;
  color: var(--ink);
}
.sig-value {
  font-size: 11px;
  font-weight: 400;
  padding-left: 8px;
  margin-bottom: 12px;
  color: var(--ink);
}
.sig-signature {
  padding-left: 8px;
  height: 42px;
  display: flex;
  align-items: flex-end;
}
.sig-cite {
  font-size: 10px;
  font-weight: 400;
  padding-left: 8px;
  color: var(--ink);
  margin-top: 2px;
}
.sig-line {
  height: 1px;
  background: var(--rule);
}

/* ── Brand mark (cover only) ── */
.brand-mark {
  position: absolute;
  right: -40px;
  bottom: -60px;
  z-index: 1;
}
`

// ─── Pagination script (runs inside iframe to split overflowing pages) ──────

function getPaginationScript(): string {
  // Use a right single quote for "cont'd"
  const contd = " cont\u2019d"
  return `<script>
(function(){
var ruler=document.createElement('div');
ruler.style.cssText='height:297mm;position:absolute;visibility:hidden';
document.body.appendChild(ruler);
var PAGE_H=ruler.offsetHeight;
ruler.remove();
var CONTD='${contd}';
function run(){
var safety=0;
while(safety++<100){
var didSplit=false;
var pages=document.querySelectorAll('.page:not(.cover)');
for(var i=0;i<pages.length;i++){
var page=pages[i];
var textCol=page.querySelector('.text-column');
if(!textCol||textCol.children.length<=1)continue;
page.style.overflow='visible';
var real=page.scrollHeight;
page.style.overflow='';
if(real<=PAGE_H)continue;
var heading=page.querySelector('.section-heading');
var pageRect=page.getBoundingClientRect();
var maxBot=pageRect.top+PAGE_H-120;
var ch=Array.from(textCol.children);
var si=ch.length;
for(var j=0;j<ch.length;j++){
if(ch[j].getBoundingClientRect().bottom>maxBot){si=j;break;}
}
if(si<1)si=1;
if(si>=ch.length)continue;
var base=heading?heading.textContent.replace(new RegExp(CONTD+'$'),''):'';
var footer=page.querySelector('.footer');
var np=document.createElement('section');
np.className='page';
np.innerHTML='<div class="content"><h2 class="section-heading">'+base+CONTD+'</h2><div class="text-column"></div></div>'+(footer?footer.outerHTML:'');
var ntc=np.querySelector('.text-column');
for(var k=ch.length-1;k>=si;k--)ntc.insertBefore(ch[k],ntc.firstChild);
page.parentNode.insertBefore(np,page.nextSibling);
didSplit=true;break;
}
if(!didSplit)break;
}
}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);
else window.addEventListener('load',run);
})();
<` + `/script>`
}

// ─── Main export ────────────────────────────────────────────────────────────

export function renderContractHtml(contract: ParsedContract, filledVars: Record<string, string> = {}): string {
  const { frontMatter, sections } = contract

  const pages: string[] = []

  // Cover page (always first, generated from front-matter)
  pages.push(renderCover(frontMatter, filledVars))

  // Content / signing pages
  for (const section of sections) {
    if (section.type === 'signing') {
      pages.push(renderSigningPage(section, frontMatter, filledVars))
    } else {
      pages.push(renderContentPage(section, frontMatter, filledVars))
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${studioSixtyOneCSS}</style>
</head>
<body>
${pages.join('\n')}
${getPaginationScript()}
</body>
</html>`
}

export { studioSixtyOneCSS }
