/**
 * Copies scripts/cursor-terminal-init.example.ps1 -> scripts/cursor-terminal-init.ps1
 * (gitignored). Required before using the "Captivate local Node" integrated terminal
 * profile on Windows. See README (Developers → Optional local terminal).
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const src = path.join(root, 'scripts', 'cursor-terminal-init.example.ps1')
const dst = path.join(root, 'scripts', 'cursor-terminal-init.ps1')

if (!fs.existsSync(src)) {
  console.error('[captivate] Missing', src)
  process.exit(1)
}
fs.copyFileSync(src, dst)
console.log('[captivate] Wrote', path.relative(root, dst))
console.log(
  '[captivate] In Cursor/VS Code: use terminal profile "Captivate local Node", or set in User settings:\n' +
    '  "terminal.integrated.defaultProfile.windows": "Captivate local Node"'
)
