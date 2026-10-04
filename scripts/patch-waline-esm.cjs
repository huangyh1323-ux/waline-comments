/**
 * Patch @waline/vercel to fix ERR_REQUIRE_ESM crash on Netlify.
 *
 * The markdown service does `require('@mdit/plugin-emoji')` at the top level,
 * but @mdit/plugin-emoji is ESM-only, which crashes Node.js `require()`.
 * Upstream converted all other mdit plugins to dynamic `import()` but missed
 * this one. This postinstall script applies the same fix.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@waline',
  'vercel',
  'src',
  'service',
  'markdown',
  'index.js'
);

if (!fs.existsSync(target)) {
  console.log('[patch-waline-esm] target not found, skipping:', target);
  process.exit(0);
}

let code = fs.readFileSync(target, 'utf8');

const oldRequire = `const { fullEmoji } = require('@mdit/plugin-emoji');\n`;
const oldEmojiBlock = `  // parse emoji
  if (emoji !== false) {
    markdownIt.use(fullEmoji, typeof emoji === 'object' ? emoji : {});
  }`;
const newEmojiBlock = `  // parse emoji
  if (emoji !== false) {
    const { fullEmoji } = await import('@mdit/plugin-emoji');
    markdownIt.use(fullEmoji, typeof emoji === 'object' ? emoji : {});
  }`;

if (!code.includes(oldRequire)) {
  console.log('[patch-waline-esm] already patched or upstream fixed, skipping');
  process.exit(0);
}

code = code.replace(oldRequire, '');

if (!code.includes(oldEmojiBlock)) {
  console.error('[patch-waline-esm] emoji block not found, aborting patch');
  process.exit(1);
}
code = code.replace(oldEmojiBlock, newEmojiBlock);

fs.writeFileSync(target, code);
console.log('[patch-waline-esm] patched ESM require in @waline/vercel markdown service');
