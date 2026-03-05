/**
 * Ultimate Music Bot 
 * Comprehensive Discord Bot
 * 
 * @fileoverview Core application
 * @version 1.1.0
 * @author thedelusions
 */

const DiscordClientFramework = require('discord.js').Client;
const DiscordGatewayIntentBitsRegistry = require('discord.js').GatewayIntentBits;
const DiscordCollectionFramework = require('discord.js').Collection;
const RiffyAudioProcessingFramework = require('riffy').Riffy;
const FileSystemOperationalInterface = require('fs');
const SystemPathResolutionUtility = require('path');
const SystemConfigurationManager = require('./config');
const DatabaseConnectionEstablishmentService = require('./database/connection');
const AudioPlayerManagementHandler = require('./utils/player');
const ApplicationStatusManagementService = require('./utils/statusManager');
const StatsService = require('./utils/statsService');
const MemoryGarbageCollectionOptimizer = require('./utils/garbageCollector');
const EnvironmentVariableConfigurationLoader = require('dotenv');
const OureonClient = require('./utils/oureonClient');
const shiva = require('./shiva');
const logger = require('./utils/logger');
const http = require('http');

// Initialize environment variable configuration subsystem
EnvironmentVariableConfigurationLoader.config();

/**
 * Discord Client Runtime Management System
 * Implements comprehensive client lifecycle management with advanced intent configuration
 */
class DiscordClientRuntimeManager {
    constructor() {
        this.initializeClientConfiguration();
        this.initializeRuntimeSubsystems();
        this.initializeAudioProcessingInfrastructure();
        this.initializeApplicationBootstrapProcedures();
    }
    
    /**
     * Initialize primary Discord client
     * Implements comprehensive gateway intent management for optimal resource utilization
     */
    initializeClientConfiguration() {
        this.clientRuntimeInstance = new DiscordClientFramework({
            intents: [
                DiscordGatewayIntentBitsRegistry.Guilds,
                DiscordGatewayIntentBitsRegistry.GuildMessages,
                DiscordGatewayIntentBitsRegistry.GuildVoiceStates,
                DiscordGatewayIntentBitsRegistry.GuildMessageReactions,
                DiscordGatewayIntentBitsRegistry.MessageContent,
                DiscordGatewayIntentBitsRegistry.DirectMessages,
                DiscordGatewayIntentBitsRegistry.GuildPresences
            ]
        });
        
        // Initialize command collection management subsystems
        this.clientRuntimeInstance.commands = new DiscordCollectionFramework();
        this.clientRuntimeInstance.slashCommands = new DiscordCollectionFramework();
        this.clientRuntimeInstance.mentionCommands = new DiscordCollectionFramework();
    }
    
    /**
     * Initialize core runtime subsystem managers with dependency injection pattern
     * Ensures proper initialization order for optimal system performance
     */
    initializeRuntimeSubsystems() {
        // Dependency injection pattern for status management subsystem
        this.statusManagementSubsystem = new ApplicationStatusManagementService(this.clientRuntimeInstance);
        this.clientRuntimeInstance.statusManager = this.statusManagementSubsystem;

        // Analytics and statistics subsystem
        this.statsSubsystem = new StatsService();
        this.clientRuntimeInstance.statsService = this.statsSubsystem;

        // Oureon analytics integration with defensive initialization
        try {
            if (typeof OureonClient === 'function') {
                this.clientRuntimeInstance.oureon = new OureonClient();
            } else {
                logger.warn('OureonClient is not a constructor, using stub');
                this.clientRuntimeInstance.oureon = { trackPlayed: () => {}, trackSkipped: () => {}, trackSearched: () => {}, commandUsed: () => {}, botJoinedServer: () => {}, botLeftServer: () => {}, errorOccurred: () => {}, queueEvent: () => {}, flush: () => {}, shutdown: () => {} };
            }
        } catch (error) {
            logger.error('Failed to initialize OureonClient', { error: error.message });
            this.clientRuntimeInstance.oureon = { trackPlayed: () => {}, trackSkipped: () => {}, trackSearched: () => {}, commandUsed: () => {}, botJoinedServer: () => {}, botLeftServer: () => {}, errorOccurred: () => {}, queueEvent: () => {}, flush: () => {}, shutdown: () => {} };
        }
        
        // Dependency injection pattern for audio player management subsystem  
        this.audioPlayerManagementSubsystem = new AudioPlayerManagementHandler(this.clientRuntimeInstance);
        this.clientRuntimeInstance.playerHandler = this.audioPlayerManagementSubsystem;
    }
    
