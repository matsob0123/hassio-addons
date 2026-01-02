/**
 * piSignage Server – Home Assistant Add-on Production Version
 * 
 * Wymagania:
 *   - Node.js 18+
 *   - Zewnętrzne MongoDB
 *   - Foldery: /media, /config
 * 
 * Autor: Mateusz
 */

const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const bodyParser = require('body-parser');

// --- Konfiguracja ---
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo_user:mongo_pass@192.168.1.100:27017/pisignage';
const MEDIA_STORAGE = process.env.MEDIA_STORAGE || 'share';

const app = express();

// --- Logger HTTP ---
app.use(morgan('combined'));

// --- Body parser JSON ---
app.use(bodyParser.json());

// --- MongoDB ---
let db;
async function initMongo() {
    try {
        const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
        await client.connect();
        db = client.db();
        console.log('[piSignage] Connected to MongoDB');
    } catch (err) {
        console.error('[piSignage] MongoDB connection failed:', err);
        process.exit(1); // w produkcji nie startujemy bez DB
    }
}

// --- Media folder ---
const MEDIA_PATH = MEDIA_STORAGE === 'share' ? '/media' : '/config/media';
if (!fs.existsSync(MEDIA_PATH)) {
    fs.mkdirSync(MEDIA_PATH, { recursive: true });
    console.log(`[piSignage] Created media folder at ${MEDIA_PATH}`);
}

// --- API ENDPOINTS ---

// Health check / Watchdog HA
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// List media files
app.get('/api/media', (req, res) => {
    fs.readdir(MEDIA_PATH, (err, files) => {
        if (err) {
            console.error('[piSignage] Failed to read media folder:', err);
            return res.status(500).json({ error: 'Failed to read media folder' });
        }
        res.json({ media: files });
    });
});

// Upload media file
app.post('/api/media', (req, res) => {
    if (!req.body || !req.body.filename || !req.body.data) {
        return res.status(400).json({ error: 'Missing filename or data' });
    }
    const filePath = path.join(MEDIA_PATH, req.body.filename);
    const buffer = Buffer.from(req.body.data, 'base64');
    fs.writeFile(filePath, buffer, (err) => {
        if (err) {
            console.error('[piSignage] Failed to save media file:', err);
            return res.status(500).json({ error: 'Failed to save file' });
        }
        res.json({ success: true, filename: req.body.filename });
    });
});

// Delete media file
app.delete('/api/media/:filename', (req, res) => {
    const filePath = path.join(MEDIA_PATH, req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('[piSignage] Failed to delete media file:', err);
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ success: true, filename: req.params.filename });
    });
});

// Example: get playlists from MongoDB
app.get('/api/playlists', async (req, res) => {
    try {
        const playlists = await db.collection('playlists').find({}).toArray();
        res.json({ playlists });
    } catch (err) {
        console.error('[piSignage] Failed to fetch playlists:', err);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Example: add playlist
app.post('/api/playlists', async (req, res) => {
    const playlist = req.body;
    if (!playlist || !playlist.name || !playlist.items) {
        return res.status(400).json({ error: 'Invalid playlist data' });
    }
    try {
        await db.collection('playlists').insertOne(playlist);
        res.json({ success: true, playlist });
    } catch (err) {
        console.error('[piSignage] Failed to add playlist:', err);
        res.status(500).json({ error: 'Failed to add playlist' });
    }
});

// --- Start server ---
async function startServer() {
    await initMongo();
    app.listen(PORT, () => {
        console.log(`[piSignage] Server listening on port ${PORT} in ${NODE_ENV} mode`);
    });
}

// Obsługa błędów nieobsłużonych promise
process.on('unhandledRejection', (reason, p) => {
    console.error('[piSignage] Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[piSignage] Uncaught Exception:', err);
    process.exit(1);
});

// --- Start ---
startServer();
