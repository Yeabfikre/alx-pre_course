require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Telegraf } = require('telegraf');

// Environment configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const GAME_SHORT_NAME = process.env.GAME_SHORT_NAME || 'tictactoe';
const PORT = Number(process.env.PORT || 3000);
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`; // Public HTTPS domain in prod
const GAME_SECRET = process.env.GAME_SECRET || 'dev-secret-change-me';

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in environment');
  process.exit(1);
}

// Express app setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

const staticDir = path.join(__dirname, 'game');
app.use('/game', express.static(staticDir, { extensions: ['html'] }));

app.get('/', (req, res) => {
  res.redirect('/game/index.html');
});

// Telegram bot setup
const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.replyWithGame(GAME_SHORT_NAME);
});

bot.on('inline_query', async (ctx) => {
  await ctx.answerInlineQuery([
    { type: 'game', id: 'ttt', game_short_name: GAME_SHORT_NAME },
  ], { cache_time: 0 });
});

bot.on('callback_query', async (ctx) => {
  const cq = ctx.callbackQuery;
  if (cq.game_short_name !== GAME_SHORT_NAME) {
    return ctx.answerCbQuery('Unknown game');
  }

  const userId = cq.from.id;
  const payload = {
    user_id: userId,
    chat_id: cq.message ? cq.message.chat.id : undefined,
    message_id: cq.message ? cq.message.message_id : undefined,
    inline_message_id: cq.inline_message_id || undefined,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', GAME_SECRET).update(payloadBase64).digest('hex');

  const url = `${DOMAIN}/game/index.html?payload=${encodeURIComponent(payloadBase64)}&sig=${signature}`;
  await ctx.answerCbQuery(undefined, { url });
});

// API to set score from the game
app.post('/api/set_score', async (req, res) => {
  try {
    const { payload, sig, score } = req.body || {};
    if (!payload || !sig || typeof score !== 'number') {
      return res.status(400).json({ ok: false, error: 'Missing payload/sig/score' });
    }

    const expectedSig = crypto.createHmac('sha256', GAME_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return res.status(401).json({ ok: false, error: 'Bad signature' });
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const { user_id, chat_id, message_id, inline_message_id } = decoded;

    const options = { force: true };
    if (inline_message_id) {
      options.inline_message_id = inline_message_id;
    } else {
      options.chat_id = chat_id;
      options.message_id = message_id;
    }

    await bot.telegram.setGameScore(user_id, Math.max(0, Math.floor(score)), options);
    return res.json({ ok: true });
  } catch (err) {
    console.error('set_score error', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
});

// API to fetch highscores
app.post('/api/high_scores', async (req, res) => {
  try {
    const { payload, sig } = req.body || {};
    if (!payload || !sig) {
      return res.status(400).json({ ok: false, error: 'Missing payload/sig' });
    }
    const expectedSig = crypto.createHmac('sha256', GAME_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return res.status(401).json({ ok: false, error: 'Bad signature' });
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const { user_id, chat_id, message_id, inline_message_id } = decoded;

    const options = { user_id };
    if (inline_message_id) {
      options.inline_message_id = inline_message_id;
    } else {
      options.chat_id = chat_id;
      options.message_id = message_id;
    }

    const scores = await bot.telegram.getGameHighScores(user_id, options);
    return res.json({ ok: true, scores });
  } catch (err) {
    console.error('high_scores error', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
});

// Start
(async () => {
  await bot.launch();
  app.listen(PORT, () => {
    console.log(`Server on ${DOMAIN} (port ${PORT})`);
  });

  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
})();