    /**
     * Initialize advanced audio processing infrastructure with Riffy framework integration
     * Implements Lavalink node configuration and management
     */
    initializeAudioProcessingInfrastructure() {
        const audioNodeConfigurationRegistry = this.constructAudioNodeConfiguration();
        
        this.audioProcessingRuntimeInstance = new RiffyAudioProcessingFramework(
            this.clientRuntimeInstance, 
            audioNodeConfigurationRegistry, 
            {
                send: (audioPayloadTransmissionData) => {
                    const guildContextResolution = this.clientRuntimeInstance.guilds.cache
                        .get(audioPayloadTransmissionData.d.guild_id);
                    if (guildContextResolution) {
                        guildContextResolution.shard.send(audioPayloadTransmissionData);
                    }
                },
                defaultSearchPlatform: "ytmsearch",
                restVersion: "v4",
                autoResume: true,
                resumeKey: "NabraMusic",
                resumeTimeout: 30000
            }
        );
        
        this.clientRuntimeInstance.riffy = this.audioProcessingRuntimeInstance;
    }
    
    /**
     * Construct audio node configuration from system configuration
     * Implements secure credential management and connection parameter optimization
     */
    constructAudioNodeConfiguration() {
        const systemConfiguration = SystemConfigurationManager;
        
        return [
            {
                host: systemConfiguration.lavalink.host,
                password: systemConfiguration.lavalink.password,
                port: systemConfiguration.lavalink.port,
                secure: systemConfiguration.lavalink.secure,
                // Reconnect options - never give up reconnecting
                reconnectTimeout: 10000,
                reconnectTries: Infinity,
                resumeTimeout: 120
            }
        ];
    }
    
    /**
     * Initialize comprehensive application bootstrap procedures
     * Orchestrates system initialization sequence with error handling and logging
     */
    initializeApplicationBootstrapProcedures() {
        this.applicationBootstrapOrchestrator = new ApplicationBootstrapOrchestrator(
            this.clientRuntimeInstance
        );
    }
    
    /**
     * Execute complete application runtime initialization sequence
     * Implements error handling and graceful degradation patterns
     */
    async executeApplicationBootstrap() {
        try {
            await this.applicationBootstrapOrchestrator.executeDatabaseConnectionEstablishment();
            await this.applicationBootstrapOrchestrator.executeCommandDiscoveryAndRegistration();
            await this.applicationBootstrapOrchestrator.executeEventHandlerRegistration();
            await this.applicationBootstrapOrchestrator.executeMemoryOptimizationInitialization();
            await this.applicationBootstrapOrchestrator.executeAudioSubsystemInitialization();
            await this.applicationBootstrapOrchestrator.executeClientAuthenticationProcedure();
            
        } catch (applicationBootstrapException) {
            this.handleApplicationBootstrapFailure(applicationBootstrapException);
        }
    }
    
    /**
     * Handle application bootstrap failure with comprehensive error reporting
     */
    handleApplicationBootstrapFailure(exceptionInstance) {
        logger.error('❌ Failed to initialize bot', { error: exceptionInstance.message, stack: exceptionInstance.stack });
        process.exit(1);
    }
}

/**
 * Application Bootstrap Orchestration Service
 * Manages complex initialization sequences with advanced error handling
 */
class ApplicationBootstrapOrchestrator {
    constructor(clientRuntimeInstance) {
        this.clientRuntimeInstance = clientRuntimeInstance;
        this.commandDiscoveryEngine = new CommandDiscoveryEngine();
        this.eventHandlerRegistrationService = new EventHandlerRegistrationService();
        this.audioSubsystemIntegrationManager = new AudioSubsystemIntegrationManager(clientRuntimeInstance);
    }
    
    /**
     * Execute database connection establishment with connection pooling
     */
    async executeDatabaseConnectionEstablishment() {
        await DatabaseConnectionEstablishmentService();
        logger.info('✅ MongoDB connected successfully');
    }
    
