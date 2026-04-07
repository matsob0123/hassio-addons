# MakeMKV Wrapper — Detailed Documentation

This file is shown in the **Documentation** tab of the add-on in Home Assistant.

---

## Option reference

### `makemkv_key`

Your personal MakeMKV license key (format: `T-XXXXXX...`).

If left empty, the container will automatically retrieve the latest rolling
**beta key** from the MakeMKV forum. The beta key is valid for ~30 days and
is refreshed by the container on start.

> **Tip:** A personal key is required for Blu-ray discs once MakeMKV leaves
> beta. DVDs work without a key.

---

### `puid` / `pgid`

The Unix user ID and group ID under which MakeMKV runs inside the container.

These should match the owner of your output directory so files are written
with the correct permissions. On most systems the first user is `1000:1000`.

Find your IDs:
```bash
id
```

---

### `umask`

Default file permission mask for created files.  
`0022` → files are rw-r--r-- (owner read-write, group/others read-only).  
`0002` → files are rw-rw-r-- (owner and group read-write).

---

### `timezone`

Standard TZ database name. Examples:
- `Europe/Warsaw`
- `America/New_York`
- `Asia/Tokyo`

Full list: <https://en.wikipedia.org/wiki/List_of_tz_database_time_zones>

---

### `display_width` / `display_height`

Resolution of the virtual X11 desktop rendered for the web UI.  
Default `1280×768` is fine for most screens. Increase for high-DPI displays.

---

### `vnc_password`

Password required for **direct VNC connections** on port 5900.  
Leave empty to disable VNC authentication (only safe behind a firewall or VPN).

The web UI (ingress, port 5800) is always protected by Home Assistant
authentication — this option only affects raw VNC clients.

---

### `auto_disc_ripper`

When `true`, MakeMKV will start ripping as soon as a disc is inserted.
No need to open the browser UI.

Ripped files are placed in `output_path`.

---

### `auto_disc_ripper_eject`

Eject the disc tray automatically when ripping completes.  
Recommended: `true`.

---

### `auto_disc_ripper_parallel_rip`

If you have multiple optical drives, set this to `true` to rip all of
them simultaneously. With a single drive this has no effect.

---

### `auto_disc_ripper_interval`

How often (in seconds) the auto-ripper polls the drive for a new disc.  
Lower = faster detection, marginally higher CPU use.  
Default `5` seconds is a good balance.

---

### `auto_disc_ripper_min_title_length`

Titles shorter than this value (in seconds) are skipped.  
Default `600` (10 minutes) skips trailers, copyright warnings, menus.  
Set to `0` to rip everything.

---

### `auto_disc_ripper_bd_mode`

How Blu-ray discs are ripped in auto mode:

| Value | Description |
|-------|-------------|
| `mkv` | Convert to individual MKV files (recommended) |
| `backup` | Full disc backup (preserves menus, requires more space) |

---

### `auto_disc_ripper_force_unique_output_dir`

When `true`, each rip is placed in a new uniquely-named subdirectory,
preventing accidental overwrites when ripping the same disc twice.

---

### `output_path`

Absolute path **inside the container** where ripped files are saved.

| Container path | Visible on host |
|---------------|----------------|
| `/media/makemkv` | Home Assistant media library |
| `/share/makemkv` | `/config/share/makemkv` on host |

You can use any path as long as it is inside one of the mapped folders
(`/media`, `/share`, `/config`).

---

### `keep_app_running`

When `true`, the container automatically restarts MakeMKV if it crashes.  
Recommended: `true`.

---

### `app_niceness`

Linux CPU scheduling priority. Range: `-20` (highest) to `19` (lowest).  
`0` = normal.  
Setting this to `10` or higher keeps ripping from affecting other services
on a busy Home Assistant host.

---

### `enable_cjk_font`

Install additional fonts for Chinese, Japanese, and Korean characters.  
Enable if disc titles or subtitles appear as boxes/squares.

---

### `dark_mode`

Use a dark colour theme in the web UI.

---

### `log_level`

| Level | When to use |
|-------|-------------|
| `info` | Normal operation |
| `debug` | More verbose — use for troubleshooting |
| `trace` | Very verbose — use when filing a bug report |

Log output is visible in **Settings → Add-ons → MakeMKV Wrapper → Log**.

---

## Multiple optical drives

By default only `/dev/sr0` is exposed. To add more drives, edit
`config.yaml` in the add-on folder and add entries to `devices`:

```yaml
devices:
  - /dev/sr0
  - /dev/sr1
```

Then **rebuild** the add-on.

---

## Support & bugs

- GitHub: <https://github.com/matsob0123/hass-makemkv/issues>
- Upstream container issues: <https://github.com/jlesage/docker-makemkv/issues>
