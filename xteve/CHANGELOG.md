# xTeVe Add-on Changelog

## 2.5.3
- Build image locally from `senexcrenshaw/xteve:2.5.3` instead of pulling from alexbelgium's registry
- Removes dependency on external tag availability
- Config and temp data stored in add-on `/data` directory
- Web UI accessible at `http://<your-ha-ip>:34400/web`

## 2.5.3-5
- Set `host_network: false` to improve HA security rating
- Added `init: false` for s6-overlay compatibility
- Removed unused `env_vars` option schema
- *Broken: HA tried to pull non-existent tag from alexbelgium registry*

## 2.5.3-4
- Initial add-on import from alexbelgium/hassio-addons
- AppArmor profile included
- Pre-built image reference via `image: ghcr.io/alexbelgium/xteve-{arch}`