    /**
     * Execute comprehensive command discovery and registration procedures
     */
    async executeCommandDiscoveryAndRegistration() {
        const commandRegistrationResults = await this.commandDiscoveryEngine
            .executeMessageCommandDiscovery(this.clientRuntimeInstance)
            .executeSlashCommandDiscovery(this.clientRuntimeInstance);
        
        logger.info(`✅ Loaded ${commandRegistrationResults.totalCommands} commands`);
    }
    
    /**
     * Execute event handler registration with advanced event binding
     */
    async executeEventHandlerRegistration() {
        const eventRegistrationResults = await this.eventHandlerRegistrationService
            .executeEventDiscovery()
            .bindEventHandlers(this.clientRuntimeInstance);
        
        logger.info(`✅ Loaded ${eventRegistrationResults.totalEvents} events`);
    }
    
    /**
     * Execute memory optimization subsystem initialization
     */
    async executeMemoryOptimizationInitialization() {
        MemoryGarbageCollectionOptimizer.init();
    }
    
    /**
     * Execute audio processing subsystem initialization with event binding
     */
    async executeAudioSubsystemInitialization() {
        this.clientRuntimeInstance.playerHandler.initializeEvents();
        //console.log('🎵 Player events initialized');
    }
    
    /**
     * Execute Discord client authentication and connectivity establishment
     */
    async executeClientAuthenticationProcedure() {
        const authenticationCredential = SystemConfigurationManager.discord.token || 
                                       process.env.TOKEN;
        
        await this.clientRuntimeInstance.login(authenticationCredential);
    }
}

/**
 * Command Discovery and Registration Engine
 * Implements advanced filesystem scanning and lazy module resolution
 */
class CommandDiscoveryEngine {
    constructor() {
        this.discoveredMessageCommands = 0;
        this.discoveredSlashCommands = 0;
        this.lazyLoadEnabled = process.env.LAZY_LOAD_COMMANDS === 'true';
    }
    
    /**
     * Execute message command discovery with filesystem traversal
     * Supports lazy loading for improved startup performance
     */
    executeMessageCommandDiscovery(clientInstance) {
        const messageCommandDirectoryPath = SystemPathResolutionUtility.join(__dirname, 'commands', 'message');
        
        if (FileSystemOperationalInterface.existsSync(messageCommandDirectoryPath)) {
            const discoveredCommandFiles = FileSystemOperationalInterface
                .readdirSync(messageCommandDirectoryPath)
                .filter(fileEntity => fileEntity.endsWith('.js'));
            
            for (const commandFile of discoveredCommandFiles) {
                const commandPath = SystemPathResolutionUtility.join(messageCommandDirectoryPath, commandFile);
                
                if (this.lazyLoadEnabled) {
                    // Lazy load: Store path and load on first use
                    const commandName = commandFile.replace('.js', '');
                    clientInstance.commands.set(commandName, {
                        _lazy: true,
                        _path: commandPath,
                        name: commandName
                    });
                } else {
                    // Eager load: Load immediately
                    const commandModuleInstance = require(commandPath);
                    clientInstance.commands.set(commandModuleInstance.name, commandModuleInstance);
                }
                this.discoveredMessageCommands++;
            }
        }
        
        return this;
    }
    
    /**
     * Execute slash command discovery with lazy module resolution
     */
    executeSlashCommandDiscovery(clientInstance) {
        const slashCommandDirectoryPath = SystemPathResolutionUtility.join(__dirname, 'commands', 'slash');
        
        if (FileSystemOperationalInterface.existsSync(slashCommandDirectoryPath)) {
            const discoveredCommandFiles = FileSystemOperationalInterface
                .readdirSync(slashCommandDirectoryPath)
                .filter(fileEntity => fileEntity.endsWith('.js'));
            
            for (const commandFile of discoveredCommandFiles) {
                const commandPath = SystemPathResolutionUtility.join(slashCommandDirectoryPath, commandFile);
                
                // Slash commands are always eager loaded (needed for registration)
                const commandModuleInstance = require(commandPath);
                clientInstance.slashCommands.set(commandModuleInstance.data.name, commandModuleInstance);
                this.discoveredSlashCommands++;
            }
        }
        
        return {
            totalCommands: this.discoveredMessageCommands + this.discoveredSlashCommands
        };
    }
    
