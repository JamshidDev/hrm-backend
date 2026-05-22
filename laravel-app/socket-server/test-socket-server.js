// server.js - to'liq to'g'rilangan versiya
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const axios = require('axios');

// Config
const PORT = process.env.SOCKET_PORT || 3001;
const LARAVEL_API_URL = process.env.APP_URL || 'https://hrm-api.railway.uz';
const HOST = process.env.SOCKET_HOST || '0.0.0.0';

// Redis configuration with better resilience
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    db: parseInt(process.env.SOCKET_REDIS_DB) || 1,
    retryDelayOnFailure: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: true,
    keepAlive: 30000,
    keyPrefix: process.env.REDIS_PREFIX || 'laravel_database_'
};

console.log('🔧 Redis Config:', redisConfig);

// 🔴 MUHIM: Redis clientlari
const redis = new Redis(redisConfig);
const subClient = redis.duplicate(); // 🔴 QO'SHILDI
const pubClient = redis.duplicate(); // 🔴 QO'SHILDI

// Redis error handling
redis.on('error', (err) => {
    console.error('❌ Redis main error:', err);
});

subClient.on('error', (err) => {
    console.error('❌ Redis subClient error:', err);
});

pubClient.on('error', (err) => {
    console.error('❌ Redis pubClient error:', err);
});

redis.on('connect', () => {
    console.log('✅ Connected to Redis successfully');
});

const { createAdapter } = require('@socket.io/redis-adapter'); // 🔴 MUHIM: import

// HTTP Server
const httpServer = createServer();

// Socket.IO Server with improved configuration
const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    // Muhim: Connection sozlamalari
    connectTimeout: 60000,
    pingTimeout: 30000,
    pingInterval: 15000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e8,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
    }
});

// 🔴 MUHIM: Redis adapterini o'rnatish
io.adapter(createAdapter(pubClient, subClient, {
    key: "hrm_socket_cluster",
    requestsTimeout: 5000
}));

console.log('✅ Redis adapter initialized for Socket.IO clustering');

