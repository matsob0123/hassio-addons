# Changelog

All notable changes to MakeMKV Wrapper will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).


## [2.0.4] — Current release

### Fixed
- **Pliki rootfs/ bez bitu wykonywalnego** — rzeczywista przyczyna boot failure
  - Pliki run, finish, 10-makemkv-options.sh byly w ZIP z prawami -rw-r--r--.
    HA build system rozpakowywal je bez exec bitu. Fix: bity 0o755 ustawione
    bezposrednio na plikach zrodlowych i zapisane w ZIP.
- Wersja podniesiona 2.0.3.1 -> 2.0.4

---

## [2.0.3] — Previous release

### Fixed
- **`/bin/sh: can't open '/init': Permission denied`** (critical boot failure)
  - **Root cause:** The Dockerfile contained `chmod a+x /init` which is fatal
    for s6-overlay v3. In v3, `/init` is a symlink whose target binary is owned
    by the `jlesage/makemkv` base image. Running `chmod` on it inside a Docker
    `RUN` layer corrupts the execute bit on the symlink target within the OCI
    layer. The `2>/dev/null || true` silently hid the error at build time, but
    the container crashed immediately on every start at runtime.
  - **Fix:** Removed the `chmod /init` line entirely. The base image owns `/init`
    and it must never be touched.

- **`init: false` is now explicitly documented in `config.yaml`**
  - s6-overlay v3 requires `init: false` in the add-on config so the HA supervisor
    does not inject Docker's default `tini` init in front of s6. If `tini` runs
    first, s6 detects it is not PID 1 and refuses to start with:
    `s6-overlay-suexec: fatal: can only run as pid 1`
  - Reference: https://developers.home-assistant.io/blog/2022/05/12/s6-overlay-base-images/

- **`finish` script now uses correct s6-overlay v3 halt command**
  - Old (broken): `/run/s6/basedir/bin/s6-svscanctl -t /run/s6/services`
  - New (correct): `/run/s6/basedir/bin/halt`
  - The old paths are s6-overlay v2. The HA developer docs explicitly state the
    correct v3 replacement is `/run/s6/basedir/bin/halt`.

- **AppArmor profile updated for s6-overlay v3**
  - Added required paths: `/init ix`, `/package/**`, `/command/**`,
    `/run/{s6,s6-rc*,service}/**`, `/etc/cont-finish.d/**`
  - Without these the AppArmor profile blocks s6 from executing its own binaries,
    causing subtle permission failures even when the container appears to start.

- **`config.yaml` map syntax corrected**
  - Old: `- config:rw` (shorthand, unreliable across supervisor versions)
  - New: `type: media / read_only: false` (explicit object syntax per current docs)

- **Schema enum validation fixed**
  - `auto_disc_ripper_bd_mode` and `log_level` now use `list(a|b)` instead of
    `match(a|b)`. The `list()` type renders a dropdown in the HA UI; `match()`
    is a regex validator with no UI widget.

- **Watchdog added**
  - `watchdog: "http://[HOST]:[PORT:5800]/"` — supervisor automatically restarts
    the add-on if the web UI becomes unreachable.

- **Port translation added to `translations/en.yaml`**
  - `network:` section documents the 5800/tcp port in the HA UI.

---

## [2.0.2] — Previous release

- Initial port of jlesage/docker-makemkv to Home Assistant add-on format
- Added ingress support (sidebar web UI)
- Added auto disc ripper options
- Added VNC password support
- Added CJK font option
- Added dark mode option