    /**
     * Get command with lazy loading support
     * @param {Collection} collection - Command collection
     * @param {string} name - Command name
     * @returns {Object} Command module
     */
    static getCommand(collection, name) {
        const command = collection.get(name);
        
        if (command && command._lazy) {
            // Lazy load the command now
            const loadedCommand = require(command._path);
            collection.set(name, loadedCommand);
            logger.debug(`Lazy loaded command: ${name}`);
            return loadedCommand;
        }
        
        return command;
    }
}

/**
 * Event Handler Registration Service
 * Manages advanced event binding with lifecycle management
 */
class EventHandlerRegistrationService {
    constructor() {
        this.discoveredEventHandlers = [];
        this.boundEventHandlers = 0;
    }
    
    /**
     * Execute event handler discovery with filesystem traversal
     */
    executeEventDiscovery() {
        const eventHandlerDirectoryPath = SystemPathResolutionUtility.join(__dirname, 'events');
        const discoveredEventFiles = FileSystemOperationalInterface
            .readdirSync(eventHandlerDirectoryPath)
            .filter(fileEntity => fileEntity.endsWith('.js'));
        
        this.discoveredEventHandlers = discoveredEventFiles.map(eventFile => {
            return require(SystemPathResolutionUtility.join(eventHandlerDirectoryPath, eventFile));
        });
        
        return this;
    }
    
    /**
     * Bind discovered event handlers with advanced lifecycle management
     */
    bindEventHandlers(clientInstance) {
        for (const eventHandlerInstance of this.discoveredEventHandlers) {
            if (eventHandlerInstance.once) {
                clientInstance.once(eventHandlerInstance.name, (...eventArguments) => 
                    eventHandlerInstance.execute(...eventArguments, clientInstance));
            } else {
                clientInstance.on(eventHandlerInstance.name, (...eventArguments) => 
                    eventHandlerInstance.execute(...eventArguments, clientInstance));
            }
            this.boundEventHandlers++;
        }
        
        return {
            totalEvents: this.boundEventHandlers
        };
    }
}

/**
 * Audio Subsystem Integration Manager
 * Manages Riffy framework integration with advanced event handling
 */
class AudioSubsystemIntegrationManager {
    constructor(clientInstance) {
        this.clientRuntimeInstance = clientInstance;
        this.connectLoopInterval = null;
        this.healthCheckInterval = null;
        this.initializeAudioEventHandlers();
        this.startConnectLoop();
        this.startHealthMonitoring();
    }
    
    /**
     * Initialize comprehensive audio event handling subsystem
     */
    initializeAudioEventHandlers() {
        this.clientRuntimeInstance.on('raw', (gatewayEventPayload) => {
            this.processGatewayVoiceStateEvent(gatewayEventPayload);
        });
        
        this.bindRiffyEventHandlers();
    }
    
    /**
     * Process Discord gateway voice state events with validation
     */
    processGatewayVoiceStateEvent(eventPayload) {
        const validVoiceStateEvents = ['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'];
        
        if (!validVoiceStateEvents.includes(eventPayload.t)) return;
        
        // Validate VOICE_SERVER_UPDATE has required endpoint property
        if (eventPayload.t === 'VOICE_SERVER_UPDATE') {
            if (!eventPayload.d?.endpoint) {
                logger.warn('Received VOICE_SERVER_UPDATE without endpoint, ignoring', { 
                    guildId: eventPayload.d?.guild_id 
                });
                return;
            }
        }
        
        this.clientRuntimeInstance.riffy.updateVoiceState(eventPayload);
    }

    /**
     * Check if any Riffy nodes are currently connected
     */
    hasConnectedNodes() {
        const riffy = this.clientRuntimeInstance.riffy;
        if (!riffy || !riffy.nodes) return false;
        try {
            if (riffy.nodes instanceof Map) {
                for (const [, node] of riffy.nodes) {
                    if (node && (node.connected || node.state === 'CONNECTED')) return true;
                }
            } else if (Array.isArray(riffy.nodes)) {
                for (const node of riffy.nodes) {
                    if (node && (node.connected || node.state === 'CONNECTED')) return true;
                }
            }
        } catch (_) {}
        return false;
    }

