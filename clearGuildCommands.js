/**
 * Guild-Specific Slash Command Cache Cleaner
 * Use this script to clear slash commands from a specific guild/server
 * 
 * Usage:
 *   node clearGuildCommands.js <CLIENT_ID> <GUILD_ID>
 * 
 * Example:
 *   node clearGuildCommands.js 1234567890123456789 9876543210987654321
 */

const { REST, Routes } = require('discord.js');
const config = require('./config');
require('dotenv').config();

const rest = new REST().setToken(config.discord.token || process.env.TOKEN);

async function clearGuildCommands(clientId, guildId) {
    try {
        if (!clientId || !guildId) {
            console.error('❌ Both CLIENT_ID and GUILD_ID are required!');
            console.log('Usage: node clearGuildCommands.js <CLIENT_ID> <GUILD_ID>');
            console.log('Example: node clearGuildCommands.js 1234567890123456789 9876543210987654321');
            process.exit(1);
        }

        console.log('🔄 Started clearing guild-specific application (/) commands...');
        console.log(`🆔 Client ID: ${clientId}`);
        console.log(`🏰 Guild ID: ${guildId}`);

        // Clear guild-specific commands
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [] }
        );

        console.log(`✅ Successfully cleared ${data.length} guild slash commands!`);
        console.log('💡 Restart your bot to re-register the current commands.');
        
    } catch (error) {
        console.error('❌ Error clearing guild commands:', error.message);
        if (error.code === 10002) {
            console.error('   Make sure the CLIENT_ID is correct!');
        } else if (error.code === 50001) {
            console.error('   The bot is not in that guild or lacks permissions!');
        }
    }
}

// Get CLIENT_ID and GUILD_ID from command line or environment variables
const clientId = process.argv[2] || process.env.CLIENT_ID;
const guildId = process.argv[3] || process.env.GUILD_ID;

if (!clientId || !guildId) {
    console.error('❌ CLIENT_ID and GUILD_ID not found!');
    console.log('Add them to your .env file or pass as arguments:');
    console.log('Usage: node clearGuildCommands.js <CLIENT_ID> <GUILD_ID>');
    process.exit(1);
}

// Run the cleaner
clearGuildCommands(clientId, guildId);
