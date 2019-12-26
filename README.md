dotfiles
========

Clone and `npm i` as usual.

## Prerequisites

If you want to use the differ, then install _git_, _nano_, _node_, _meld_.

### MacOS

1. [update bash](https://johndjameson.com/blog/updating-your-shell-with-homebrew/)
2. `brew install git nano node`
3. `brew cask install meld`

## Npm scripts

- `npm run lint` - standard linter
- `npm run help` - prints diff section below
- `npm run diff` - interactive differ, see below

### Diffing

Please set `DIFF_TOOL` env param to your favorite diff tool.
By default the script uses `meld`.

Filenames may be shortened so far (`bash_profile` as `ba`, `gitignore` as `gi` etc).

> * `npm run diff -- bash_profile`
> * `npm run diff:bp`, `npm run diff:ba`, `npm run diff:gi` etc.
> * supported files and aliases:
>   * `bp`: `.bash_profile`
>   * `br`: `.bashrc` (alias for bash_profile)
>   * `bs`: `.bash_secret`
>   * `gc`: `.gitconfig`
>   * `gi`: `.gitignore`
>   * `tmux`: `.tmux.conf`
>   * `screen`: `.screenrc`
>   * `mc`: `.config/mc/menu` (mc user menu)
