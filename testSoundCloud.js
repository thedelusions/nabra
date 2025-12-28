/**
 * SoundCloud Debugging Tool
 * Tests SoundCloud playback capability with your Lavalink server
 */

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
require('dotenv').config();

const testUrls = [
    'scsearch:lofi beats',
    'https://soundcloud.com/chillhop/sets/jazzy-beats',
    'https://soundcloud.com/monstercat/sets/monstercat-instinct-vol-1'
];

async function testSoundCloud() {
    console.log('🧪 Testing SoundCloud Playback with Lavalink\n');
    console.log('═══════════════════════════════════════\n');
    
    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

    client.once('ready', async () => {
        try {
            const riffy = client.riffy;
            
            console.log('✅ Bot connected, testing SoundCloud URLs...\n');
            
            for (const query of testUrls) {
                console.log(`\n🔍 Testing: ${query}`);
                console.log('─'.repeat(50));
                
                try {
                    const resolve = await riffy.resolve({ query });
                    
                    console.log(`Load Type: ${resolve.loadType}`);
                    console.log(`Tracks: ${resolve.tracks?.length || 0}`);
                    
                    if (resolve.tracks && resolve.tracks[0]) {
                        const track = resolve.tracks[0];
                        console.log(`✅ Title: ${track.info.title}`);
                        console.log(`   Author: ${track.info.author}`);
                        console.log(`   Source: ${track.info.sourceName}`);
                        console.log(`   URI: ${track.info.uri}`);
                        console.log(`   Isrc: ${track.info.isrc || 'N/A'}`);
                    } else {
                        console.log('❌ No tracks found');
                    }
                } catch (error) {
                    console.error(`❌ Error: ${error.message}`);
                }
            }
            
            console.log('\n\n📊 Analysis:');
            console.log('═══════════════════════════════════════');
            console.log('If tracks load but fail during playback, possible causes:');
            console.log('1. ⚠️  SoundCloud API restrictions (region/rate limits)');
            console.log('2. ⚠️  Lavalink plugin needs update/configuration');
            console.log('3. ⚠️  SoundCloud changed their streaming format');
            console.log('4. ⚠️  The specific track is geo-blocked or unavailable');
            console.log('\n💡 Solutions:');
            console.log('• Use a different Lavalink server with updated plugins');
            console.log('• Configure SoundCloud client ID in Lavalink');
            console.log('• Try using YouTube Music as primary source');
            console.log('• Use SoundCloud URLs from popular/public tracks only');
            
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        }
    });

    // Import the main file to initialize Riffy
    const main = require('./main');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
}

testSoundCloud();
