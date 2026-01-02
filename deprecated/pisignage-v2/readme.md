# piSignage Server for Home Assistant

Digital signage server add-on for managing Raspberry Pi displays from Home Assistant.

## About

piSignage is an open-source digital signage solution that allows you to manage and display content on Raspberry Pi devices. This add-on brings the full piSignage server capabilities to Home Assistant OS.

## Features

- Complete piSignage server functionality
- Web-based management interface
- Support for multiple displays
- Media management (images, videos, HTML)
- Playlist creation and scheduling
- Remote player control
- MongoDB integration
- FFmpeg video processing
- ImageMagick image processing
- Automatic thumbnail generation

## Prerequisites

Before installing this add-on, you need:

1. **MongoDB Database** - Running on another server or as a separate add-on
   - Example: `mongodb://192.168.1.100:27017/pisignage`
   - Or use the MongoDB add-on from Home Assistant

2. **Network Access** - Ensure your Raspberry Pi players can access Home Assistant

3. **piSignage.com Account** (optional)
   - For cloud features and license files
   - Get your username from pisignage.com (not your email)

## Installation

1. Add this repository to your Home Assistant add-on store
2. Install the "piSignage Server" add-on
3. Configure the add-on (see Configuration section)
4. Start the add-on
5. Access the web interface

## Configuration

### Basic Configuration

```yaml
mongodb_uri: "mongodb://192.168.1.100:27017/pisignage"
port: 3000
username: "pi"
password: "pi"
pisignage_username: ""
max_upload_size: "2048mb"
session_secret: "piSignageSecret2024"
log_level: "info"
```

### Option Details

- **mongodb_uri** (required): MongoDB connection string
  - Format: `mongodb://host:port/database`
  - Example: `mongodb://192.168.1.100:27017/pisignage`
  - If using authentication: `mongodb://user:pass@host:port/database`

- **port** (default: 3000): Web interface port
  - Change if port 3000 conflicts with other services

- **username** (default: "pi"): Login username for piSignage interface
  
- **password** (default: "pi"): Login password for piSignage interface
  - ⚠️ **IMPORTANT**: Change default credentials!

- **pisignage_username** (optional): Your pisignage.com username
  - Required for license upload and cloud features
  - This is NOT your email address

- **max_upload_size** (default: "2048mb"): Maximum file upload size
  - Increase for large video files

- **session_secret** (required): Secret key for session encryption
  - Change to a random string for security

- **log_level** (default: "info"): Logging verbosity
  - Options: debug, info, warn, error

## Usage

### First Time Setup

1. Open the piSignage web interface
2. Login with your configured username/password
3. Go to **Settings**:
   - Enter your pisignage.com username (if using cloud features)
   - Upload license files (downloaded from pisignage.com or email)
   - Configure display settings

### Managing Displays

1. **Register Players**:
   - Install piSignage player on Raspberry Pi devices
   - Point players to: `http://[HOME_ASSISTANT_IP]:3000`
   - Players will auto-register

2. **Upload Media**:
   - Go to **Assets** → **Upload Files**
   - Supported: Images (JPG, PNG, GIF), Videos (MP4, WebM), HTML

3. **Create Playlists**:
   - Go to **Playlists** → **Add Playlist**
   - Add assets to playlist
   - Set duration for each asset
   - Assign to displays

4. **Schedule Content**:
   - Create schedules for different times/days
   - Assign playlists to schedules
   - Deploy to players

### Media Storage

All uploaded media is stored in `/data/media` which persists across add-on restarts and updates.

- Media files: `/data/media/`
- Thumbnails: `/data/media/_thumbnails/`
- Logs: `/data/logs/`

## Network Configuration

### Port Forwarding

To access from outside your network:
1. Forward port 3000 in your router
2. Use DuckDNS or similar for dynamic DNS
3. Consider using Nginx Proxy Manager for SSL

### Ingress Support

The add-on supports Home Assistant ingress for secure access through:
- Settings → Add-ons → piSignage Server → "Open Web UI"

## Troubleshooting

### Cannot Connect to MongoDB

```
Error: Could not connect to MongoDB
```

**Solutions**:
- Verify MongoDB is running: `telnet [mongodb_host] 27017`
- Check MongoDB URI format
- Ensure network connectivity between containers
- Check MongoDB authentication credentials

### Players Not Connecting

**Solutions**:
- Verify port 3000 is accessible from player network
- Check firewall rules
- Ensure players are configured with correct server URL
- Review add-on logs for connection attempts

### Upload Fails

```
Error: File too large
```

**Solution**: Increase `max_upload_size` in configuration

### Performance Issues

**Solutions**:
- Use H.264 encoded videos for better performance
- Reduce video resolution/bitrate
- Increase hardware resources
- Check MongoDB performance

## Advanced Configuration

### Using External MongoDB Add-on

If using a MongoDB Home Assistant add-on:

```yaml
mongodb_uri: "mongodb://core-mongodb:27017/pisignage"
```

### Custom Media Directory

By default, media is stored in `/data/media`. This location persists across updates.

### Environment Variables

The add-on automatically sets these environment variables:
- `NODE_ENV=production`
- `PORT` (from config)
- `MONGODB_URI` (from config)
- `SESSION_SECRET` (from config)

## Integration with Home Assistant

### Automations

You can use Home Assistant automations to trigger display changes:

```yaml
automation:
  - alias: "Change signage playlist at night"
    trigger:
      platform: time
      at: "22:00:00"
    action:
      service: shell_command.pisignage_night_mode
```

### REST API

Access piSignage API from Home Assistant:

```yaml
rest_command:
  pisignage_deploy:
    url: "http://localhost:3000/api/deploy/{{ player_id }}"
    method: POST
    headers:
      Authorization: "Bearer YOUR_TOKEN"
```

## Support

- **piSignage Documentation**: https://pisignage.com/homepage/faq.html
- **GitHub Issues**: https://github.com/colloqi/pisignage-server/issues
- **Home Assistant Forum**: Search for "piSignage"

## Changelog

### 1.0.0
- Initial release
- Full piSignage server functionality
- MongoDB external connection support
- Multi-architecture support
- Home Assistant ingress support
- Persistent media storage

## License

This add-on uses piSignage Server which is licensed under AGPL-3.0.

## Credits

- Original piSignage Server: https://github.com/colloqi/pisignage-server
- Developed by Colloqi Technologies