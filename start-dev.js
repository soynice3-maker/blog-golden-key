const { spawn } = require('child_process')
const path = require('path')

const next = path.join(__dirname, 'node_modules', '.bin', 'next.cmd')
const child = spawn(next, ['dev'], { stdio: 'inherit', shell: false })
child.on('exit', code => process.exit(code))
