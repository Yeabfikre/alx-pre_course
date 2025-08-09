## Telegram Tic Tac Toe Game (GameBot-style)

HTML5 Tic Tac Toe that opens inside Telegram like `@gamebot` games. Built with Express + Telegraf. Uses Bot API `sendGame`, `answerCallbackQuery(url)`, `setGameScore`, `getGameHighScores`.

### Prerequisites
- Node.js 18+
- A Telegram Bot token from `@BotFather`
- Enable inline mode for your bot in `@BotFather`
- Create a Game in `@BotFather` with short name matching `GAME_SHORT_NAME` (default: `tictactoe`)
- A public HTTPS URL for the game (use ngrok or similar during development)

### Setup
1. Copy `.env.example` to `.env` and fill values:
   - `BOT_TOKEN` – your bot token
   - `GAME_SHORT_NAME` – must match the game you created in `@BotFather`
   - `DOMAIN` – your public HTTPS origin (e.g. ngrok URL)
   - `GAME_SECRET` – any strong secret string
2. Install dependencies:

```bash
npm install
```

3. Run the server (long polling) locally:

```bash
npm run dev
```

Expose your local port via a tunnel and set `DOMAIN` to that URL.

### Use
- In Telegram, start a chat with your bot and send `/start` to receive the game card. Tap Play to open the game.
- Or in any chat type `@YourBotName` and choose the game to send an inline game message.
- Win a round then tap “Submit Score” to post your score. High scores are tracked by Telegram per chat message.

### Notes
- Game URL is signed with an HMAC to prevent tampering. The game submits scores to `/api/set_score` which calls `setGameScore`.
- For production, host with HTTPS and keep `GAME_SECRET` private.
