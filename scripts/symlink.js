let fs = require('fs').promises
const chalk = require('chalk')
const os = require('os')
const path = require('path')

const PRJ = path.join(path.dirname(process.argv[1]), '/..')
const HOME = os.homedir()

function die (message = 'error', code = 1) {
  console.error(message)
  process.exit(code)
}

async function md (dirName, flush) {
  if (flush) {
    try { await fs.rmdir(dirName, { recursive: true }) } catch (err) {}
  }
  try {
    await fs.access(dirName)
    return true
  } catch (err) {}
  try {
    await fs.mkdir(dirName, { recursive: true })
    return true
  } catch (err) {
    console.error(`Could not create dir "${dirName}"`)
  }
}

async function link (from, to, backup, mode = 'normal', dryRun) {
  if (backup) die('backup not implemented')
  if (!to) to = from.replace(/^\$PRJ\/src\/(common|linux|macos)/, '~').replace('/_', '/.')
  from = from.replace(/(\$HOME|~)/g, HOME).replace(/\$PRJ/g, PRJ)
  to = to.replace(/(\$HOME|~)/g, HOME).replace(/\$PRJ/g, PRJ)
  if (dryRun) {
    console.info(chalk.grey(`skipping "${from}" -> "${to}"`))
    return
  }
  // copy file from here, instead of symlinking
  if (mode === 'eject') {
    try { await fs.unlink(to) } catch (e) {}
    await fs.copyFile(from, to)
    console.info(`copied "${from}" -> "${to}"`)
    return
  }
  // link target back to project, into the "reverse" directory
  if (mode === 'reverse-only') {
    let baseName = path.basename(from)
    if (!baseName.includes('_')) {
      baseName = '_' + from.split('_')[1].replace(/\//g, '_') // _foo/file -> _foo_foofile
    }
    const targetHere = `${PRJ}/reverse/${baseName}`
    try { await fs.unlink(targetHere) } catch (e) {}
    await fs.symlink(to, targetHere)
    console.info(chalk.yellow(`reverse linked "${to}" -> "${targetHere}"`))
    return
  }
  // proper symlink (from project to home)
  try { await fs.unlink(to) } catch (e) {}
  await fs.symlink(from, to)
  console.info(chalk.blue(`linked "${from}" -> "${to}"`))
  // and from project to project (as a shortcut, to have everything in the same place)
  const localLink = PRJ + '/reverse.prj/_' + from.replace(/^[^_]*_/, '').replace(/\//g, '_')
  try { await fs.unlink(localLink) } catch (e) {}
  await fs.symlink(from, localLink)
}

const skip = (from, to) => link(from, to, false, 'eject', true)
const reverseOnly = async (from, to) => link(from, to, false, 'reverse-only')

async function main () {
  const platform = os.platform()
  if (platform !== 'linux') {
    die('only linux so far, sry')
  }
  await md(`${PRJ}/reverse`, true)
  await md(`${PRJ}/reverse.prj`, true)
  await Promise.all([
    reverseOnly('$PRJ/src/common/_bash_env_work'),
    reverseOnly('$PRJ/src/common/_bash_secret'),
    link('$PRJ/src/common/_bash_profile', '~/.bashrc'),
    link('$PRJ/src/common/_bash_aliases'),
    link('$PRJ/src/common/_screenrc'),
    link('$PRJ/src/common/_tmux.conf'),
    link('$PRJ/src/common/_config/mc/hotlist'),
    link('$PRJ/src/common/_config/mc/menu'),
    skip('$PRJ/src/linux/_fluxbox/init'),
    link('$PRJ/src/linux/_fluxbox/keys'),
    link('$PRJ/src/linux/_fluxbox/menu'),
    link('$PRJ/src/linux/_fluxbox/startup'),
    link('$PRJ/src/common/_gitconfig'),
    link('$PRJ/src/common/_gitignore')
  ])
}

main().catch(error => console.error(chalk('unexpected error!'), error))
