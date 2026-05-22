# xTeVe — Home Assistant Add-on

M3U Proxy for Plex DVR and Emby/Jellyfin Live TV.

xTeVe emulates a SiliconDust HDHomeRun network tuner, letting apps like **Plex DVR**, **Emby**, and **Jellyfin** use any M3U playlist and XMLTV EPG as if they were a real live TV tuner — all from inside Home Assistant.

## Features

- M3U and XMLTV/EPG proxy
- HDHomeRun emulation for Plex DVR / Emby / Jellyfin
- Stream filtering and reordering
- Web UI accessible via HA ingress (sidebar) or direct port
- Persistent config stored in add-on data directory

## Installation

1. In Home Assistant go to **Settings → Add-ons → Add-on Store**
2. Click ⋮ → **Repositories** and add `https://github.com/matsob0123/hassio-addons`
3. Find **xTeVe** and click **Install**
4. Set your options (timezone etc.) and click **Start**
5. Click **Open Web UI** or go to `http://<your-ha-ip>:34400/web`

## First-run setup

On first launch xTeVe will ask you to complete initial setup:

1. Set the number of tuners (match your M3U source limit)
2. Add your M3U playlist URL
3. Add your XMLTV/EPG URL (optional)
4. In xTeVe settings set the FFmpeg path if using stream transcoding

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `TZ` | `Europe/Warsaw` | Container timezone (e.g. `Europe/London`, `America/New_York`) |
| `PUID` | `1000` | User ID used for file ownership inside the container |
| `PGID` | `1000` | Group ID used for file ownership inside the container |

## Network

| Port | Protocol | Description |
|------|----------|-------------|
| `34400` | TCP | xTeVe web interface and HDHomeRun proxy |

## Support

- [xTeVe upstream](https://github.com/SenexCrenshaw/xTeVe)
- [This add-on repository](https://github.com/matsob0123/hassio-addons)
