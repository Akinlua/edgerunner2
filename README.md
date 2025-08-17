# EdgeRunner Bot System

The EdgeRunner Bot System is a Node.js application for running automated betting bots that poll alerts from a provider (e.g., Pinnacle) and place bets on a bookmaker (e.g., BetKing). The system uses `child_process` to manage multiple bot instances, each with its own configuration stored in `data/edgerunner/`. This README focuses on the `EdgeRunner` class, its configuration, and how to run bots directly or via the API.

## Table of Contents
- [Overview](#overview)
- [EdgeRunner Class](#edgerunner-class)
- [Configuration Object](#configuration-object)
- [Running a Bot Directly](#running-a-bot-directly)
- [Running Bots via API](#running-bots-via-api)
- [API Endpoints](#api-endpoints)
- [Directory Structure](#directory-structure)
- [Setup and Installation](#setup-and-installation)
- [Troubleshooting](#troubleshooting)

## Overview
The `EdgeRunner` class (`src/bots/edgerunner/index.js`) is the core of the bot system. It polls alerts from a provider’s API (e.g., `https://swordfish-production.up.railway.app/alerts/<userId>`) and places bets on a bookmaker based on the provided configuration. Bots can be run standalone by instantiating `EdgeRunner` or managed via HTTP endpoints (`/edgerunner/*`) using a Node.js server with `child_process` for process isolation.

## EdgeRunner Class
The `EdgeRunner` class handles:
- **Polling**: Fetches alerts from `provider.alertApiUrl` every `provider.interval` seconds.
- **Betting**: Places bets on `bookmaker.name` (e.g., BetKing) using `bookmaker.username` and `bookmaker.password`.
- **Stake Management**: Uses `edgerunner.fixedStake` or `edgerunner.stakeFraction` to determine bet amounts, with `edgerunner.minValueBetPercentage` filtering low-value bets.

### Methods
- `constructor(config)`: Initializes the bot with a configuration object.
- `async initialize()`: Sets up connections (e.g., authenticates with the bookmaker).
- `start()`: Begins polling and betting.
- `async stop()`: Stops polling and cleans up.
- `getStatus()`: Returns the bot’s status (e.g., `{ status: "running" }`).

## Configuration Object
The `EdgeRunner` class requires a JSON configuration object with three sections: `provider`, `bookmaker`, and `edgerunner`. Below is the structure and purpose of each field:

```json
{
  "provider": {
    "name": "pinnacle",
    "storeData": true,
    "interval": 2,
    "userId": "user_30I2I43w4GgKpp0wHILCzs6HJmU",
    "alertApiUrl": "https://swordfish-production.up.railway.app/alerts/user_30I2I43w4GgKpp0wHILCzs6HJmU"
  },
  "bookmaker": {
    "name": "betking",
    "storeData": true,
    "interval": 2,
    "username": "07033054766",
    "password": "A1N2S3I4"
  },
  "edgerunner": {
    "name": "edgerunner",
    "stakeFraction": 0.1,
    "fixedStake": {
      "enabled": true,
      "value": 10
    },
    "minValueBetPercentage": 0
  }
}
```

### Field Descriptions
- **provider**:
  - `name` (string): Provider name (e.g., `"pinnacle"`). Used for logging and configuration.
  - `storeData` (boolean): If `true`, stores alert data in `data/cookies/` for persistence.
  - `interval` (number): Polling interval in seconds (e.g., `2` for every 2 seconds).
  - `userId` (string): Unique user ID (e.g., `user_30I2I43w4GgKpp0wHILCzs6HJmU`). Must be unique across bots.
  - `alertApiUrl` (string): URL for fetching alerts (e.g., `https://swordfish-production.up.railway.app/alerts/<userId>`).
- **bookmaker**:
  - `name` (string): Bookmaker name (e.g., `"betking"`).
  - `storeData` (boolean): If `true`, stores bookmaker session data in `data/cookies/`.
  - `interval` (number): Interval for bookmaker actions (e.g., checking bet status) in seconds.
  - `username` (string): Bookmaker account username (e.g., `07033054766`). Must be unique.
  - `password` (string): Bookmaker account password.
- **edgerunner**:
  - `name` (string): Bot name (e.g., `"edgerunner"`). Used for identification.
  - `stakeFraction` (number): Fraction of account balance to bet if `fixedStake.enabled` is `false` (e.g., `0.1` for 10%).
  - `fixedStake` (object):
    - `enabled` (boolean): If `true`, uses a fixed bet amount; if `false`, uses `stakeFraction`.
    - `value` (number): Fixed bet amount (e.g., `10` for $10).
  - `minValueBetPercentage` (number): Minimum expected value percentage for placing bets (e.g., `0` to accept all bets).

## Running a Bot Directly
To run a bot standalone (without the API), instantiate `EdgeRunner` in a script:

1. Create `run-bot.js`:
   ```javascript
   import EdgeRunner from './src/bots/edgerunner/index.js';

   const config = {
     provider: {
       name: "pinnacle",
       storeData: true,
       interval: 2,
       userId: "user_30I2I43w4GgKpp0wHILCzs6HJmU",
       alertApiUrl: "https://swordfish-production.up.railway.app/alerts/user_30I2I43w4GgKpp0wHILCzs6HJmU"
     },
     bookmaker: {
       name: "betking",
       storeData: true,
       interval: 2,
       username: "07033054766",
       password: "A1N2S3I4"
     },
     edgerunner: {
       name: "edgerunner",
       stakeFraction: 0.1,
       fixedStake: { enabled: true, value: 10 },
       minValueBetPercentage: 0
     }
   };

   async function main() {
     const bot = new EdgeRunner(config);
     await bot.initialize();
     bot.start();
   }

   main().catch(console.error);
   ```

2. Ensure directories exist:
   ```bash
   mkdir -p data/edgerunner data/cookies
   chmod -R u+w data
   ```

3. Run:
   ```bash
   node run-bot.js
   ```

   **Expected Output**:
   ```
   [BotRunner] EdgeRunner started with config: (inline)
   [Provider] STATUS: No new notifications | Cursor: <cursor>
   ```

   **Note**: This runs a single bot without process management. Use the API for multiple bots.

## Running Bots via API
The API (`src/server.js`) uses `child_process` to manage multiple `EdgeRunner` instances, each with its own config stored in `data/edgerunner/<botId>.json`. The server runs on `http://localhost:9090` (configurable via `.env`).

### API Endpoints
1. **Start a Bot** (`POST /edgerunner/start`):
   - **Body**: Config object (see [Configuration Object](#configuration-object)).
   - **Response**: `{ "message": "Bot started", "pm_id": "<botId>", "name": "edgerunner-<botId>" }`
   - **Example**:
     ```bash
     curl -X POST http://localhost:9090/edgerunner/start -H "Content-Type: application/json" -d @config.json
     ```
     Output: `{"message":"Bot started","pm_id":"me67eauzpix13fg32rg","name":"edgerunner-me67eauzpix13fg32rg"}`

2. **List Bots** (`GET /edgerunner/list`):
   - **Response**: `{ "bots": [{ "pm_id": "<botId>", "name": "edgerunner-<botId>", "status": "online" }, ...] }`
   - **Example**:
     ```bash
     curl http://localhost:9090/edgerunner/list
     ```
     Output: `{"bots":[{"pm_id":"me67eauzpix13fg32rg","name":"edgerunner-me67eauzpix13fg32rg","status":"online"}]}`

3. **Get Bot Status** (`GET /edgerunner/status/:id`):
   - **Response**: `{ "message": "Bot status", "pm_id": "<botId>", "status": "<status>" }`
   - **Example**:
     ```bash
     curl http://localhost:9090/edgerunner/status/me67eauzpix13fg32rg
     ```
     Output: `{"message":"Bot status","pm_id":"me67eauzpix13fg32rg","status":"online"}`

4. **Stop a Bot** (`POST /edgerunner/stop/:id`):
   - **Response**: `{ "message": "Bot stopped", "pm_id": "<botId>" }`
   - **Example**:
     ```bash
     curl -X POST http://localhost:9090/edgerunner/stop/me67eauzpix13fg32rg
     ```
     Output: `{"message":"Bot stopped","pm_id":"me67eauzpix13fg32rg"}`

5. **Update Bot Config** (`POST /edgerunner/config/:id`):
   - **Body**: `{ "fixedStake": { "enabled": true, "value": 15 }, "stakeFraction": 0.2, "minValueBetPercentage": 1 }`
   - **Response**: `{ "message": "Bot configuration updated", "pm_id": "<botId>" }`
   - **Example**:
     ```bash
     curl -X POST http://localhost:9090/edgerunner/config/me67eauzpix13fg32rg -H "Content-Type: application/json" -d '{"fixedStake":{"enabled":true,"value":15},"stakeFraction":0.2,"minValueBetPercentage":1}'
     ```

### Full Flow
1. **Start**: Send `POST /edgerunner/start` with a config object. The server creates `data/edgerunner/<botId>.json` and forks `instance.js`.
2. **Monitor**: Use `GET /edgerunner/list` to see all bots and `GET /edgerunner/status/:id` for specific bot status.
3. **Update**: Send `POST /edgerunner/config/:id` to update betting parameters (`fixedStake`, `stakeFraction`, `minValueBetPercentage`).
4. **Stop**: Send `POST /edgerunner/stop/:id` to stop a bot and delete its config file.

## Directory Structure
```
project_root/
├── data/
│   ├── edgerunner/          # Stores bot configs (<botId>.json)
│   ├── cookies/            # Stores session data
├── src/
│   ├── bots/
│   │   ├── edgerunner/
│   │   │   ├── index.js    # EdgeRunner class
│   │   │   ├── instance.js # Bot process script
│   ├── controllers/
│   │   ├── edgerunner.js   # API endpoints
│   ├── routes/
│   │   ├── edgerunner.js   # Route definitions
│   ├── configurations/
│   │   ├── index.js        # Server config
│   ├── server.js           # Express server
├── .env                    # Environment variables
├── config.json             # Example bot config
├── package.json
```

## Setup and Installation
1. **Clone Repository**:
   ```bash
   git clone <repository>
   cd <repository>
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env`**:
   ```env
   API_BASE_URL=http://localhost:9090
   DATABASE_PATH=./data/main.db
   PORT=9090
   DISCORD_TOKEN=your_discord_token
   CRON_INTERVAL_MIN=10
   ```

4. **Create Directories**:
   ```bash
   mkdir -p data/edgerunner data/cookies
   chmod -R u+w data
   ```

5. **Run Server**:
   ```bash
   npm run dev
   ```

6. **Start a Bot**:
   ```bash
   curl -X POST http://localhost:9090/edgerunner/start -H "Content-Type: application/json" -d @config.json
   ```

## Troubleshooting
- **Bot Crashes**: Check logs for `[Bot <botId>] stderr:`. Common issues:
  - Invalid `alertApiUrl` or network errors.
  - Missing `data/cookies/` or permissions (`chmod -R u+w data`).
  - `EdgeRunner.initialize()` failures (e.g., invalid `username`/`password`).
- **No Config File**: Verify `data/edgerunner/` path in `edgerunner.js` (`../../data/edgerunner/`).
- **Empty `/list`**: Bot may have crashed. Check logs and restart with `POST /edgerunner/start`.
- **Verbose Logs**: If `[Provider] STATUS: No new notifications` floods logs, modify `EdgeRunner.start()` to log only on cursor changes (see code example above).

For issues, check server logs (`npm run dev`) or add debug logging in `instance.js`:
```javascript
console.error('[BotRunner] Failed to start bot:', error.message, error.stack);
```
```

### Notes
- **Log Fix**: The suggested `EdgeRunner` patch reduces log clutter by logging only on cursor changes or every 10 polls. Share `src/bots/edgerunner/index.js` for a tailored fix.
- **Config Separation**: The updated `configurations/index.js` is server-only, and bot configs are now fully managed via API, improving modularity.
- **Multi-Bot Testing**: The `README.md` includes steps to test multiple bots with your provided `userId`s (`user_2tx1tBtUOvXZXyUU8BaQ5Bpy15W`, `user_30I2I43w4GgKpp0wHILCzs6HJmU`, `user_2VqFOsEjFG0YgEAhZDvFe4QE6yf`).
- **Database**: The `README` mentions `data/main.db` for future integration. If you want to implement SQLite now, let me know, and I’ll update `edgerunner.js` to store configs in the database.
- **Restart Logic**: If bots crash due to network issues, add retry logic in `EdgeRunner` or `edgerunner.js` (as shown in the previous response).

### Next Steps
1. Apply the log fix to `src/bots/edgerunner/index.js` or share its code for a precise update.
2. Save the `README.md` and test the multi-bot flow with the three configs:
   ```bash
   curl -X POST http://localhost:9090/edgerunner/start -H "Content-Type: application/json" -d @config1.json
   curl -X POST http://localhost:9090/edgerunner/start -H "Content-Type: application/json" -d @config2.json
   curl -X POST http://localhost:9090/edgerunner/start -H "Content-Type: application/json" -d @config3.json
   curl http://localhost:9090/edgerunner/list
   ```
3. If logs are still too verbose or bots crash, share `index.js` or new logs. Want to add database support or alert handling logic next?
