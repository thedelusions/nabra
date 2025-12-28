#!/bin/bash

# Set environment variables for Heroku app: nabra

heroku config:set -a nabra \
  TOKEN='YOUR_DISCORD_BOT_TOKEN' \
  MONGODB_URI='YOUR_MONGODB_CONNECTION_STRING' \
  CLIENT_ID='YOUR_BOT_CLIENT_ID' \
  GUILD_ID='YOUR_GUILD_ID' \
  PREFIX='n!' \
  STATUS_TEXT='Nabra Music Bot' \
  EMBED_COLOR='#2F3767' \
  SUPPORT_SERVER_INVITE='https://discord.gg/qKKBqNSD65' \
  BOT_WEBSITE='https://oureonbh.com'

echo "✅ Environment variables set!"
