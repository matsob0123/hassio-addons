# 📀 MakeMKV Wrapper — Home Assistant Add-on

> **Ported and maintained by [matsob0123](https://github.com/matsob0123)**  
> Upstream container: [jlesage/docker-makemkv](https://github.com/jlesage/docker-makemkv)

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-add--on-blue?logo=home-assistant)](https://www.home-assistant.io/)
[![Version](https://img.shields.io/badge/version-2.0.0-green)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Rip DVDs and Blu-rays directly from your browser — fully integrated into the
Home Assistant sidebar with AppArmor hardening, auto-ripper, VNC display,
and fine-grained options.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🌐 Web UI | Full MakeMKV GUI via noVNC in the HA sidebar |
| 🔒 AppArmor | Bundled profile — limits container to exactly what it needs |
| 🤖 Auto-ripper | Insert disc → rip starts automatically |
| ⏏️ Auto-eject | Tray opens when ripping is done |
| 🔑 License key | Enter your key (or use the rolling beta key) |
| 📁 Output path | Configurable — default `/media/makemkv` |
| 🌍 Timezone | Correct log timestamps and scheduler |
| 🎨 Dark mode | Dark theme option for the web UI |
| 🇨🇳 CJK fonts | Optional CJK font support |
| 🧊 CPU niceness | Keep ripping low-priority in the background |

---

## 🛠 Requirements

- Home Assistant OS or Supervised installation
- An optical drive attached to the host (e.g. `/dev/sr0`)
- The drive must appear **before** starting the add-on

---

## 🚀 Installation

### 1 — Add the repository

Go to **Settings → Add-ons → Add-on Store → ⋮ → Repositories** and add:

```
https://github.com/matsob0123/hass-makemkv
```

### 2 — Install

Find **MakeMKV Wrapper** in the list and click **Install**.

### 3 — Configure (optional)

Before starting, open the **Configuration** tab and adjust:

- `makemkv_key` — your license key (leave empty for beta key)
- `timezone` — e.g. `Europe/Warsaw`
- `auto_disc_ripper` — enable/disable headless ripping
- `output_path` — where to save rips

### 4 — Start

Click **Start**. Open the **MakeMKV** entry in the sidebar.

---

## ⚙️ Configuration Reference

See [`DOCS.md`](DOCS.md) for detailed option descriptions, or hover over any
option in the HA UI — all options have descriptions via `translations/en.yaml`.

---

## 🔒 AppArmor

This add-on ships with a custom AppArmor profile (`apparmor.txt`).
It is loaded automatically when AppArmor is enabled on the host (default on
Home Assistant OS).

The profile allows:
- Read/write to `/media`, `/share`, `/config`, `/addon_configs/makemkv_wrapper`
- Access to optical drives (`/dev/sr*`, `/dev/sg*`)
- TCP and Unix socket networking (VNC)

It **denies** access to `/proc/sysrq-trigger`, `/sys/firmware`, SSH keys, and
other sensitive host paths.

> **Note:** If the add-on fails to start with AppArmor enabled, check
> `ha addon logs makemkv_wrapper`. You can set `apparmor: false` in
> `config.yaml` as a temporary workaround, then file an issue.

---

## 🗂 Output Paths

| Container path | Host path |
|---------------|-----------|
| `/media/makemkv` | `/media/` (HA media library) |
| `/share/makemkv` | `/config/share/makemkv` |
| `/config` | `/addon_configs/makemkv_wrapper/` |

The `output_path` option sets where MakeMKV saves ripped files.

---

## 🤖 Auto Disc Ripper

Enable `auto_disc_ripper: true` to start ripping automatically when a disc
is inserted. No browser interaction needed.

Key options:

| Option | Default | Description |
|--------|---------|-------------|
| `auto_disc_ripper_eject` | true | Eject when done |
| `auto_disc_ripper_interval` | 5 s | Drive poll frequency |
| `auto_disc_ripper_min_title_length` | 600 s | Skip short titles (trailers) |
| `auto_disc_ripper_bd_mode` | mkv | `mkv` or `backup` for Blu-ray |
| `auto_disc_ripper_parallel_rip` | false | Rip all drives at once |

---

## 🔑 License Key

MakeMKV requires a license key for Blu-ray decryption.

- **Beta key:** Leave `makemkv_key` empty. The jlesage container fetches the
  latest rolling beta key automatically.
- **Personal key:** Paste your T-... key into `makemkv_key`.

---

## 🐛 Troubleshooting

### Add-on won't start

```bash
ha addon logs makemkv_wrapper
```

Common causes:
- `/dev/sr0` doesn't exist → plug in and reconnect drive, then restart add-on
- AppArmor denial → check `dmesg | grep DENIED` on host

### Drive not detected

Check host devices:
```bash
ls -la /dev/sr* /dev/sg*
```

If you have a second drive, add `/dev/sr1` to the `devices` list in `config.yaml`.

### Rips appear in wrong location

Check `output_path`. The path is **inside the container**. `/media/makemkv`
maps to the HA media folder; `/share/makemkv` maps to `/config/share/makemkv`.

---

## 📜 Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## 🙏 Credits

- **[jlesage](https://github.com/jlesage)** — the excellent `docker-makemkv` image
- **[MakeMKV](https://www.makemkv.com/)** — the underlying software
- **matsob0123** — Home Assistant add-on port (v2)

---

## 📄 License

MIT © matsob0123
