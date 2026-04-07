# MakeMKV Wrapper — Home Assistant Add-on

A Home Assistant add-on that wraps [jlesage/docker-makemkv](https://github.com/jlesage/docker-makemkv)
to provide a full MakeMKV disc-ripping GUI accessible from the HA sidebar.

## Features

- 🖥️ Full MakeMKV GUI via browser (Ingress — no extra port needed)
- 💿 Automatic disc ripper (insert and forget)
- 📁 Configurable output to `/media` or `/share`
- 🔒 AppArmor hardened
- 🏗️ Multi-arch: `amd64` and `aarch64`

## Installation

Add this repository URL to your Home Assistant add-on store, then install
**MakeMKV Wrapper**.

See [DOCS.md](DOCS.md) for full configuration reference.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Credits

- Original Docker image: [jlesage/docker-makemkv](https://github.com/jlesage/docker-makemkv)
- HA add-on port: matsob0123
