/**
 * Manual Slash Command Registration Script
 * Use this to force refresh Discord slash commands without restarting the bot
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const slashCommandsPath = path.join(__dirname, 'commands', 'slash');

// Load all slash commands
const commandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));

console.log(`📂 Found ${commandFiles.length} slash command files`);

for (const file of commandFiles) {
    const filePath = path.join(slashCommandsPath, file);
    const command = require(filePath);
    
    if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded: ${command.data.name}`);
    } else {
        console.log(`⚠️  Skipped ${file}: Missing 'data' property`);
    }
}

// Use CLIENT_ID from environment or command line
const clientId = process.argv[2] || process.env.CLIENT_ID;

if (!clientId) {
    console.error('❌ CLIENT_ID not found. Usage: node registerCommands.js [CLIENT_ID]');
    process.exit(1);
}

const rest = new REST().setToken(process.env.TOKEN);

// Register commands globally
(async () => {
    try {
        console.log(`\n🔄 Registering ${commands.length} slash commands globally...`);
        
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        
        console.log(`✅ Successfully registered ${data.length} slash commands!`);
        console.log('\n📋 Registered commands:');
        data.forEach(cmd => console.log(`   - /${cmd.name}`));
        
        console.log('\n✨ Commands should appear in Discord within a few seconds!');
        
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
