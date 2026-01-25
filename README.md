# Nabra Music Bot 🎵

A feature-rich Discord music bot built with Discord.js v14 and Riffy audio framework.

## Features

- 🎵 High-quality music playback via Lavalink
- 📜 Queue management with shuffle and loop modes
- 🎛️ Volume controls and seek functionality
- ⚡ Lightning fast search (YouTube support)
- 🔘 Interactive button controls
- 📊 Central music control embed for servers
- 📈 Play statistics tracking
- 🔄 24/7 mode support
- 🚀 Optimized for multi-server deployment

## Tech Stack

- **Discord.js** v14 - Discord API framework
- **Riffy** - Audio processing with Lavalink
- **MongoDB** - Database with connection pooling
- **Redis** - Optional caching layer (falls back to memory)
- **Winston** - Professional logging
- **Sentry** - Error tracking (optional)
- **Express** - Health endpoint server

## Installation

1. Clone the repository:

```bash
git clone https://github.com/thedelusions/nabra.git
cd nabra
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with required variables (see below)

4. Start the bot:

```bash
npm start
```

## Environment Variables

### Required

| Variable      | Description                   |
| ------------- | ----------------------------- |
| `TOKEN`       | Discord bot token             |
| `CLIENT_ID`   | Discord application client ID |
| `MONGODB_URI` | MongoDB connection string     |

### Lavalink Configuration

| Variable            | Description              | Default |
| ------------------- | ------------------------ | ------- |
| `LAVALINK_HOST`     | Lavalink server host     | -       |
| `LAVALINK_PORT`     | Lavalink server port     | `443`   |
| `LAVALINK_PASSWORD` | Lavalink server password | -       |
| `LAVALINK_SECURE`   | Use secure connection    | `true`  |

### Optional Enhancements

| Variable             | Description                      | Default                       |
| -------------------- | -------------------------------- | ----------------------------- |
| `REDIS_URL`          | Redis connection URL for caching | Memory cache                  |
| `REDISCLOUD_URL`     | Alternative Redis URL (Heroku)   | -                             |
| `SENTRY_DSN`         | Sentry DSN for error tracking    | Disabled                      |
| `LOG_LEVEL`          | Winston log level                | `info` (prod) / `debug` (dev) |
| `LOG_TO_FILE`        | Enable file logging              | `false`                       |
| `MONGO_POOL_SIZE`    | MongoDB connection pool size     | `10`                          |
| `LAZY_LOAD_COMMANDS` | Enable lazy command loading      | `false`                       |
| `NODE_ENV`           | Environment mode                 | `development`                 |
| `PORT`               | Express server port              | `8888`                        |

## API Endpoints

### Health Check

```
GET /health
```

Returns system health status including:

- Server uptime
- Database connection status
- Cache status (Redis/Memory)
- Memory usage

## Commands

### Slash Commands

| Command            | Description                         |
| ------------------ | ----------------------------------- |
| `/play <query>`    | Play a song or add to queue         |
| `/pause`           | Pause current track                 |
| `/resume`          | Resume playback                     |
| `/skip`            | Skip to next track                  |
| `/stop`            | Stop playback and disconnect        |
| `/queue`           | View current queue                  |
| `/nowplaying`      | Show current track info             |
| `/volume <1-100>`  | Set volume level                    |
| `/seek <time>`     | Seek to position (e.g., 1:30)       |
| `/loop <mode>`     | Set loop mode (track/queue/off)     |
| `/shuffle`         | Shuffle the queue                   |
| `/help`            | Show all commands                   |
| `/setup-central`   | Setup central music control channel |
| `/disable-central` | Disable central music control       |
| `/24-7`            | Toggle 24/7 mode                    |
| `/autoplay`        | Toggle autoplay                     |
| `/stats`           | View bot statistics                 |

### Message Commands

Use the bot mention or configured prefix followed by command name.

## Central Music Control

The central embed system allows you to designate a channel for music control:

1. Run `/setup-central` in your desired channel
2. Users can type song names directly in the channel
3. Interactive buttons for play controls
4. Auto-updates with current track info

## Deployment

### Heroku

See [HEROKU_DEPLOYMENT.md](HEROKU_DEPLOYMENT.md) for detailed Heroku deployment guide.

### Docker

```bash
docker build -t nabra-music-bot .
docker run -d --env-file .env nabra-music-bot
```

## Architecture

```
nabra/
├── commands/
│   ├── message/    # Prefix commands
│   └── slash/      # Slash commands
├── events/         # Discord event handlers
├── models/         # Mongoose models
├── utils/          # Utility modules
│   ├── cache.js       # Redis/Memory caching
│   ├── centralEmbed.js # Central embed handler
│   ├── errorHandler.js # Error handling + Sentry
│   ├── logger.js      # Winston logging
│   ├── player.js      # Music player handler
│   └── ...
├── database/       # Database connection
├── index.js        # Express server entry
├── main.js         # Bot initialization
└── config.js       # Configuration
```

## Performance Features

- **Redis Caching**: Reduces database queries with automatic fallback to memory
- **Connection Pooling**: Optimized MongoDB connections for multi-server use
- **Lazy Command Loading**: Optional lazy loading for faster startup
- **Singleton Pattern**: Central embed handler uses singleton for efficiency

## Monitoring

- **Winston Logging**: Structured logs with multiple transports
- **Sentry Integration**: Automatic error tracking and reporting
- **Health Endpoint**: `/health` for uptime monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details.

## Support

- Discord: [Support Server](https://discord.gg/v9SzcXyzrk)
- Issues: [GitHub Issues](https://github.com/thedelusions/nabra/issues)

---

Made with ❤️ by 𝖇𝖎𝖔𝖘
