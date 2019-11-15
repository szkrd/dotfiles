const fs = require('fs')
const os = require('os')
const childProcess = require('child_process')
const path = require('path')
const chalk = require('chalk')
const userHome = require('user-home')
const commandExistsSync = require('command-exists').sync

const getLogger = (color) => (s, ...args) => console.log(chalk[color](s), ...(args.length ? args : []))
const log = { error: getLogger('red'), warn: getLogger('yellow'), info: getLogger('white') }

const args = process.argv.slice(2)
const projectLocation = path.join(path.dirname(process.argv[1]), '/..')
const platform = os.platform()
const isMacOS = platform === 'darwin'
const isLinux = platform === 'linux'
const diffTool = process.env.DIFF_TOOL || 'meld'
let platformNiceName = { darwin: 'macos', linux: 'linux', win: 'win32' }[platform] || platform

if (!isMacOS && !isLinux) {
  log.warn(`Platform "${platform}" has not been tasted. It may or may not work.`)
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
  br: 'bash_profile', // alias for bashrc
  bp: 'bash_profile',
  ba: 'bash_aliases',
  bs: 'bash_secret',
  gc: 'gitconfig',
  gi: 'gitignore',
  tmux: 'tmux.conf',
  screen: 'screenrc'
}[fn] || fn

let leftFile = path.join(projectLocation, 'src', 'common', `_${fn}`)
let rightFile = path.join(userHome, `.${fn}`)

// if "common" did not work, try it with the platform specific override
if (!fs.existsSync(leftFile)) {
  leftFile = path.join(projectLocation, 'src', platformNiceName, `_${fn}`)
}

// nowadays I use bashr-only setups
if (fn === 'bash_profile' && isLinux) {
  rightFile = rightFile.replace(/_profile$/, 'rc')
}

log.info(`Comparing files:\nleft (repo):   ${chalk.red(leftFile)}\nright (yours): ${chalk.cyan(rightFile)}\n`)

const leftContents = fs.readFileSync(leftFile, 'utf-8')
const rightContents = fs.readFileSync(rightFile, 'utf-8')
const normalize = s => s.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
if (normalize(leftContents) === normalize(rightContents)) {
  log.info('The two files are identical. Bye.')
  process.exit(0)
}

const subProcess = childProcess.spawn(diffTool, [leftFile, rightFile], {
  detached: true,
  stdio: 'ignore'
})

subProcess.unref()
