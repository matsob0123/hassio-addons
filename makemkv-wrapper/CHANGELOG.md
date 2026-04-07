# Changelog

## [Unreleased] — bug fixes
### Fixed
- **`/bin/sh: can't open '/init': Permission denied`** — Removed `chmod a+x /init`
  from the Dockerfile. In s6-overlay v3, `/init` is a symlink to a binary owned
  by the base image. Running `chmod` on it inside a `RUN` layer corrupts the
  symlink target's execute bit in certain OCI runtimes (notably the Home
  Assistant supervisor), causing PID 1 to fail immediately at container start.
  The `|| true` suppressed the build-time error but the damage was already done.
- **`finish` script used s6-overlay v2 paths** — `/run/s6/basedir/bin/s6-svscanctl`
  and `/run/s6/services` do not exist in s6-overlay v3 (which the `jlesage/makemkv`
  base image ships). Corrected to `/command/s6-svscanctl` and `/run/service`.

$(cat /home/claude/makemkv-wrapper/makemkv-wrapper/CHANGELOG.md 2>/dev/null || echo "")
