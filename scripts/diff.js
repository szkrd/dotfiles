#!/usr/bin/env node
const fs = require('fs')
const os = require('os')
const childProcess = require('child_process')
const path = require('path')
const chalk = require('chalk')
const ask = require('just-ask')
const userHome = require('user-home')
const commandExistsSync = require('command-exists').sync

const getLogger = (color) => (s, ...args) => console.log(chalk[color](s), ...(args.length ? args : []))
const log = { error: getLogger('red'), warn: getLogger('yellow'), info: getLogger('white') }
let args = process.argv.slice(2)
let scriptLocation = process.argv[1]
try { scriptLocation = fs.readlinkSync(process.argv[1]) } catch (err) {}
const projectLocation = path.join(path.dirname(scriptLocation), '/..')
const platform = os.platform().replace(/\d/g, '') // 'darwin', 'linux', 'win'
const diffTool = process.env.DIFF_TOOL || 'meld'
const prefersPlatformSpecific = platform === 'win' // windows is an oddball, at least for now, so it prefers "win" dir over "common"
let platformNiceName = { darwin: 'macos', linux: 'linux', win: 'win' }[platform] || platform

const diffToolExtraParams = {
  'Code.exe,code': [ '--new-window', '--diff' ]
}

let fnTemplates = {
  br: 'bash_profile:bashrc', // left is bash_profile right is bashrc
  bp: 'bash_profile',
  ba: 'bash_aliases',
  bs: 'bash_secret',
  gc: 'gitconfig',
  gi: 'gitignore',
  tmux: 'tmux.conf',
  screen: 'screenrc',
  mcmenu: 'config/mc/menu',
  mcdirs: 'config/mc/hotlist'
}

// fluxbox related files
if (args.includes('flux')) {
  args = args.filter(s => s !== 'flux')
  fnTemplates = {
    init: 'fluxbox/init',
    keys: 'fluxbox/keys',
    menu: 'fluxbox/menu'
  }
}

const getDiffByteCount = (a, b) => {
  const leftContents = fs.readFileSync(a, 'utf-8')
  const rightContents = fs.readFileSync(b, 'utf-8')
  const normalize = s => s.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalize(leftContents).length - normalize(rightContents).length
}

const getLeftFileName = (fn) => {
  fn = fn.includes(':') ? fn.split(':')[0] : fn
  const selectLeftByPlatform = (s = 'common') => path.join(projectLocation, 'src', s, `_${fn}`)
  let leftFile = selectLeftByPlatform(prefersPlatformSpecific ? platformNiceName : 'common')
  if (!fs.existsSync(leftFile) && prefersPlatformSpecific) { leftFile = selectLeftByPlatform() } // try with common
  if (!fs.existsSync(leftFile)) { leftFile = selectLeftByPlatform(platformNiceName) } // try with platform
  return fs.existsSync(leftFile) ? leftFile : ''
}

const getRightFileName = (fn) => {
  fn = fn.includes(':') ? fn.split(':')[1] : fn
  let rightFile = path.join(userHome, `.${fn}`)
  return rightFile
}

const getLeftAndRightFileNames = (fn) => {
  let leftFile = getLeftFileName(fn)
  let rightFile = getRightFileName(fn)
  return [leftFile, rightFile]
}

const launchDiffer = (a, b) => {
  let extraParams = []
  Object.keys(diffToolExtraParams).forEach(lastParts => {
    lastParts.split(',').forEach(lastPart => {
      if (diffTool.endsWith(lastPart)) { extraParams = diffToolExtraParams[lastParts] }
    })
  })
  const subProcess = childProcess.spawn(diffTool, [...extraParams, a, b], {
    detached: true,
    stdio: 'ignore'
  })
  subProcess.unref()
}

const startNonInteractiveMode = (realArgs) => {
  realArgs = Array.isArray(realArgs) ? realArgs : [realArgs]
  let fn = realArgs[0].replace(/^[_.]/, '')
  fn = fnTemplates[fn] || fn
  const [ leftFile, rightFile ] = getLeftAndRightFileNames(fn)
  if (!leftFile) {
    log.info(chalk.yellow('Left file (repo) is missing, can\'t compare!'))
    return 0
  }
  log.info(`Comparing files:\nleft (repo):   ${chalk.red(leftFile)}\nright (yours): ${chalk.cyan(rightFile)}\n`)
  if (getDiffByteCount(leftFile, rightFile) === 0) {
    log.info(chalk.green('The two files are identical.\n'))
    return 0
  }
  launchDiffer(leftFile, rightFile)
  return 0
}

const printStatsForInteractiveMode = (fileNames) => {
  const longestFileName = Math.max(...fileNames.map(s => s.length))
  fileNames.forEach((name, i) => {
    const [ leftFile, rightFile ] = getLeftAndRightFileNames(name)
    if (!leftFile) {
      return
    }
    const diffCountInBytes = getDiffByteCount(leftFile, rightFile)
    const chalkColor = diffCountInBytes > 0 ? 'red' : (diffCountInBytes < 0 ? 'cyan' : 'white')
    const formattedName = (name + (new Array(20).join(' '))).substr(0, longestFileName + 1)
    log.info(`[${i}] ${chalk.yellow(formattedName)} -> ${chalk[chalkColor](diffCountInBytes)}`)
  })
  log.info('')
}

async function startInteractiveMode () {
  let selection = 0
  while (selection >= 0) {
    const fileNames = [...new Set(Object.values(fnTemplates))]
    printStatsForInteractiveMode(fileNames)
    selection = await ask('Select one (r to refresh)! ')
    if (/^r$/i.test(selection)) {
      log.info('\n----\n')
      selection = 0
      continue
    }
    selection = parseInt(selection, 10)
    selection = isNaN(selection) ? -1 : selection
    if (selection > -1) {
      startNonInteractiveMode(fileNames[selection])
    }
  }
}

// ----

if (!commandExistsSync(diffTool) && !fs.existsSync(diffTool)) {
  log.error(`Diff tool "${diffTool}" not found, exiting.`)
  process.exit(1)
}

if (args.length) {
  process.exit(startNonInteractiveMode(args))
} else {
  log.info('You can add a file name as a param, like "bash_profile" (or "bp") ' +
    'but you did not set anything, so I\'ll run in interactive mode.\n')
  startInteractiveMode().catch(log.error)
}
