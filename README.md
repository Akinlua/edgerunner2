Here is a clean, well-structured Markdown (`README.md`) file for your **EdgeRunner Bot System** project. You can copy and paste it directly:

---

````md
# EdgeRunner Bot System

The **EdgeRunner Bot System** is a high-speed, automated betting platform built on Node.js for identifying and executing value bets (or arbitrage opportunities). It continuously polls for alerts from an odds provider (e.g., **Pinnacle**) and places bets at a bookmaker (e.g., **BetKing**) with low latency.

## Table of Contents

- [Overview](#overview)
- [Use Cases and Scenarios](#use-cases-and-scenarios)
- [EdgeRunner Class (Core Logic)](#edgerunner-class-core-logic)
- [Inter-Process Communication (IPC) and Monitoring](#inter-process-communication-ipc-and-monitoring)
- [Configuration Object](#configuration-object)
- [Environment Configuration (.env files)](#environment-configuration-env-files)
- [Running a Bot Directly (Standalone)](#running-a-bot-directly-standalone)
- [Running Bots via API (Managed Processes)](#running-bots-via-api-managed-processes)
- [API Endpoints](#api-endpoints)
- [Directory Structure](#directory-structure)
- [Setup and Installation](#setup-and-installation)
- [Docker Usage](#docker-usage)
- [Troubleshooting](#troubleshooting)

---

## Overview

The `EdgeRunner` class (`src/bots/edgerunner/index.js`) is the core component. It handles:

- **Polling**: Fetches value bet alerts from `provider.alertApiUrl`.
- **Validation**: Matches alert data with bookmaker markets using fuzzy logic (`Fuse.js`).
- **Risk Management**: Applies strategies and value filters to determine stake.
- **Execution**: Places the bet using Puppeteer in a browser context.

Each bot runs in its own child process, ensuring isolated execution and fault tolerance.

---

## Use Cases and Scenarios

| Use Case                | Configuration Strategy                                                                                   | Technical Requirement                                                                                  |
|-------------------------|-----------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| Bankroll Diversification | Multiple bots with different bookmaker credentials                                                       | Distributes exposure to avoid account limits or bans.                                                   |
| Market Specialization   | Bot A (Aggressive) with `minValueBetPercentage: 1.5`, Bot B (Conservative) with `0.5`                     | Targets different risk/reward profiles.                                                                 |
| Geographic Optimization | Assign each bot a different proxy IP                                                                      | Bypasses geo-restrictions and accesses region-specific odds.                                            |
| Provider/Bookmaker Pairing | Run Bot A with Provider X → Bookmaker Y, and Bot B with Provider Z → Bookmaker W                  | Maximizes return by testing various combinations of providers/bookmakers.                               |

---

## EdgeRunner Class (Core Logic)

### Capabilities

- **Persistent Sessions**: Uses Puppeteer with stored cookies for fast login.
- **Fuzzy Matching**: Matches alert teams to bookmaker teams via `Fuse.js`.
- **Proxy Support**: All traffic can go through a proxy for geo/IP flexibility.
- **Resilient Polling**: Retry logic with exponential backoff.
- **High-Speed Execution**: Bets placed via direct browser-based API calls.

### Methods

| Method           | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `constructor(config)` | Initializes with a configuration object.                                   |
| `async initialize()` | Loads cookies, logs in to bookmaker, checks balance.                        |
| `start()`        | Begins continuous polling and betting cycle.                                 |
| `async stop()`   | Stops polling, closes browser, cleans resources.                            |
| `getStatus()`    | Returns current status (running, stopped, error).                           |

---

## Inter-Process Communication (IPC) and Monitoring

- **Architecture**: Uses `child_process.fork()` for each bot.
- **Communication**: JSON messages over IPC between API and bot processes.
- **Control**: Parent can send `STOP`, `UPDATE_CONFIG`, etc.
- **Monitoring**: Bots send `STATUS_UPDATE` messages back.
- **Discord Alerts**: Uses `.env` config to send updates to a Discord channel.

---

## Configuration Object

Example JSON payload for `/edgerunner/start`:

```json
{
  "provider": {
    "userId": "user_30I2I43w4GgKpp0wHILCzs6HJmU",
    "name": "pinnacle",
    "interval": 2
  },
  "bookmaker": {
    "username": "08145237776",
    "password": "147258",
    "name": "betking"
  },
  "edgerunner": {
    "fixedStake": { "enabled": true, "value": 5000 },
    "minValueBetPercentage": 1.0
  },
  "proxy": {
    "enabled": true,
    "ip": "109.107.54.92:6001",
    "username": "UKwokPecgB",
    "password": "11453606"
  }
}
````

### Field Descriptions

| Section      | Field                        | Type   | Description                                           |
| ------------ | ---------------------------- | ------ | ----------------------------------------------------- |
| `provider`   | `userId`                     | string | Unique identifier.                                    |
|              | `alertApiUrl`                | string | Source of real-time alerts.                           |
| `bookmaker`  | `username`, `password`       | string | Login credentials.                                    |
|              | `name`                       | string | Bookmaker module name (e.g., "betking").              |
| `edgerunner` | `fixedStake`                 | object | `{ enabled: boolean, value: number }`                 |
|              | `stakeFraction`              | number | If no fixed stake, use bankroll fraction (e.g., 0.1). |
|              | `minValueBetPercentage`      | number | Minimum expected value to trigger a bet.              |
| `proxy`      | `ip`, `username`, `password` | string | Proxy credentials and IP.                             |

---

## Environment Configuration (.env files)

Environment variables are stored in `env/`:

```bash
# .env.development

NODE_ENV=development
PORT=9090

MAX_EDGERUNNER_INSTANCES=10

DISCORD_TOKEN=Your_Bot_Token
DISCORD_CLIENT_ID=123456789012345678
DISCORD_GUILD_ID=111111111111111111
DISCORD_BOTS_CATEGORY_ID=222222222222222222
```

---

## Running a Bot Directly (Standalone)

For development/debugging only.

1. Create `run-bot.js` with your config.
2. Setup directories:

```bash
mkdir -p data/edgerunner data/cookies
chmod -R u+w data
```

3. Run:

```bash
node run-bot.js
```

---

## Running Bots via API (Managed Processes)

### Start API Server

```bash
npm run dev    # Development
npm start      # Production
```

---

## API Endpoints

| Method | Endpoint                 | Description                           |
| ------ | ------------------------ | ------------------------------------- |
| POST   | `/edgerunner/start`      | Launch a new bot with config JSON.    |
| GET    | `/edgerunner/list`       | List all bots with current status.    |
| GET    | `/edgerunner/status/:id` | Get details for a specific bot.       |
| POST   | `/edgerunner/stop/:id`   | Gracefully stop a bot.                |
| POST   | `/edgerunner/config/:id` | Dynamically update bot configuration. |

### Example: Start Bot via cURL

### Start Bot Locally

```bash
curl --location 'http://localhost:9090/edgerunner/start' \
--header 'Content-Type: application/json' \
--data '{
    "provider": {
        "userId": "user_30I2I43w4GgKpp0wHILCzs6HJmU"
    },
    "bookmaker": {
        "username": "07033054766",
        "password": "A1N2S3I4"
    },
    "edgerunner": {
        "fixedStake": {
            "enabled": true,
            "value": 10
        }
    },
    "proxy": {
        "enabled": true,
        "ip": "109.107.54.237:6001",
        "username": "UKwokPecgB",
        "password": "11453606"
    }
}'
```

### Start Bot on Deployed Server

```bash
curl --location 'https://edge-runner-p35d.onrender.com/edgerunner/start' \
--header 'Content-Type: application/json' \
--data '{
    "provider": {
        "userId": "user_30I2I43w4GgKpp0wHILCzs6HJmU"
    },
    "bookmaker": {
        "username": "07033054766",
        "password": "A1N2S3I4"
    },
    "edgerunner": {
        "fixedStake": {
            "enabled": true,
            "value": 10
        }
    },
    "proxy": {
        "enabled": true,
        "ip": "109.107.54.237:6001",
        "username": "UKwokPecgB",
        "password": "11453606"
    }
}'
```
---

## Directory Structure

| Path                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| `data/edgerunner/`     | Stores runtime bot configurations.           |
| `env/`                 | Environment files (`.env.*`).                |
| `src/bots/edgerunner/` | Core EdgeRunner class logic.                 |
| `src/server.js`        | API server that manages bot child processes. |

---

## Setup and Installation

```bash
# 1. Clone repo
git clone <repo-url> && cd edgerunner-bot

# 2. Install dependencies
npm install

# 3. Create required directories
mkdir -p data/edgerunner data/cookies && chmod -R u+w data

# 4. Configure environment
#    Add .env files in the env/ directory

```


# 5. Start server

npm run dev    # OR
npm start

````

---

## Docker Usage

### Build & Run

```bash
# Build Docker image
docker build -t edgerunner-bot .

# Run container and expose API port
docker run -d -p 9090:9090 --name edgerunner edgerunner-bot
````

### Logs

```bash
docker logs -f edgerunner
```

---

## Troubleshooting

* **Permission Errors**: Ensure `data/` has correct write permissions.
* **Unique IDs**: Each bot must have a unique `provider.userId` and `bookmaker.username`.
* **Crashing Bots**: Use the API to check status logs. Errors from child processes are streamed to the main server console.
* **Rate Limits**: Avoid reusing same account credentials across multiple bots.

---

> **Note**: For best results in production, run behind a process manager like PM2 or inside Docker with resource limits.

```


```

