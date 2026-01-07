const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const express = require('express')
const qrcode = require('qrcode-terminal')

const app = express()
app.use(express.json())

let sock

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ["Windows", "Chrome", "11.0"], // Faz o WhatsApp confiar na conexão
    syncFullHistory: false, // Evita que o bot tente baixar todas as suas conversas antigas (isso causa o erro de carregar infinito)
    connectTimeoutMs: 60000
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
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
      console.log('❌ Conexão fechada. Tentando reconectar...', shouldReconnect)
      if (shouldReconnect) startBot() 
      }
  })
}

app.post('/send', async (req, res) => {
  let { phone, message } = req.body

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message required' })
  }

  // Limpa o número: remove tudo que não é dígito
  let cleanPhone = phone.toString().replace(/\D/g, '')
  
  // Se o número não tiver o 55 (Brasil), a gente adiciona
  if (cleanPhone.length <= 11) cleanPhone = '55' + cleanPhone

  try {
    // O Baileys precisa do @s.whatsapp.net no final
    const jid = `${cleanPhone}@s.whatsapp.net`
    await sock.sendMessage(jid, { text: message })
    console.log(`✅ Mensagem enviada para: ${cleanPhone}`)
    res.json({ status: 'sent', to: cleanPhone })
  } catch (err) {
    console.error('❌ Erro ao enviar:', err)
    res.status(500).json({ error: err.message })
  }
})
startBot()

app.listen(3000, () => {
  console.log('🚀 Bot rodando na porta 3000')
})
