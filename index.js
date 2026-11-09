
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';

import pino from 'pino';
import qrcode from 'qrcode-terminal';

const startBot = async () => {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('WhatsApp QR Code:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ SIHINA WHATSAPP BOT CONNECTED!');
    }

    if (connection === 'close') {
      const reconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (reconnect) {
        console.log('Reconnecting...');
        startBot();
      } else {
        console.log('WhatsApp logged out. Login again.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;

      const message =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      const command = message.trim().toLowerCase();

      if (command === '!menu') {
        await sock.sendMessage(jid, {
          text:
            '🤖 *SIHINA WHATSAPP BOT*\n\n' +
            '1. !menu - Bot Menu\n' +
            '2. !ping - Check Bot\n' +
            '3. !time - Current Time\n' +
            '4. !about - About Bot\n\n' +
            '❤️ Thank you!'
        });
      }

      else if (command === '!ping') {
        await sock.sendMessage(jid, {
          text: '🏓 Pong! Bot is Online ✅'
        });
      }

      else if (command === '!time') {
        await sock.sendMessage(jid, {
          text: '🕒 Server Time: ' + new Date().toLocaleString()
        });
      }

      else if (command === '!about') {
        await sock.sendMessage(jid, {
          text:
            '🤖 SIHINA WHATSAPP BOT\n' +
            'Version: 1.0.0\n' +
            'Created with Baileys ❤️'
        });
      }
    }
  });
};

startBot().catch(console.error);
