# MakeMKV Wrapper — Documentation

> **⚠️ Maintainer note:** Please change the `version` field in `config.yaml`
> to a value **higher than `2.0.3`** before publishing any update. Home Assistant
> uses the version number to detect and offer updates to users.

## Overview

MakeMKV Wrapper is a Home Assistant add-on that runs
[jlesage/docker-makemkv](https://github.com/jlesage/docker-makemkv) inside
the HA supervisor. It provides:

- A full MakeMKV GUI accessible from the HA sidebar (via Ingress)
- An automatic disc ripper that starts ripping the moment you insert a disc
- Configurable output paths (media folder, share folder, or custom path)
- AppArmor hardening

---

## First-time setup

1. Install the add-on from your repository.
2. Plug in your USB or internal optical drive.
3. Go to **Configuration** and set at minimum:
   - **Output path** — where ripped files are saved (default: `/media/makemkv`)
   - **MakeMKV license key** — your personal key or leave blank for the beta key
4. Click **Save**, then **Start**.
5. Open the web UI from the sidebar (**MakeMKV** panel) or via **Open Web UI**.

---

## Configuration options

| Option | Default | Description |
|--------|---------|-------------|
| `makemkv_key` | _(empty)_ | Personal MakeMKV key (T-...). Empty = rolling beta key. |
| `puid` | `1000` | UID that MakeMKV runs as inside the container. |
| `pgid` | `1000` | GID that MakeMKV runs as inside the container. |
| `umask` | `0022` | File creation mask for ripped files. |
| `timezone` | `Europe/Warsaw` | TZ name (e.g. `America/New_York`). |
| `display_width` | `1280` | Virtual desktop width in pixels. |
| `display_height` | `768` | Virtual desktop height in pixels. |
| `vnc_password` | _(empty)_ | VNC password. Empty = no password. |
| `auto_disc_ripper` | `false` | Rip automatically when disc is inserted. |
| `auto_disc_ripper_eject` | `true` | Eject disc after ripping. |
| `auto_disc_ripper_parallel_rip` | `false` | Rip multiple drives at once. |
| `auto_disc_ripper_interval` | `5` | How often (seconds) to poll for a disc. |
| `auto_disc_ripper_min_title_length` | `600` | Skip titles shorter than this (seconds). |
| `auto_disc_ripper_bd_mode` | `mkv` | `mkv` or `backup` for Blu-rays. |
| `auto_disc_ripper_force_unique_output_dir` | `false` | Never overwrite existing rips. |
| `output_path` | `/media/makemkv` | Container path for ripped files. |
| `keep_app_running` | `true` | Restart MakeMKV if it crashes. |
| `app_niceness` | `0` | CPU priority: -20 (highest) to 19 (lowest). |
| `enable_cjk_font` | `false` | Install CJK fonts for Asian disc metadata. |
| `dark_mode` | `false` | Dark theme for the web UI. |
| `log_level` | `info` | Log verbosity: `info`, `debug`, or `trace`. |

---

## Multiple optical drives

Add extra device entries in `config.yaml` under `devices:`:

```yaml
devices:
  - /dev/sr0
  - /dev/sr1
```

Enable `auto_disc_ripper_parallel_rip: true` to rip them simultaneously.

---

## Output paths

| Container path | Host path |
|----------------|-----------|
| `/media/makemkv` | HA media folder |
| `/share/makemkv` | `/config/share/makemkv` |

---

## Troubleshooting

### Container won't start / `/init` permission error
Make sure `init: false` is present in `config.yaml`. This add-on uses
s6-overlay v3 (via the jlesage base image) which must run as PID 1. If the HA
supervisor injects its own init process first, s6 refuses to start.

### Drive not detected
Check that `/dev/sr0` (or your drive node) exists on the host:
```bash
ls -la /dev/sr*
```
Add the correct device path to `config.yaml` under `devices:`.

### Permission errors on output folder
Set `puid` and `pgid` to match the owner of your output folder:
```bash
ls -lan /media
```

### Enable verbose logging
Set `log_level: debug` or `log_level: trace` in Configuration, then restart
and check the add-on log panel.
