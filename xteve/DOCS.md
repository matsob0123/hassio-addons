# xTeVe — Documentation

## What is xTeVe?

xTeVe acts as a middleware layer between your M3U IPTV source and media apps like **Plex DVR**, **Emby**, and **Jellyfin**. It presents itself as an HDHomeRun network tuner so those apps discover and use it without any special plugin.

---

## Configuration options

### `TZ`
Timezone for the container. Uses standard TZ database names.
Examples: `Europe/Warsaw`, `Europe/London`, `America/New_York`, `Asia/Tokyo`
Default: `Europe/Warsaw`

### `PUID` / `PGID`
User and group ID for file ownership inside the container.
Default: `1000` / `1000`

### `ssdp`
When `true`, xTeVe broadcasts itself on the local network via SSDP so that **Plex DVR** can discover it automatically without manual configuration.
Requires `host_network: true` (already enabled).
Default: `true`

### `username` / `password`
Optional. When both are set, xTeVe's web UI requires login. Credentials are written to the xTeVe config on **first run only** — changing them afterwards must be done inside xTeVe's own settings page.
Default: _(empty — no authentication)_

### `log_level`
`info` for normal operation, `debug` for verbose output visible in the HA add-on log.
Default: `info`

---

## First-run wizard

On first launch, open `http://<your-ha-ip>:34400/web` and complete setup:

1. **Tuner count** — set to the max simultaneous streams your M3U provider allows
2. **M3U source** — paste your M3U playlist URL
3. **XMLTV/EPG source** — paste your EPG URL (optional but recommended)
4. **FFmpeg path** — set to `/usr/bin/ffmpeg` (pre-installed)

---

## FFmpeg

FFmpeg is bundled in the add-on image. In xTeVe go to **Settings → General** and set:

```
FFmpeg path: /usr/bin/ffmpeg
```

This enables stream re-streaming, remuxing, and buffering through xTeVe rather than direct URL passthrough.

---

## SSDP — Plex auto-discovery

With `ssdp: true`, xTeVe announces itself on the local network. Plex DVR finds it automatically:

1. In Plex go to **Settings → Live TV & DVR → Set Up Plex DVR**
2. Plex will list xTeVe as an available tuner — select it and follow the wizard

If Plex does not find xTeVe automatically, add it manually using `http://<your-ha-ip>:34400` as the device address.

---

## Connecting to Emby / Jellyfin

1. Go to **Dashboard → Live TV → Tuner Devices → Add**
2. Choose **HDHomeRun**
3. Enter `http://<your-ha-ip>:34400` as the URL

---

## Watchdog

HA monitors `http://<ha-ip>:34400/web` every 60 seconds. If xTeVe stops responding, the Supervisor automatically restarts the add-on.

---

## Data storage

All config persists in the add-on's own `/data/conf` directory — survives restarts and updates.

| Port | Use |
|------|-----|
| `34400` | Web UI at `/web`, HDHomeRun API, M3U/XMLTV proxy, stream proxy |
