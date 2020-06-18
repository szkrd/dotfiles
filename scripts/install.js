let fs = require('fs')
const { promisify } = require('util')
const chalk = require('chalk')
const os = require('os')
const path = require('path')

fs = ['unlink', 'symlink'].reduce((acc, name) => {
  acc[name] = promisify(fs[name])
  return acc
}, {})

const PRJ = path.join(path.dirname(process.argv[1]), '/..')
const HOME = os.homedir()

function die (message = 'error', code = 1) {
  console.error(message)
  process.exit(code)
}

async function link (from, to, backup, eject, dryRun) {
  if (backup) die('backup not implemented')
  if (!to) to = from.replace(/^\$PRJ\/src\/(common|linux|macos)/, '~').replace('/_', '/.')
  from = from.replace(/(\$HOME|~)/g, HOME).replace(/\$PRJ/g, PRJ)
  to = to.replace(/(\$HOME|~)/g, HOME).replace(/\$PRJ/g, PRJ)
  if (dryRun) {
    console.info(chalk.grey(`skipping "${from}" -> "${to}"`))
    return
  }
  try { await fs.unlink(to) } catch (e) {}
  if (eject) {
    await fs.copyFile(from, to)
  } else {
    await fs.symlink(from, to)
  }
  console.info(`linked "${from}" -> "${to}"`)
}

const skip = (from, to) => link(from, to, false, false, true)

async function main () {
  const platform = os.platform()
  if (platform !== 'linux') {
    die('only linux so far, sry')
  }
  skip('$PRJ/src/common/_env_work')
  skip('$PRJ/src/common/_env_secret')
  await link('$PRJ/src/common/_bash_profile', '~/.bashrc')
  await link('$PRJ/src/common/_bash_aliases')
  await link('$PRJ/src/common/_screenrc')
  await link('$PRJ/src/common/_tmux.conf')
  await link('$PRJ/src/common/_config/mc/hotlist')
  await link('$PRJ/src/common/_config/mc/menu')
  skip('$PRJ/src/linux/_fluxbox/init')
  await link('$PRJ/src/linux/_fluxbox/keys')
  await link('$PRJ/src/linux/_fluxbox/menu')
  await link('$PRJ/src/linux/_fluxbox/startup')
  skip('$PRJ/src/macos/_gitconfig')
  skip('$PRJ/src/macos/_gitignore')
}

main().catch(error => console.error(chalk('unexpected error!'), error))
