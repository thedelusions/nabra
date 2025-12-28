const { REST, Routes } = require('discord.js');
const config = require('./config');
require('dotenv').config();

const rest = new REST().setToken(config.discord.token || process.env.TOKEN);

async function clearAllCommands(clientId) {
    try {
        if (!clientId) {
            console.error('❌ CLIENT_ID is required!');
            console.log('Usage: node clearCommands.js <CLIENT_ID>');
            console.log('Example: node clearCommands.js 1234567890123456789');
            console.log('\n💡 You can find your CLIENT_ID in the Discord Developer Portal');
            console.log('   or start your bot and check the console output.');
            process.exit(1);
        }

        console.log('🔄 Started clearing all application (/) commands...');
        console.log(`🆔 Client ID: ${clientId}`);

        // Clear all global commands
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] }
        );

        console.log(`✅ Successfully cleared ${data.length} global slash commands!`);
        console.log('💡 Restart your bot to re-register the current commands.');
        
    } catch (error) {
        console.error('❌ Error clearing commands:', error.message);
        if (error.code === 10002) {
            console.error('   Make sure the CLIENT_ID is correct!');
        }
    }
}

// Get CLIENT_ID from command line or environment variable
const clientId = process.argv[2] || process.env.CLIENT_ID;

if (!clientId) {
    console.error('❌ CLIENT_ID not found!');
    console.log('Add CLIENT_ID to your .env file or pass it as argument:');
    console.log('Usage: node clearCommands.js <CLIENT_ID>');
    process.exit(1);
}

// Run the cleaner
clearAllCommands(clientId);
