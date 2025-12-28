# Deploy Nabra Music Bot to Render.com

## Step 1: Prepare Your Code

✅ Your bot is ready for deployment!
- `package.json` updated with start script
- `.gitignore` created to exclude sensitive files

## Step 2: Push to GitHub

1. **Create a new GitHub repository:**
   - Go to https://github.com/new
   - Name it: `nabra-music-bot` (or any name)
   - Make it **Private** (recommended for bot tokens)
   - Don't initialize with README

2. **Push your code:**
   ```bash
   cd /home/bios/code/bios/bots/UltimateMusic-Bot
   git init
   git add .
   git commit -m "Initial commit - Nabra Music Bot"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/nabra-music-bot.git
   git push -u origin main
   ```

## Step 3: Deploy on Render.com

1. **Sign up/Login:**
   - Go to https://render.com
   - Sign up with GitHub (easiest method)

2. **Create New Web Service:**
   - Click "New +" → "Background Worker"
   - Connect your GitHub repository
   - Select your `nabra-music-bot` repository

3. **Configure the Service:**
   - **Name:** `nabra-music-bot`
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or upgrade for better performance)

4. **Add Environment Variables:**
   Click "Advanced" → "Add Environment Variable" for each:
   
   ```
   TOKEN = YOUR_DISCORD_BOT_TOKEN
   MONGODB_URI = YOUR_MONGODB_CONNECTION_STRING
   CLIENT_ID = YOUR_BOT_CLIENT_ID
   GUILD_ID = YOUR_GUILD_ID
   PREFIX = n!
   STATUS_TEXT = Nabra Music Bot
   EMBED_COLOR = #2F3767
   SUPPORT_SERVER_INVITE = https://discord.gg/qKKBqNSD65
   BOT_WEBSITE = https://oureonbh.com
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Wait 2-3 minutes for first deployment

## Step 4: Monitor Your Bot

- **Logs:** Click "Logs" tab to see bot console output
- **Status:** Check if bot shows "Online" in Discord
- **Auto-Deploy:** Render auto-deploys on every git push

## Important Notes

### Free Tier Limitations:
- ⚠️ **Sleeps after 15 minutes of inactivity**
- ⚠️ **750 hours/month free** (enough for 24/7 with one service)
- ⚠️ **First request takes 30-60 seconds to wake up**

### Keeping Bot Awake (Optional):
Add this code to keep bot from sleeping, or upgrade to paid plan ($7/month).

### Troubleshooting:

**Bot not starting:**
- Check logs for errors
- Verify all environment variables are set
- Ensure MongoDB URI is correct

**Bot disconnects:**
- Free tier has resource limits
- Consider upgrading to Starter plan ($7/month)

**Lavalink connection issues:**
- Make sure Lavalink server (de-01.strixnodes.com:2010) is accessible
- Check if Lavalink is still active

## Upgrading to Paid Plan

For production 24/7 hosting:
- **Starter Plan:** $7/month
- No sleep/inactivity
- Better performance
- More reliable

## Alternative: Use Render for Free + UptimeRobot

1. Deploy on Render (free)
2. Create a simple health endpoint in your bot
3. Use UptimeRobot to ping every 5 minutes
4. Keeps bot awake within free tier limits

---

Need help? Check Render docs: https://render.com/docs
