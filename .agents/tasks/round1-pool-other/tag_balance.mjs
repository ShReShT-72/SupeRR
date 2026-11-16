// Tag-balance check for html files. Usage: node tag_balance.mjs file...
import fs from 'node:fs';
const VOID = new Set(['meta', 'link', 'br', 'hr', 'img', 'input', 'source']);
let failed = false;
for (const file of process.argv.slice(2)) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!doctype[^>]*>/i, '');
  text = text.replace(/<style[\s\S]*?<\/style>/g, '<style></style>').replace(/<script[^>]*>[\s\S]*?<\/script>/g, (m) => (m.includes('src=') ? '<script src="x"></script>' : '<script></script>'));
  const stack = [];
  const errors = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>/g;
  let m;
  let opens = 0;
  while ((m = re.exec(text))) {
    const [, close, nameRaw, , selfClose] = m;
    const name = nameRaw.toLowerCase();
    if (VOID.has(name) || selfClose) continue;
    if (!close) { stack.push(name); opens += 1; continue; }
    const top = stack.pop();
    if (top !== name) { errors.push(`mismatch: </${name}> closes <${top}> near offset ${m.index}: ${text.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\s+/g, ' ')}`); break; }
  }
  if (stack.length) errors.push(`unclosed: ${stack.slice(-5).join(', ')}`);
  console.log(`${file}: ${errors.length ? 'FAIL' : 'ok'} (${opens} elements opened)`);
  for (const e of errors) console.log('  ' + e);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
