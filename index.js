const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const l = console.log;
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { File } = require('megajs');
const { getBuffer, getGroupAdmins, sleep } = require('./lib/functions');
const { sms } = require('./lib/msg');
const path = require('path');
const express = require('express');
const app = express();
const port = process.env.PORT || 9090;

const ownerNumber = ['94771098429'];

//=================== SESSION AUTH ============================
if (!fs.existsSync(__dirname + '/auth_info_baileys/creds.json')) {
  if (!config.SESSION_ID)
    return console.log('⚠️ Please add your session to SESSION_ID env !!');
  const sessdata = config.SESSION_ID.replace('𝚀𝚞𝚎𝚎𝚗_𝙰𝚑𝚒𝚗𝚜𝚊-𝚞𝚒𝚍~', '');
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile(__dirname + '/auth_info_baileys/creds.json', data, () => {
      console.log('✅ Session downloaded successfully.');
    });
  });
}

//=================== MONGO + SERVER ============================
const connectDB = require('./lib/mongodb');
const { readEnv } = require('./lib/database');

//=================== MAIN WA FUNCTION ============================
async function connectToWA() {
  try {
    await connectDB();
    console.log('〽️ MongoDB Connected ✅');
    await sleep(2000);

    const envConfig = await readEnv();
    const prefix = '.';

    console.log('ᴄᴏɴɴᴇᴄᴛɪɴɢ Queen_Ahinsa-MD ʙᴏᴛ 🧬...');

    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys/');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS('Firefox'),
      syncFullHistory: true,
      auth: state,
      version
    });

    //=================== CONNECTION HANDLER ====================
    conn.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log('🔁 Connection closed, reconnecting...');
          connectToWA();
        } else {
          console.log('🚪 Logged out from WhatsApp session.');
        }
      } else if (connection === 'open') {
        console.log('😼 Installing plugins, please wait 🔌...');
        try {
          fs.readdirSync('./plugins/').forEach((plugin) => {
            try {
              if (path.extname(plugin).toLowerCase() === '.js') {
                require('./plugins/' + plugin);
              }
            } catch (err) {
              console.error(`❌ Error loading plugin ${plugin}:`, err);
            }
          });
        } catch (e) {
          console.error('⚠️ Plugin load error:', e);
        }

        console.log('✅ Plugins installed successfully!');
        console.log('QUEEN_AHINSA-MD connected to WhatsApp ✅');

        const msg = `> *➺ Queen_Ahinsa-MD connected successfully 🪄*\n\nPREFIX: ${prefix}`;
        conn.sendMessage(ownerNumber + '@s.whatsapp.net', {
          image: { url: `https://i.ibb.co/SR76mBh/Pu3-ZYHBS5139.jpg` },
          caption: msg
        });
      }
    });

    conn.ev.on('creds.update', saveCreds);

    //=================== MESSAGE HANDLER ====================
    conn.ev.on('messages.upsert', async (mek) => {
      mek = mek.messages[0];
      if (!mek.message) return;

      mek.message =
        getContentType(mek.message) === 'ephemeralMessage'
          ? mek.message.ephemeralMessage.message
          : mek.message;

      const from = mek.key.remoteJid;
      const type = getContentType(mek.message);
      const body =
        type === 'conversation'
          ? mek.message.conversation
          : type === 'extendedTextMessage'
          ? mek.message.extendedTextMessage.text
          : '';

      const isCmd = body.startsWith(prefix);
      const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(' ');
      const sender = mek.key.fromMe
        ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
        : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      const isOwner = ownerNumber.includes(senderNumber);
      const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });

      // Mode filtering
      if (!isOwner && config.MODE === 'private') return;
      if (!isOwner && config.MODE === 'inbox' && from.endsWith('@g.us')) return;
      if (!isOwner && config.MODE === 'groups' && !from.endsWith('@g.us')) return;

      // Load commands
      const events = require('./command');
      const cmd = events.commands.find(
        (cmd) => cmd.pattern === command || (cmd.alias && cmd.alias.includes(command))
      );

      if (isCmd && cmd) {
        if (cmd.react)
          conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          cmd.function(conn, mek, sms(conn, mek), { from, body, args, q, sender, isOwner, reply });
        } catch (err) {
          console.error('[PLUGIN ERROR]', err);
        }
      }
    });
  } catch (err) {
    console.error('❌ Fatal Error:', err);
    console.log('🔁 Restarting connection...');
    setTimeout(connectToWA, 5000);
  }
}

//=================== EXPRESS SERVER ============================
app.get('/', (req, res) => {
  res.send('👑 Queen_Ahinsa-MD Running Successfully ✅');
});
app.listen(port, () => console.log(`🌐 Server running at http://localhost:${port}`));

//=================== AUTO CONNECT ============================
setTimeout(connectToWA, 4000);
