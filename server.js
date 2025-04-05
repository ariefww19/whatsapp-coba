const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');

const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const mime = require('mime-types');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setup upload untuk gambar
const upload = multer({ dest: 'uploads/' });

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// QR Code untuk autentikasi
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Ketika sudah terautentikasi
client.on('ready', () => {
    console.log('Client is ready!');
});

// Mulai client WhatsApp
client.initialize();

// Endpoint untuk mengirim pesan teks
app.post('/send-message', async (req, res) => {
    try {
        const { number, message } = req.body;
        
        // Format nomor dengan kode negara dan tanpa tanda + atau 0 di depan
        const formattedNumber = number.includes('@c.us') 
            ? number 
            : `${number.replace(/^0|\+|\D/g, '')}@c.us`;
        
        const sendMessage = await client.sendMessage(formattedNumber, message);
        
        res.json({
            success: true,
            message: 'Pesan berhasil dikirim',
            data: sendMessage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim pesan',
            error: error.message
        });
    }
});



// Endpoint untuk menerima gambar base64 dari ESP32 dan mengirim ke WhatsApp
app.post('/send-base64', async (req, res) => {
    try {
        const { number, caption, imageBase64, mimeType = 'image/jpeg' } = req.body;

        if (!imageBase64 || !number) {
            return res.status(400).json({ error: 'Parameter number dan imageBase64 wajib diisi' });
        }

        const formattedNumber = number.includes('@c.us') 
            ? number 
            : `${number.replace(/^0|\+|\D/g, '')}@c.us`;

        const media = new MessageMedia(
            mimeType,
            imageBase64,
            `esp32-cam.${mime.extension(mimeType)}`
        );

        const sendResult = await client.sendMessage(formattedNumber, media, {
            caption: caption || '',
            sendMediaAsDocument: false
        });

        res.json({
            success: true,
            message: 'Gambar base64 berhasil dikirim',
            data: sendResult.id._serialized
        });
    } catch (error) {
        console.error('Error kirim base64:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim gambar base64',
            error: error.message
        });
    }
});


// Endpoint untuk memeriksa status koneksi
app.get('/status', (req, res) => {
    const isConnected = client.info ? true : false;
    res.json({
        connected: isConnected,
        status: isConnected ? 'Terhubung' : 'Menunggu koneksi'
    });
});

// Jalankan server
app.listen(port, () => {
    console.log(`WhatsApp API berjalan di http://localhost:${port}`);
});