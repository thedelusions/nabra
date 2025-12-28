# Deploy Nabra Music Bot to Heroku

## Prerequisites
- GitHub account
- Heroku account (sign up at https://heroku.com)
- Git installed

## Step 1: Prepare Your Repository

```bash
cd /home/bios/code/bios/bots/UltimateMusic-Bot

# Initialize git if not already done
git init
git add .
git commit -m "Nabra Music Bot - Heroku deployment"
```

## Step 2: Install Heroku CLI

```bash
# On Linux
curl https://cli-assets.heroku.com/install.sh | sh

# Verify installation
heroku --version
```

## Step 3: Login to Heroku

```bash
heroku login
```
(Opens browser, login with your Heroku account)

## Step 4: Create Heroku App

```bash
# Create new Heroku app
heroku create nabra-music-bot

# Or with custom name:
heroku create your-custom-name
```

## Step 5: Set Environment Variables

```bash
heroku config:set TOKEN="YOUR_DISCORD_BOT_TOKEN"
heroku config:set MONGODB_URI="YOUR_MONGODB_CONNECTION_STRING"
heroku config:set CLIENT_ID="YOUR_BOT_CLIENT_ID"
heroku config:set GUILD_ID="YOUR_GUILD_ID"
heroku config:set PREFIX="n!"
heroku config:set STATUS_TEXT="Nabra Music Bot"
heroku config:set EMBED_COLOR="#2F3767"
heroku config:set SUPPORT_SERVER_INVITE="https://discord.gg/qKKBqNSD65"
heroku config:set BOT_WEBSITE="https://oureonbh.com"
```

## Step 6: Deploy to Heroku

```bash
# Add Heroku remote
git remote add heroku https://git.heroku.com/nabra-music-bot.git

# Push to Heroku
git push heroku main
```

## Step 7: Scale Worker Dyno

```bash
# Stop web dyno (not needed for Discord bots)
heroku ps:scale web=0

# Start worker dyno
heroku ps:scale worker=1
```

## Step 8: Check Logs

```bash
# View live logs
heroku logs --tail

# Check dyno status
heroku ps
```

## Pricing (as of 2025)

- **Eco Dynos:** $5/month - Sleeps after 30min inactivity ❌
- **Basic Dynos:** $7/month - True 24/7, no sleeping ✅

**Recommended:** Use Basic dyno for 24/7 operation

```bash
# Upgrade to Basic (after creating app)
heroku dyno:type basic
```

## Useful Commands

```bash
# View config vars
heroku config

# Restart bot
heroku restart

# View logs
heroku logs --tail

# Open dashboard
heroku open

# Check billing
heroku billing
```

## Troubleshooting

**Bot not starting:**
```bash
heroku logs --tail
```
Check for errors in the logs

**Worker not running:**
```bash
heroku ps
heroku ps:scale worker=1
```

**Environment variables missing:**
```bash
heroku config
# Re-add any missing variables
```

**MongoDB connection issues:**
- Verify MONGODB_URI is correct
- Check MongoDB Atlas whitelist (allow all IPs: 0.0.0.0/0)

## Alternative: Deploy via GitHub

1. Go to https://dashboard.heroku.com
2. Click "New" → "Create new app"
3. Connect GitHub repository
4. Enable automatic deploys
5. Add environment variables in Settings → Config Vars
6. Deploy branch manually first time

---

**Note:** Heroku charges start when you create the dyno. Make sure to choose the right plan!
