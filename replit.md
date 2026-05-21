# matsob0123 homeassistant addons

## Project Overview

This is a **Home Assistant Add-on Repository** containing custom Docker-based add-ons for the Home Assistant Supervisor (Hass.io) environment. It is not a standalone web application.

### Add-ons Included

- **npmportal/**: Run arbitrary NPM commands via Home Assistant configuration (Node.js 20)
- **upnpportopener/**: Python-based UPnP port forwarding utility using `miniupnpc`
- **temurin-21/**, **temurin-22/**, **temurin-23/**: Eclipse Temurin JDK wrappers for running Java applications (e.g. Minecraft servers)
- **deprecated/**: Older/unused add-ons (makemkv-wrapper, pisignage variants)

### Repository Entry Point

`repository.json` — defines the add-on store metadata for Home Assistant.

## How to Use

These add-ons are installed via the Home Assistant UI:

1. Go to **Settings > Add-ons > Add-on Store**
2. Click the three-dot menu > **Repositories**
3. Add: `https://github.com/matsob0123/hassio-addons`
4. Install and configure individual add-ons from the store

## Development / Testing

Each add-on can be built and tested manually with Docker:

```bash
cd <addon-dir>
docker build -t my-addon .
docker run --rm -v $(pwd)/options.json:/data/options.json my-addon
```

A mock `options.json` must be provided to simulate Home Assistant's `/data/options.json`.

## User Preferences

- This repository is not a runnable web app — it is a collection of Home Assistant add-on definitions.
