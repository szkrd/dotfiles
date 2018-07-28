const os = require('os')
const childProcess = require('child_process')
const path = require('path')
const chalk = require('chalk')
const userHome = require('user-home')
const commandExistsSync = require('command-exists').sync

const getLogger = (color) => (s, ...args) => console.log(chalk[color](s), ...(args.length ? args : []))
const log = { error: getLogger('red'), warn: getLogger('yellow'), info: getLogger('green') }

const args = process.argv.slice(2)
const projectLocation = path.join(path.dirname(process.argv[1]), '/..')
const platform = os.platform()
const isMacOS = platform === 'darwin'
const diffTool = process.env.DIFF_TOOL || 'meld'
let platformNiceName = { darwin: 'macos', linux: 'linux', win: 'win32' }[platform] || platform

if (!isMacOS) {
  log.warn(`Platform "${platform}" has not been tasted. It may or may not work.`)

  // TODO: come up w smg nicer, like merging platforms etc.
  if (platformNiceName === 'linux') {
    log.info('You are using linux, which is great! Falling back to macos dir.')
    platformNiceName = 'macos'
  }
}

if (!commandExistsSync(diffTool)) {
  log.error(`Diff tool "${diffTool}" not found, exiting.`)
  process.exit(1)
}

if (!args.length) {
  log.error('Please add a file name as a param, like "bash_profile" (or "bp")!')
  process.exit(2)
}

let fn = args[0].replace(/^[_.]/, '')
fn = {
  bp: 'bash_profile',
  ba: 'bash_aliases',
  bs: 'bash_secret',
  gc: 'gitconfig',
  gi: 'gitignore'
}[fn] || fn

const subProcess = childProcess.spawn(diffTool, [
  path.join(projectLocation, 'src', platformNiceName, `_${fn}`),
  path.join(userHome, `.${fn}`)
], {
  detached: true,
  stdio: 'ignore'
})

subProcess.unref()
