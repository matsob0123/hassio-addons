# xTeVe — Documentation

## What is xTeVe?

xTeVe acts as a middleware layer between your M3U IPTV source and media applications like **Plex DVR**, **Emby**, and **Jellyfin**. It presents itself as an HDHomeRun network tuner so those apps can discover and use it without any special plugin.

## Configuration options

### `TZ`
Timezone for the container. Uses standard TZ database names.

Examples: `Europe/Warsaw`, `Europe/London`, `America/New_York`, `Asia/Tokyo`

Default: `Europe/Warsaw`

### `PUID` / `PGID`
User and group ID used when the container writes files to `/data`. Set these to match the user that owns your media files if you need consistent permissions.

Default: `1000` / `1000`

## First-run wizard

When you open the web UI for the first time, xTeVe walks you through:

1. **Tuner count** — set this to the maximum simultaneous streams your M3U provider allows
2. **M3U source** — paste your M3U playlist URL
3. **XMLTV/EPG source** — paste your EPG URL (optional but recommended for guide data)

## Connecting to Plex DVR

1. In Plex, go to **Settings → Live TV & DVR → Set Up Plex DVR**
2. Plex will auto-discover xTeVe on the local network via HDHomeRun protocol
3. Select xTeVe as your tuner and follow the wizard

## Connecting to Emby / Jellyfin

1. Go to **Dashboard → Live TV**
2. Add a new tuner — choose **HDHomeRun**
3. Enter `http://<your-ha-ip>:34400` as the tuner URL

## Data storage

All xTeVe configuration is stored in the add-on's own data directory (`/data/conf`). It persists across restarts and updates.

## Ports

| Port | Use |
|------|-----|
| `34400` | Web UI at `/web`, HDHomeRun API, stream proxy |

## Ingress

When accessed via the HA sidebar the add-on opens directly at `/web`. The ingress proxy passes traffic through Home Assistant so no extra firewall rules are needed for internal access.
