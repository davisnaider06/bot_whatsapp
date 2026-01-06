const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const express = require('express')
const qrcode = require('qrcode-terminal')

const app = express()
app.use(express.json())

let sock

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  sock = makeWASocket({
    auth: state
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      console.log('📲 Escaneie o QR Code abaixo:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp LOGADO com sucesso')
    }

    if (connection === 'close') {
      console.log('❌ Conexão fechada', lastDisconnect?.error)
    }
  })
}

app.post('/send', async (req, res) => {
  const { phone, message } = req.body

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message required' })
  }

  try {
    await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: message })
    res.json({ status: 'sent' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

startBot()

app.listen(3000, () => {
  console.log('🚀 Bot rodando na porta 3000')
})
