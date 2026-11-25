// Builds tiny, valid one-page PDFs for the demo's CV library (fictional person). No dependencies.
import crypto from 'node:crypto';

const esc = s => s.replace(/[\\()]/g, '\\$&');

export function makePdf(lines) {
  const text = ['BT', '/F1 12 Tf', '72 740 Td', '16 TL', ...lines.map((l, i) => `${i ? 'T* ' : ''}(${esc(l)}) Tj`), 'ET'].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const at = [];
  objs.forEach((o, i) => { at.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${at.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

// → { file, bytes } named like the server stores uploads (first 16 hex of the sha256, plus the extension).
export function storedPdf(lines) {
  const bytes = makePdf(lines);
  return { file: crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16) + '.pdf', bytes };
}
