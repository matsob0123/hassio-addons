# piSignage Server Add-on Documentation

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [MongoDB Setup](#mongodb-setup)
5. [Player Configuration](#player-configuration)
6. [Media Management](#media-management)
7. [API Usage](#api-usage)
8. [Troubleshooting](#troubleshooting)
9. [Security](#security)
10. [Performance Optimization](#performance-optimization)

## Overview

piSignage Server is a comprehensive digital signage solution that runs on Home Assistant OS. It provides:

- Centralized media management
- Multi-display coordination
- Content scheduling
- Remote player control
- Real-time monitoring

### Architecture

```
┌─────────────────────────────────────────┐
│     Home Assistant OS                   │
│  ┌───────────────────────────────────┐  │
│  │   piSignage Server Add-on         │  │
│  │   - Node.js Server                │  │
│  │   - FFmpeg Processing             │  │
│  │   - ImageMagick                   │  │
│  │   - Web Interface                 │  │
│  └───────────┬───────────────────────┘  │
└──────────────┼───────────────────────────┘
               │
               ├──────► MongoDB (External)
               │
               └──────► Raspberry Pi Players
```

## Installation

### Step 1: Add Repository

1. Navigate to **Supervisor** → **Add-on Store**
2. Click menu (⋮) → **Repositories**
3. Add repository URL
4. Click **Add**

### Step 2: Install Add-on

1. Find "piSignage Server" in add-on store
2. Click **Install**
3. Wait for installation to complete

### Step 3: Configure MongoDB

Before starting, ensure MongoDB is accessible:

```bash
# Test MongoDB connection
telnet mongodb-host 27017
```

### Step 4: Configure Add-on

1. Go to **Configuration** tab
2. Set MongoDB URI
3. Change default credentials
4. Save configuration

### Step 5: Start Add-on

1. Go to **Info** tab
2. Click **Start**
3. Enable "Start on boot" (optional)
4. Enable "Watchdog" (recommended)

## Configuration

### Complete Configuration Example

```yaml
mongodb_uri: "mongodb://admin:password@192.168.1.100:27017/pisignage?authSource=admin"
port: 3000
username: "admin"
password: "SecurePassword123!"
pisignage_username: "mypisignage"
max_upload_size: "2048mb"
session_secret: "change-this-to-random-string-abc123xyz789"
log_level: "info"
```

### MongoDB URI Formats

**Without Authentication:**
```
mongodb://192.168.1.100:27017/pisignage
```

**With Authentication:**
```
mongodb://username:password@192.168.1.100:27017/pisignage?authSource=admin
```

**MongoDB Add-on (Local):**
```
mongodb://core-mongodb:27017/pisignage
```

**Multiple Hosts (Replica Set):**
```
mongodb://host1:27017,host2:27017,host3:27017/pisignage?replicaSet=rs0
```

### Security Best Practices

1. **Change Default Credentials**
   - Never use default `pi:pi`
   - Use strong passwords (12+ characters)

2. **Secure Session Secret**
   - Generate random string: `openssl rand -base64 32`
   - Never reuse across installations

3. **MongoDB Security**
   - Enable authentication
   - Use dedicated database user
   - Restrict network access

4. **Network Security**
   - Use Home Assistant ingress when possible
   - Configure firewall rules
   - Use VPN for remote access

## MongoDB Setup

### Option 1: External MongoDB Server

#### Install MongoDB

**Ubuntu/Debian:**
```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Docker:**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v /data/mongodb:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7
```

#### Create Database and User

```javascript
// Connect to MongoDB
mongo admin -u admin -p password

// Create database
use pisignage

// Create user
db.createUser({
  user: "pisignage",
  pwd: "securepassword",
  roles: [
    { role: "readWrite", db: "pisignage" }
  ]
})
```

### Option 2: MongoDB Home Assistant Add-on

1. Install "MongoDB" add-on from store
2. Configure MongoDB add-on
3. Start MongoDB add-on
4. Use connection string: `mongodb://core-mongodb:27017/pisignage`

### Verify MongoDB Connection

```bash
# From Home Assistant CLI
docker exec -it addon_XXXXX_pisignage sh
nc -zv mongodb-host 27017
```

## Player Configuration

### Raspberry Pi Player Setup

#### 1. Download piSignage Player

From Raspberry Pi:
```bash
wget https://pisignage.com/releases/pisignage_player_latest.img.zip
unzip pisignage_player_latest.img.zip
```

#### 2. Write to SD Card

**Linux/Mac:**
```bash
sudo dd if=pisignage_player.img of=/dev/sdX bs=4M status=progress
sync
```

**Windows:** Use Etcher or Win32DiskImager

#### 3. Configure Player

Edit `/boot/config.txt` on SD card:

```ini
# Set server address
pisignage_server=http://[HOME_ASSISTANT_IP]:3000

# Player name (optional)
pisignage_name=Display-01
```

#### 4. Boot Raspberry Pi

1. Insert SD card
2. Connect to network (Ethernet recommended)
3. Connect to display via HDMI
4. Power on

#### 5. Verify Registration

1. Open piSignage web interface
2. Go to **Players**
3. Look for new player registration
4. Approve if required

### Player Network Requirements

- **Outbound Access:** HTTP/HTTPS to server port 3000
- **DNS:** Access to pisignage.com (if using cloud features)
- **Bandwidth:** 10+ Mbps for HD video streaming
- **Latency:** < 100ms to server (for responsive control)

## Media Management

### Supported Formats

**Images:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- SVG (.svg)

**Videos:**
- MP4 (.mp4) - Recommended
- WebM (.webm)
- AVI (.avi) - Will be transcoded
- MOV (.mov) - Will be transcoded

**Web Content:**
- HTML (.html)
- URLs (websites)

### Upload Media

#### Via Web Interface

1. Go to **Assets** → **Upload Files**
2. Click **Choose Files** or drag-and-drop
3. Wait for upload and processing
4. Thumbnails auto-generate

#### Via API

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  http://localhost:3000/api/upload
```

### Video Optimization

For best performance, pre-encode videos:

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset fast \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  output.mp4
```

**Recommended Settings:**
- Resolution: 1920x1080 or 1280x720
- Bitrate: 2-5 Mbps
- Frame rate: 30 fps
- Codec: H.264

### Storage Management

Media is stored in persistent volumes:

```
/data/media/              # Uploaded files
/data/media/_thumbnails/  # Auto-generated thumbnails
/data/logs/               # Server logs
```

**Check Storage Usage:**

```bash
# From Home Assistant CLI
docker exec -it addon_XXXXX_pisignage df -h /data
```

## API Usage

### Authentication

Generate API token from web interface:
1. Go to **Settings** → **API**
2. Click **Generate Token**
3. Copy token for use in requests

### API Endpoints

#### List Players

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/players
```

#### Deploy to Player

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/deploy/PLAYER_ID
```

#### Upload Asset

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg" \
  http://localhost:3000/api/assets
```

#### Create Playlist

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Playlist",
    "assets": ["asset1_id", "asset2_id"],
    "duration": [10, 15]
  }' \
  http://localhost:3000/api/playlists
```

### Home Assistant Integration

#### REST Command

`configuration.yaml`:

```yaml
rest_command:
  pisignage_deploy:
    url: "http://localhost:3000/api/deploy/{{ player_id }}"
    method: POST
    headers:
      Authorization: "Bearer YOUR_TOKEN"
```

#### Automation Example

```yaml
automation:
  - alias: "Emergency Alert on Displays"
    trigger:
      platform: state
      entity_id: input_boolean.emergency_alert
      to: "on"
    action:
      - service: rest_command.pisignage_deploy
        data:
          player_id: "all"
```

## Troubleshooting

### Common Issues

#### 1. Cannot Access Web Interface

**Symptoms:**
- Browser shows "Connection refused"
- Timeout errors

**Solutions:**
```bash
# Check add-on is running
ha addons info addon_XXXXX_pisignage

# Check logs
ha addons logs addon_XXXXX_pisignage

# Verify port binding
netstat -tlnp | grep 3000
```

#### 2. MongoDB Connection Failed

**Symptoms:**
- "ECONNREFUSED" in logs
- Add-on won't start

**Solutions:**
```bash
# Test connectivity
telnet mongodb-host 27017

# Check MongoDB status
systemctl status mongod

# Verify credentials
mongo mongodb://user:pass@host:27017/pisignage --eval "db.stats()"
```

#### 3. Player Not Connecting

**Symptoms:**
- Player shows "Server not found"
- No registration in web interface

**Solutions:**
- Verify network connectivity
- Check firewall rules
- Confirm server URL on player
- Review player logs

#### 4. Upload Fails

**Symptoms:**
- "File too large" error
- Upload timeout

**Solutions:**
- Increase `max_upload_size` in config
- Check available disk space
- Reduce file size
- Use wired connection

#### 5. Video Playback Issues

**Symptoms:**
- Video stutters
- Black screen
- Audio out of sync

**Solutions:**
- Re-encode video with recommended settings
- Reduce video bitrate
- Check network bandwidth
- Update player firmware

### Debug Mode

Enable debug logging:

```yaml
log_level: "debug"
```

View real-time logs:

```bash
ha addons logs -f addon_XXXXX_pisignage
```

## Performance Optimization

### Server Optimization

1. **Hardware Resources**
   - RAM: 2GB minimum, 4GB recommended
   - CPU: 2+ cores recommended
   - Storage: SSD preferred for media

2. **MongoDB Optimization**
   - Use indexes on frequently queried fields
   - Regular maintenance with `db.repairDatabase()`
   - Monitor with `db.serverStatus()`

3. **Network Optimization**
   - Use Gigabit Ethernet
   - Minimize network hops
   - Enable QoS for video traffic

### Player Optimization

1. **Raspberry Pi Configuration**
   - Use Raspberry Pi 3B+ or newer
   - Enable GPU memory split: `gpu_mem=256`
   - Use Class 10 SD card or better

2. **Display Settings**
   - Match content resolution to display
   - Disable overscan if not needed
   - Use HDMI-CEC for power control

3. **Content Optimization**
   - Pre-encode videos to H.264
   - Compress images to reasonable sizes
   - Limit transitions and effects

## Security

### Access Control

1. **Authentication**
   - Use strong passwords
   - Enable two-factor authentication (if available)
   - Rotate credentials regularly

2. **Network Security**
   - Use VPN for remote access
   - Implement firewall rules
   - Disable unnecessary ports

3. **Data Protection**
   - Regular backups of MongoDB
   - Encrypt sensitive data
   - Use HTTPS with reverse proxy

### Backup Strategy

```bash
# Backup MongoDB
mongodump --uri="mongodb://user:pass@host:27017/pisignage" \
  --out=/backup/pisignage-$(date +%Y%m%d)

# Backup media files
tar -czf /backup/media-$(date +%Y%m%d).tar.gz /data/media
```

### Recovery

```bash
# Restore MongoDB
mongorestore --uri="mongodb://user:pass@host:27017/pisignage" \
  /backup/pisignage-20250102

# Restore media
tar -xzf /backup/media-20250102.tar.gz -C /data
```

## Advanced Topics

### Load Balancing

For high-availability deployments, use multiple server instances behind a load balancer.

### Cloud Integration

Configure piSignage.com account for:
- Remote management
- Cloud backups
- Analytics
- Mobile app access

### Custom Development

Extend functionality with custom modules in `/app/custom/`

### Monitoring

Integrate with Home Assistant monitoring:

```yaml
sensor:
  - platform: rest
    name: "piSignage Players"
    resource: "http://localhost:3000/api/players"
    headers:
      Authorization: "Bearer YOUR_TOKEN"
    value_template: "{{ value_json | length }}"
```