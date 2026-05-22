# xTeVe — Home Assistant Add-on

M3U Proxy for Plex DVR and Emby/Jellyfin Live TV.

xTeVe emulates a SiliconDust HDHomeRun network tuner, letting **Plex DVR**, **Emby**, and **Jellyfin** use any M3U playlist and XMLTV EPG as if they were a real live TV tuner — all from inside Home Assistant.

## Features

- M3U and XMLTV/EPG proxy
- HDHomeRun emulation for Plex DVR / Emby / Jellyfin
- **FFmpeg** bundled for stream re-streaming and remuxing
- **SSDP** — Plex auto-discovers xTeVe on the local network
- **Watchdog** — HA automatically restarts the add-on if it crashes
- Web UI authentication (username + password)
- Persistent config in the add-on data directory

## Installation

1. Go to **Settings → Add-ons → Add-on Store**
2. Click ⋮ → **Repositories** → add `https://github.com/matsob0123/hassio-addons`
3. Find **xTeVe** and click **Install**
4. Set options (timezone, optional credentials) and click **Start**
5. Open `http://<your-ha-ip>:34400/web`

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `TZ` | `Europe/Warsaw` | Container timezone |
| `PUID` | `1000` | User ID for file ownership |
| `PGID` | `1000` | Group ID for file ownership |
| `ssdp` | `true` | Enable SSDP so Plex auto-discovers xTeVe |
| `username` | _(empty)_ | Web UI username — set to enable authentication |
| `password` | _(empty)_ | Web UI password — set to enable authentication |
| `log_level` | `info` | Logging verbosity: `info` or `debug` |

## Network

| Port | Protocol | Description |
|------|----------|-------------|
| `34400` | TCP | Web UI (`/web`), HDHomeRun API, stream proxy |

## FFmpeg

FFmpeg is pre-installed. In xTeVe's settings, set the FFmpeg path to `/usr/bin/ffmpeg`.

## Support

- [xTeVe upstream](https://github.com/SenexCrenshaw/xTeVe)
- [This repository](https://github.com/matsob0123/hassio-addons)
