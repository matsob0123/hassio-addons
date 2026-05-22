# xTeVe Add-on Changelog

## 2.5.3.1 (current)
- Added `panel_icon` and `panel_title` — xTeVe now appears in the HA sidebar
- Version bump for HA to detect the update

## 2.5.3
- Build image locally from `senexcrenshaw/xteve:2.5.3` — no external registry required
- Added HA ingress support (open directly from Supervisor panel)
- Port 34400 exposed for direct access as well
- Removed all alexbelgium infrastructure (ha_automodules, ha_entrypoint, bashio)
- Simplified AppArmor profile scoped to only what xTeVe needs
- Timestamped startup logs
- Config and temp data stored persistently in add-on `/data` directory
- Added icon and logo

## 2.5.3-5
- Set `host_network: false` to improve HA security rating
- *Broken: HA tried to pull non-existent tag `ghcr.io/alexbelgium/xteve-amd64:2.5.3-5`*

## 2.5.3-4
- Initial import from alexbelgium/hassio-addons
- Used pre-built image from `ghcr.io/alexbelgium/xteve-{arch}`