    /**
     * Ping lavalink /version endpoint to verify the node is actually reachable
     */
    checkNodeHealth() {
        return new Promise((resolve) => {
            const config = SystemConfigurationManager.lavalink;
            const protocol = config.secure ? 'https' : 'http';
            const url = `${protocol}://${config.host}:${config.port}/version`;
            const req = http.get(url, { headers: { Authorization: config.password }, timeout: 4000 }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => resolve(res.statusCode === 200));
            });
            req.on('timeout', () => { req.destroy(); resolve(false); });
            req.on('error', () => resolve(false));
        });
    }

    /**
     * Force reconnect all riffy nodes
     */
    forceReconnect() {
        const riffy = this.clientRuntimeInstance.riffy;
        if (!riffy || !riffy.nodes) return;
        try {
            if (riffy.nodes instanceof Map) {
                for (const [, node] of riffy.nodes) {
                    if (node && !node.connected && typeof node.connect === 'function') {
                        node.connect();
                    }
                }
            } else if (Array.isArray(riffy.nodes)) {
                for (const node of riffy.nodes) {
                    if (node && !node.connected && typeof node.connect === 'function') {
                        node.connect();
                    }
                }
            }
        } catch (err) {
            logger.error('Force reconnect error', { error: err.message });
        }
    }

    /**
     * Connect loop — every 10s, if no nodes are connected, try to reconnect
     * Inspired by PrimeMusic's robust node management
     */
    startConnectLoop() {
        this.connectLoopInterval = setInterval(async () => {
            try {
                if (this.hasConnectedNodes()) return;
                const healthy = await this.checkNodeHealth();
                if (healthy) {
                    logger.info('🔄 Lavalink node is healthy, forcing reconnect...');
                    this.forceReconnect();
                } else {
                    logger.warn('⚠️ Lavalink node health check failed, will retry...');
                }
            } catch (_) {}
        }, 10000);
    }

    /**
     * Health monitoring — every 60s, log node status and reconnect if needed
     */
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            const connected = this.hasConnectedNodes();
            if (!connected) {
                logger.warn('🟡 No Lavalink nodes connected, attempting reconnect...');
                const healthy = await this.checkNodeHealth();
                if (healthy) {
                    this.forceReconnect();
                }
            }
        }, 60000);
    }
    
    /**
     * Bind Riffy framework event handlers with comprehensive logging
     */
    bindRiffyEventHandlers() {
        this.clientRuntimeInstance.riffy.on('nodeConnect', (audioNodeInstance) => {
            logger.info(`🎵 Lavalink node "${audioNodeInstance.name}" connected`);
        });
        
        this.clientRuntimeInstance.riffy.on('nodeError', (audioNodeInstance, nodeErrorException) => {
            const msg = nodeErrorException?.message || '';
            // Ignore known Riffy bug
            if (msg.includes('player.restart is not a function') || msg.includes('restart is not a function')) {
                logger.warn(`Ignoring Riffy reconnect bug for "${audioNodeInstance.name}" - will reconnect automatically`);
                return;
            }
            logger.error(`🔴 Lavalink node "${audioNodeInstance.name}" error`, { error: msg });
            // If Riffy gave up after its retry limit, force reconnect via the connect loop
            if (msg.includes('after 3 attempts') || msg.includes('Unable to connect')) {
                logger.info('🔄 Riffy gave up retrying, connect loop will handle reconnection...');
            }
        });

        this.clientRuntimeInstance.riffy.on('nodeDisconnect', (audioNodeInstance) => {
            logger.warn(`🟡 Lavalink node "${audioNodeInstance.name}" disconnected — connect loop will handle reconnection`);
        });
    }
}


const enterpriseApplicationManager = new DiscordClientRuntimeManager();
enterpriseApplicationManager.executeApplicationBootstrap();


module.exports = {
    client: enterpriseApplicationManager.clientRuntimeInstance,
    getCommand: CommandDiscoveryEngine.getCommand
};
shiva.initialize(enterpriseApplicationManager.clientRuntimeInstance);