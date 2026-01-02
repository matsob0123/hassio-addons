# Quick Installation Guide

## Prerequisites

1. **Home Assistant OS** installed and running
2. **MongoDB** server accessible on your network
3. **Network connectivity** between Home Assistant and MongoDB

## Installation Steps

### 1. Add Repository to Home Assistant

Navigate to:
```
Supervisor → Add-on Store → ⋮ (Menu) → Repositories
```

Add repository URL (replace with actual URL):
```
https://github.com/yourusername/ha-addon-pisignage
```

### 2. Install Add-on

1. Find "piSignage Server" in the add-on store
2. Click on it
3. Click **"Install"** button
4. Wait for installation (may take 5-10 minutes)

### 3. Configure MongoDB

#### Option A: External MongoDB Server

If you have MongoDB running elsewhere:

```yaml
mongodb_uri: "mongodb://192.168.1.100:27017/pisignage"
```

With authentication:
```yaml
mongodb_uri: "mongodb://username:password@192.168.1.100:27017/pisignage?authSource=admin"
```

#### Option B: MongoDB Add-on

1. Install "MongoDB" add-on from store
2. Configure and start it
3. Use this connection string:

```yaml
mongodb_uri: "mongodb://core-mongodb:27017/pisignage"
```

### 4. Configure Add-on

Go to **Configuration** tab and set:

```yaml
mongodb_uri: "mongodb://YOUR_MONGODB_HOST:27017/pisignage"
port: 3000
username: "admin"           # CHANGE THIS!
password: "SecurePass123!"  # CHANGE THIS!
pisignage_username: ""      # Optional: your pisignage.com username
max_upload_size: "2048mb"
session_secret: "your-random-secret-here-abc123xyz"  # CHANGE THIS!
log_level: "info"
```

**⚠️ IMPORTANT**: 
- Change default username/password!
- Generate random session_secret: `openssl rand -base64 32`
- Save configuration

### 5. Start Add-on

1. Go to **Info** tab
2. Click **"Start"** button
3. Wait ~30 seconds for startup
4. Check **Log** tab for any errors

Enable recommended options:
- ✅ Start on boot
- ✅ Watchdog
- ✅ Show in sidebar (optional)

### 6. Access Web Interface

#### Method 1: Ingress (Recommended)

Click **"Open Web UI"** button in add-on

#### Method 2: Direct Access

Open browser to:
```
http://[HOME_ASSISTANT_IP]:3000
```

Example: `http://192.168.1.50:3000`

### 7. First Login

1. Use credentials from your configuration:
   - Username: (your configured username)
   - Password: (your configured password)

2. You should see the piSignage dashboard

## Initial Setup

### Configure piSignage Settings

1. Go to **Settings** (gear icon)
2. Set your **pisignage.com username** (if using cloud features)
3. Upload **license files** (if you have them)
4. Configure display preferences

### Test MongoDB Connection

Look for these in the logs:
```
✅ MongoDB connection established!
✅ Starting Node.js server...
✅ Server running on port 3000
```

If you see errors:
```
❌ Could not connect to MongoDB
```

Then check:
- MongoDB is running: `telnet mongodb-host 27017`
- Connection string is correct
- Network connectivity
- Firewall rules

## Set Up Your First Display

### 1. Prepare Raspberry Pi Player

Download piSignage player image:
- Visit: https://pisignage.com/downloads
- Download latest player image
- Flash to SD card using Etcher

### 2. Configure Player

Mount SD card and edit `config.txt`:

```ini
# Add this line
pisignage_server=http://[HOME_ASSISTANT_IP]:3000

# Example:
pisignage_server=http://192.168.1.50:3000
```

### 3. Boot Player

1. Insert SD card into Raspberry Pi
2. Connect HDMI to display
3. Connect Ethernet cable
4. Power on

### 4. Register Player

1. In piSignage web interface, go to **Players**
2. Wait for player to appear
3. Click to approve/configure

### 5. Upload Media

1. Go to **Assets** → **Upload Files**
2. Upload images or videos
3. Wait for processing

### 6. Create Playlist

1. Go to **Playlists** → **New Playlist**
2. Add your uploaded media
3. Set durations
4. Save playlist

### 7. Deploy to Player

1. Select your player
2. Assign playlist
3. Click **Deploy**
4. Watch content appear on display!

## Troubleshooting

### Add-on Won't Start

Check logs:
```
Supervisor → piSignage Server → Log
```

Common issues:
- ❌ MongoDB connection failed → Check MongoDB URI
- ❌ Port already in use → Change port in config
- ❌ Permission denied → Check AppArmor logs

### Can't Access Web Interface

Test connectivity:
```bash
# From Home Assistant CLI
telnet localhost 3000
```

Check firewall:
```bash
# Ensure port 3000 is accessible
netstat -tlnp | grep 3000
```

### Player Not Connecting

Verify:
- ✅ Player has network connectivity
- ✅ Server URL is correct in player config
- ✅ Port 3000 is accessible from player network
- ✅ No firewall blocking connection

### Upload Fails

Increase upload size in configuration:
```yaml
max_upload_size: "4096mb"  # 4GB
```

Or optimize your video:
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset fast output.mp4
```

## Next Steps

1. **Explore Features**
   - Create multiple playlists
   - Schedule content
   - Set up zones
   - Configure ticker/RSS feeds

2. **Add More Displays**
   - Flash more SD cards
   - Deploy to multiple locations
   - Create groups

3. **Integrate with Home Assistant**
   - Create automations
   - Use REST API
   - Monitor player status

4. **Secure Your Installation**
   - Change default passwords
   - Use strong session secret
   - Configure firewall
   - Enable HTTPS (optional)

## Getting Help

- **Logs**: Supervisor → piSignage Server → Log
- **Documentation**: See DOCS.md
- **piSignage Community**: https://pisignage.com/community
- **GitHub Issues**: Report bugs or request features

## Success Checklist

- ✅ Add-on installed and running
- ✅ MongoDB connected
- ✅ Web interface accessible
- ✅ Changed default credentials
- ✅ At least one player registered
- ✅ Media uploaded and playing
- ✅ Playlist created and deployed

**Congratulations! Your piSignage server is operational!** 🎉