// Authentication middleware
io.use(async (socket, next) => {
    try {
        const { token, userId } = socket.handshake.auth;

        console.log('🔐 Auth attempt from:', socket.id);

        if (!token) {
            return next(new Error('Authentication error: Token required'));
        }

        // Token tekshirish
        const response = await axios.get(`${LARAVEL_API_URL}/api/v1/user/socket/verify-token`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        if (response.status === 200 && response.data?.valid) {
            socket.user = {
                id: response.data.user?.id || userId,
                short_name: response.data.user?.short_name,
                photo: response.data.user?.photo,
                role: response.data.user?.role,
            };
            console.log('✅ User authenticated:', socket.user.id);
            next();
        } else {
            console.log('❌ Invalid token response');
            next(new Error('Invalid token'));
        }
    } catch (error) {
        console.error('🔥 Auth error:', error.message);

        if (error.code === 'ECONNREFUSED') {
            next(new Error('Authentication service unavailable'));
        } else if (error.response) {
            next(new Error(`Auth service error: ${error.response.status}`));
        } else {
            next(new Error('Authentication failed'));
        }
    }
});

// Connection handler with better error handling
io.on('connection', async (socket) => {
    console.log('✅ New connection:', socket.id, 'User:', socket.user?.id);

    if (!socket.user?.id) {
        console.error('❌ No user ID, disconnecting:', socket.id);
        socket.disconnect();
        return;
    }

    try {
        // User room ga qo'shish
        socket.join(`user_${socket.user.id}`);
        socket.join('online_users');

        // Redis da online qilish
        await redis.hset('online_users', socket.user.id.toString(), JSON.stringify({
            socketId: socket.id,
            id: socket.user.id,
            short_name: socket.user.short_name,
            photo: socket.user.photo,
            role: socket.user.role,
            connectedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        }));

        // Expiration - 1 soat
        await redis.expire('online_users', 3600);

        // Boshqa userlarga online ekanini bildirish
        socket.broadcast.emit('user:online', {
            user: socket.user,
            socketId: socket.id
        });

        console.log(`👤 User ${socket.user.id} marked as online. Socket: ${socket.id}`);

    } catch (error) {
        console.error('❌ Connection setup error:', error);
        socket.emit('error', { message: 'Connection setup failed' });
        socket.disconnect();
        return;
    }

    // ==================== EVENT HANDLERLAR ====================

    // Online userlarni olish
    socket.on('get_online_users', async () => {
        try {
            console.log('📋 get_online_users requested by:', socket.user.id);

            const onlineUsers = await redis.hgetall('online_users');
            const list = Object.values(onlineUsers)
                .map(item => {
                    try {
                        const userData = JSON.parse(item);
                        if (userData.lastSeen) {
                            const lastSeen = new Date(userData.lastSeen);
                            const now = new Date();
                            const diffMinutes = (now - lastSeen) / (1000 * 60);
                            if (diffMinutes > 2) {
                                return null;
                            }
                        }
                        return userData;
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                        return null;
                    }
                })
                .filter(Boolean);

            console.log(`📊 Sending ${list.length} online users to user ${socket.user.id}`);
            socket.emit('online_users', list);

        } catch (err) {
            console.error('❌ Error getting online users:', err);
            socket.emit('online_users', []);
        }
    });

    // Heartbeat - connection faolligini yangilash
    socket.on('heartbeat', async () => {
        try {
            await redis.hset('online_users', socket.user.id.toString(), JSON.stringify({
                socketId: socket.id,
                id: socket.user.id,
                short_name: socket.user.short_name,
                photo: socket.user.photo,
                role: socket.user.role,
                connectedAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Heartbeat error:', error);
        }
    });

    // Ping handler
    socket.on('ping', (cb) => {
        if (typeof cb === 'function') {
            cb({
                pong: 'pong',
                timestamp: new Date().toISOString(),
                server: 'hrm-socket-server'
            });
        }
    });

    // Disconnect handler
    socket.on('disconnect', async (reason) => {
        console.log('❌ Disconnected:', socket.id, 'User:', socket.user?.id, 'Reason:', reason);

        try {
            const currentData = await redis.hget('online_users', socket.user.id.toString());
            if (currentData) {
                const userData = JSON.parse(currentData);
                if (userData.socketId === socket.id) {
                    await redis.hdel('online_users', socket.user.id.toString());
                    socket.broadcast.emit('user:offline', {
                        user: socket.user,
                        socketId: socket.id,
                        reason: reason
                    });
                    console.log(`👋 User ${socket.user.id} removed from online list`);
                } else {
                    console.log(`ℹ️ User ${socket.user.id} has new connection, keeping online status`);
                }
            }
        } catch (error) {
            console.error('❌ Disconnect handler error:', error);
        }
    });

    // Error handler
    socket.on('error', (error) => {
        console.error('💥 Socket error for user', socket.user.id, ':', error);
    });

    // Har 10 soniyada heartbeat yuborish
    const heartbeatInterval = setInterval(async () => {
        if (socket.connected) {
            try {
                socket.emit('heartbeat_request');
            } catch (error) {
                console.error('Heartbeat interval error:', error);
            }
        }
    }, 10000);

    // Intervalni tozalash disconnect da
    socket.on('disconnect', () => {
        clearInterval(heartbeatInterval);
    });
});

// Health check endpoint
httpServer.on('request', async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
        try {
            const onlineCount = await redis.hlen('online_users');
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                status: 'ok',
                activeUsers: onlineCount,
                timestamp: new Date().toISOString(),
                server: 'hrm-socket-server'
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                message: error.message
            }));
        }
        return;
    }
});

// Server error handling
httpServer.on('error', (error) => {
    console.error('🚨 HTTP Server error:', error);
});

// Start server
httpServer.listen(PORT, HOST, () => {
    console.log('='.repeat(50));
    console.log('🚀 Socket Server Started (Redis Adapter Fixed)');
    console.log(`📍 URL: http://${HOST}:${PORT}`);
    console.log(`📡 Path: /socket.io/`);
    console.log(`🔴 Redis: ${redisConfig.host}:${redisConfig.port}`);
    console.log(`🔄 Adapter: Redis pub/sub enabled`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');

    io.emit('server_shutdown', {
        message: 'Server maintenance',
        timestamp: new Date().toISOString()
    });

    setTimeout(async () => {
        await redis.quit();
        await subClient.quit();
        await pubClient.quit();
        httpServer.close(() => {
            console.log('✅ Server shut down gracefully');
            process.exit(0);
        });
    }, 5000);
});
