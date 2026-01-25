// /**
//  * Oureon API Client for Nabra
//  * 
//  * Sends events to the Oureon backend for centralized analytics.
//  * This runs alongside your existing local StatsService.
//  * 
//  * Setup:
//  * 1. Add to your .env:
//  *    OUREON_API_URL=http://localhost:4000
//  *    OUREON_API_KEY=oureon_nabra_xxxxx
//  * 
//  * 2. Initialize in your bot:
//  *    const OureonClient = require('./utils/oureonClient');
//  *    client.oureon = new OureonClient();
//  * 
//  * 3. Send events from your player:
//  *    client.oureon.trackPlayed(guildId, userId, trackInfo);
//  */

// class OureonClient {
//   constructor() {
//     this.apiUrl = process.env.OUREON_API_URL || 'http://localhost:4000';
//     this.apiKey = process.env.OUREON_API_KEY;
//     this.enabled = !!this.apiKey;
//     this.queue = [];
//     this.flushInterval = null;
//     this.batchSize = 50;
//     this.flushIntervalMs = 5000; // 5 seconds

//     if (!this.enabled) {
//       console.warn('⚠️ OureonClient: No API key found. Events will not be sent.');
//       return;
//     }

//     // Start batch processing
//     this.startBatchProcessor();
//     console.log('✅ OureonClient initialized');
//   }

//   /**
//    * Start the batch processor that flushes events periodically
//    */
//   startBatchProcessor() {
//     this.flushInterval = setInterval(() => {
//       this.flush();
//     }, this.flushIntervalMs);
//   }

//   /**
//    * Stop the batch processor
//    */
//   stop() {
//     if (this.flushInterval) {
//       clearInterval(this.flushInterval);
//       this.flush(); // Final flush
//     }
//   }

//   /**
//    * Queue an event for sending
//    */
//   queueEvent(type, guildId, userId, payload = {}) {
//     if (!this.enabled) return;

//     this.queue.push({
//       type,
//       guildId,
//       userId,
//       payload,
//       timestamp: new Date().toISOString()
//     });

//     // Flush if batch is full
//     if (this.queue.length >= this.batchSize) {
//       this.flush();
//     }
//   }

//   /**
//    * Flush queued events to the backend
//    */
//   async flush() {
//     if (this.queue.length === 0) return;

//     const events = this.queue.splice(0, this.batchSize);

//     try {
//       const response = await fetch(`${this.apiUrl}/events/batch`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-API-Key': this.apiKey
//         },
//         body: JSON.stringify({ events })
//       });

//       if (!response.ok) {
//         const error = await response.json().catch(() => ({}));
//         console.error('OureonClient flush error:', error);
//         // Re-queue failed events (but limit to prevent infinite growth)
//         if (this.queue.length < 500) {
//           this.queue.unshift(...events);
//         }
//       }
//     } catch (error) {
//       console.error('OureonClient flush error:', error.message);
//       // Re-queue on network error
//       if (this.queue.length < 500) {
//         this.queue.unshift(...events);
//       }
//     }
//   }

//   /**
//    * Send a single event immediately (for critical events)
//    */
//   async sendImmediate(type, guildId, userId, payload = {}) {
//     if (!this.enabled) return;

//     try {
//       const response = await fetch(`${this.apiUrl}/events`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-API-Key': this.apiKey
//         },
//         body: JSON.stringify({
//           type,
//           guildId,
//           userId,
//           payload
//         })
//       });

//       if (!response.ok) {
//         const error = await response.json().catch(() => ({}));
//         console.error('OureonClient send error:', error);
//       }
//     } catch (error) {
//       console.error('OureonClient send error:', error.message);
//     }
//   }

//   // ═══════════════════════════════════════════════════════════
//   // Event Helper Methods
//   // ═══════════════════════════════════════════════════════════

//   /**
//    * Track when a song is played
//    */
//   trackPlayed(guildId, userId, trackInfo) {
//     this.queueEvent('SONG_PLAYED', guildId, userId, {
//       trackId: trackInfo.identifier,
//       title: trackInfo.title,
//       author: trackInfo.author,
//       uri: trackInfo.uri,
//       source: trackInfo.sourceName,
//       duration: trackInfo.length
//     });
//   }

//   /**
//    * Track when a song is skipped
//    */
//   trackSkipped(guildId, userId, trackInfo, playedMs) {
//     this.queueEvent('SONG_SKIPPED', guildId, userId, {
//       trackId: trackInfo?.identifier,
//       title: trackInfo?.title,
//       playedMs
//     });
//   }

//   /**
//    * Track when a command is used
//    */
//   commandUsed(guildId, userId, commandName, isSlash = false) {
//     this.queueEvent(isSlash ? 'SLASH_COMMAND_USED' : 'COMMAND_USED', guildId, userId, {
//       command: commandName
//     });
//   }

//   /**
//    * Track when a queue is created
//    */
//   queueCreated(guildId, userId, trackCount) {
//     this.queueEvent('QUEUE_CREATED', guildId, userId, {
//       trackCount
//     });
//   }

//   /**
//    * Track when bot joins a server (send immediately)
//    */
//   async botJoinedServer(guildId, guildName, memberCount) {
//     await this.sendImmediate('BOT_JOINED_SERVER', guildId, null, {
//       guildName,
//       memberCount
//     });
//   }

//   /**
//    * Track when bot leaves a server (send immediately)
//    */
//   async botLeftServer(guildId, guildName) {
//     await this.sendImmediate('BOT_LEFT_SERVER', guildId, null, {
//       guildName
//     });
//   }

//   /**
//    * Track errors
//    */
//   errorOccurred(guildId, errorType, errorMessage) {
//     this.queueEvent('ERROR_OCCURRED', guildId, null, {
//       errorType,
//       errorMessage
//     });
//   }
// }

// module.exports = OureonClient;
