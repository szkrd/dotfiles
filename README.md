dotfiles
========

Clone and `npm i` as usual.

## Prerequisites

### MacOS

1. [update bash](https://johndjameson.com/blog/updating-your-shell-with-homebrew/)
2. `brew install git`
3. `brew install nano`
4. `brew install node`
5. `brew cask install meld`
6. setup node [global installs](prefix=${HOME}/.npm-packages)

## Npm scripts

### Diffing

Please set `DIFF_TOOL` env param to your favorite diff tool.
By default the script uses `meld`.

Filenames may be shortened so far (`bash_profile` as `ba`, `gitignore` as `gi` etc).

- `npm run diff -- bash_profile`
- `npm run diff:bp`, `npm run diff:ba`, `npm run diff:gi` etc.

## TODO

1. show info about changed files
2. add batch merge
3. copy all to repo
4. arch linux supprt
