const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'help',
    aliases: ['h'],
    description: 'List all available commands',
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(message, args, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return message.reply({ embeds: [embed] }).catch(() => {});
        }

        message.shivaValidated = true;
        message.securityToken = COMMAND_SECURITY_TOKEN;

        try {
            const prefix = process.env.PREFIX || 'n!';
            const embedColor = process.env.EMBED_COLOR || '#2F3767';
            
            // Create the main help embed with better categorization
            const embed = new EmbedBuilder()
                .setTitle('🎵 Nabra Music Bot - Command Guide')
                .setColor(embedColor)
                .setDescription(`**Welcome to Nabra Music Bot!**\nPrefix: \`${prefix}\` | Slash Commands: \`/\`\nServing in **${client.guilds.cache.size}** servers 🌐`)
                .addFields(
                    {
                        name: '🎧 Essential Commands',
                        value: 
                            `\`${prefix}play <song/url>\` and \`${prefix}p \` or \`/play\` - Play music\n` +
                            `\`${prefix}pause\` or \`/pause\` - Pause playback\n` +
                            `\`${prefix}resume\` or \`/resume\` - Resume playback\n` +
                            `\`${prefix}skip\` and \`${prefix}s \`  or \`/skip\` - Skip current song\n` +
                            `\`${prefix}stop\` or \`/stop\` - Stop and clear queue\n` +
                            `\`${prefix}join\` or \`/join\` - Join your voice channel`,
                        inline: false
                    },
                    {
                        name: '📋 Queue Management',
                        value: 
                            `\`${prefix}queue\` and \`${prefix}q \`  or \`/queue\` - View song queue\n` +
                            `\`${prefix}nowplaying\` and \`${prefix}np \`  - Show current song\n` +
                            `\`${prefix}loop [mode]\` and \`${prefix}l \`  or \`/loop\` - Toggle loop (off/track/queue)\n` +
                            `\`${prefix}shuffle\` and \`${prefix}sh \`  or \`/shuffle\` - Shuffle queue\n` +
                            `\`${prefix}clear [from]\` or \`/clear\` - Clear queue\n` +
                            `\`${prefix}remove <position>\` or \`/remove\` - Remove song\n` +
                            `\`${prefix}move <from> <to>\` or \`/move\` - Move songs`,
                        inline: false
                    },
                    {
                        name: '⏯️ Playback Control',
                        value: 
                            `\`${prefix}forward [sec]\` and \`${prefix}f [SEC]\`  or \`/forward\` - Fast forward ⏩\n` +
                            `\`${prefix}rewind [sec]\` or \`/rewind\` - Rewind ⏪\n` +
                            `\`${prefix}jump <position>\` and \`${prefix}j \`  or \`/jump\` - Jump to track\n` +
                            `\`${prefix}volume [1-100]\` and \`${prefix}v [1-100]\`  or \`/volume\` - Adjust volume\n` +
                            `\`/autoplay\` - Toggle autoplay mode`,
                        inline: false
                    },
                    {
                        name: '⚙️ Settings & Admin',
                        value: 
                            `\`${prefix}247\` or \`/24-7\` - Toggle 24/7 mode (Admin)\n` +
                            `\`/setup-central\` - Set up control center\n` +
                            `\`/disable-central\` - Disable control center\n` +
                            `\`/clean-up\` - Clean up bot messages`,
                        inline: false
                    },
                    {
                        name: '📡 Supported Platforms',
                        value: '🎬 YouTube • 🎧 Spotify • 🔊 SoundCloud',
                        inline: false
                    },
                    {
                        name: '💡 Need Help?',
                        value: 
                            `• Use \`${prefix}support\` for support server link\n` +
                            `• Visit: Website Soon\n` +
                            `• Discord: https://discord.gg/qKKBqNSD65`,
                        inline: false
                    }
                )
                .setFooter({ text: 'Developed by 𝖇𝖎𝖔𝖘 • Tip: Most commands work with both prefix and slash!' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Help command error:', error);
            await message.reply('❌ An error occurred while fetching commands.');
        }
    }
};
