/**
 * Test Lavalink server capabilities
 * This will check if SoundCloud is supported by your Lavalink server
 */

const { REST } = require('@discordjs/rest');
const config = require('./config');

async function testLavalinkInfo() {
    try {
        const lavalinkUrl = `http://${config.lavalink.host}:${config.lavalink.port}/v4/info`;
        
        console.log('🔍 Checking Lavalink server capabilities...\n');
        console.log(`📡 Server: ${config.lavalink.host}:${config.lavalink.port}`);
        
        const response = await fetch(lavalinkUrl, {
            headers: {
                'Authorization': config.lavalink.password
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('\n✅ Lavalink Server Info:');
        console.log('═══════════════════════════════════════');
        console.log(`Version: ${data.version?.semver || data.version || 'Unknown'}`);
        console.log(`Git: ${data.git?.commit?.substring(0, 7) || 'Unknown'}`);
        
        console.log('\n🎵 Supported Source Managers:');
        console.log('═══════════════════════════════════════');
        
        if (data.sourceManagers && data.sourceManagers.length > 0) {
            data.sourceManagers.forEach(source => {
                const icon = source === 'youtube' ? '🎬' : 
                           source === 'soundcloud' ? '🔊' :
                           source === 'spotify' ? '🎧' :
                           source === 'bandcamp' ? '🎸' :
                           source === 'vimeo' ? '📹' :
                           source === 'twitch' ? '🎮' :
                           source === 'http' ? '🌐' : '🎵';
                console.log(`${icon} ${source}`);
            });
            
            const hasSoundCloud = data.sourceManagers.includes('soundcloud');
            
            console.log('\n📊 SoundCloud Status:');
            console.log('═══════════════════════════════════════');
            if (hasSoundCloud) {
                console.log('✅ SoundCloud is ENABLED on this Lavalink server');
                console.log('\n💡 To use SoundCloud:');
                console.log('   1. Direct URL: !play https://soundcloud.com/...');
                console.log('   2. Search: !play scsearch:song name');
            } else {
                console.log('❌ SoundCloud is NOT enabled on this Lavalink server');
                console.log('\n💡 Solutions:');
                console.log('   1. Use a different Lavalink server with SoundCloud support');
                console.log('   2. Host your own Lavalink with SoundCloud plugin');
                console.log('   3. Use YouTube/Spotify instead');
            }
        } else {
            console.log('⚠️  Could not retrieve source managers list');
        }
        
        if (data.plugins && data.plugins.length > 0) {
            console.log('\n🔌 Installed Plugins:');
            console.log('═══════════════════════════════════════');
            data.plugins.forEach(plugin => {
                console.log(`• ${plugin.name} v${plugin.version}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking Lavalink:', error.message);
        console.log('\n💡 Make sure:');
        console.log('   • Lavalink server is running');
        console.log('   • Host and port are correct in config.js');
        console.log('   • Password is correct');
    }
}

testLavalinkInfo();
