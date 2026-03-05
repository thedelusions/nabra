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
        this.wasDisconnected = true;
        this.reconnectAttempts = 0;
        this.initializeAudioEventHandlers();
        this.startConnectLoop();
        this.startHealthMonitoring();
    }

    initializeAudioEventHandlers() {
        this.clientRuntimeInstance.on('raw', (gatewayEventPayload) => {
            this.processGatewayVoiceStateEvent(gatewayEventPayload);
        });
        this.bindRiffyEventHandlers();
    }

    processGatewayVoiceStateEvent(eventPayload) {
        const validVoiceStateEvents = ['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'];
        if (!validVoiceStateEvents.includes(eventPayload.t)) return;
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

    hasConnectedNodes() {
        const riffy = this.clientRuntimeInstance.riffy;
        if (!riffy) return false;
        try {
            if (riffy.leastUsedNodes && riffy.leastUsedNodes.length > 0) return true;
        } catch (_) {}
        try {
            if (riffy.nodeMap && riffy.nodeMap instanceof Map) {
                for (const [, node] of riffy.nodeMap) {
                    if (node && node.connected) return true;
                }
            }
        } catch (_) {}
        return false;
    }

    checkNodeHealth() {
        return new Promise((resolve) => {
            const config = SystemConfigurationManager.lavalink;
            const url = `http${config.secure ? 's' : ''}://${config.host}:${config.port}/version`;
            const req = http.get(url, { headers: { Authorization: config.password }, timeout: 4000 }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => resolve(res.statusCode === 200));
            });
            req.on('timeout', () => { req.destroy(); resolve(false); });
            req.on('error', () => resolve(false));
        });
    }

    forceReconnect() {
        const riffy = this.clientRuntimeInstance.riffy;
        if (!riffy || !riffy.nodeMap) return;
        try {
            for (const [, node] of riffy.nodeMap) {
                if (node && !node.connected && typeof node.connect === 'function') {
                    node.connect();
                }
            }
        } catch (err) {
            logger.error('Force reconnect error', { error: err.message });
        }
    }

    startConnectLoop() {
        this.connectLoopInterval = setInterval(async () => {
            try {
                if (this.hasConnectedNodes()) {
                    if (this.wasDisconnected) {
                        this.wasDisconnected = false;
                        this.reconnectAttempts = 0;
                    }
                    return;
                }
                this.reconnectAttempts++;
                this.wasDisconnected = true;
                const healthy = await this.checkNodeHealth();
                if (healthy) {
                    if (this.reconnectAttempts <= 1 || this.reconnectAttempts % 3 === 0) {
                        logger.info(`🔄 Lavalink node healthy, reconnecting... (attempt ${this.reconnectAttempts})`);
                    }
                    this.forceReconnect();
                } else {
                    if (this.reconnectAttempts <= 1 || this.reconnectAttempts % 6 === 0) {
                        logger.warn(`⚠️ Lavalink node unreachable (attempt ${this.reconnectAttempts})`);
                    }
                }
            } catch (_) {}
        }, 10000);
    }

    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            if (!this.hasConnectedNodes()) {
                logger.warn('🟡 No Lavalink nodes connected, reconnecting...');
                const healthy = await this.checkNodeHealth();
                if (healthy) this.forceReconnect();
            }
        }, 60000);
    }

    bindRiffyEventHandlers() {
        this.clientRuntimeInstance.riffy.on('nodeConnect', (audioNodeInstance) => {
            logger.info(`🎵 Lavalink node "${audioNodeInstance.name}" connected`);
        });

        this.clientRuntimeInstance.riffy.on('nodeError', (audioNodeInstance, nodeErrorException) => {
            const msg = nodeErrorException?.message || '';
            if (msg.includes('player.restart is not a function') || msg.includes('restart is not a function')) return;
            logger.error(`🔴 Lavalink node "${audioNodeInstance.name}" error`, { error: msg });
        });

        this.clientRuntimeInstance.riffy.on('nodeDisconnect', (audioNodeInstance) => {
            logger.warn(`🟡 Lavalink node "${audioNodeInstance.name}" disconnected`);
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