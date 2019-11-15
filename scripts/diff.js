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
const args = process.argv.slice(2)
const projectLocation = path.join(path.dirname(process.argv[1]), '/..')
const platform = os.platform()
const isMacOS = platform === 'darwin'
const isLinux = platform === 'linux'
const diffTool = process.env.DIFF_TOOL || 'meld'
let platformNiceName = { darwin: 'macos', linux: 'linux', win: 'win32' }[platform] || platform

const fnTemplates = {
  br: 'bash_profile', // alias for bashrc
  bp: 'bash_profile',
  ba: 'bash_aliases',
  bs: 'bash_secret',
  gc: 'gitconfig',
  gi: 'gitignore',
  tmux: 'tmux.conf',
  screen: 'screenrc'
}

const getDiffByteCount = (a, b) => {
  const leftContents = fs.readFileSync(a, 'utf-8')
  const rightContents = fs.readFileSync(b, 'utf-8')
  const normalize = s => s.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalize(leftContents).length - normalize(rightContents).length
}

const getLeftFileName = (fn) => {
  const selectLeftByPlatform = (s = 'common') => path.join(projectLocation, 'src', s, `_${fn}`)
  let leftFile = selectLeftByPlatform()
  // if "common" did not work, try it with the platform specific override, then with 'macos'
  if (!fs.existsSync(leftFile)) {
    leftFile = selectLeftByPlatform(platformNiceName)
  }
  if (!fs.existsSync(leftFile)) {
    leftFile = selectLeftByPlatform('macos')
  }
  return leftFile
}

const getRightFileName = (fn) => {
  let rightFile = path.join(userHome, `.${fn}`)
  // nowadays I use bashrc-only setups
  if (fn === 'bash_profile' && isLinux) {
    rightFile = rightFile.replace(/_profile$/, 'rc')
  }
  return rightFile
}

const getLeftAndRightFileNames = (fn) => {
  let leftFile = getLeftFileName(fn)
  let rightFile = getRightFileName(fn)
  return [leftFile, rightFile]
}

const launchDiffer = (a, b) => {
  const subProcess = childProcess.spawn(diffTool, [a, b], {
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

if (!isMacOS && !isLinux) {
  log.warn(`Platform "${platform}" has not been tested. It may or may not work.`)
}

if (!commandExistsSync(diffTool)) {
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
