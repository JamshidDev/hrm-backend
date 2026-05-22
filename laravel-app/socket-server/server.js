require('dotenv').config({path: require('path').resolve(__dirname, '../.env')});
const {createServer} = require('http');
const {Server} = require('socket.io');
const Redis = require('ioredis');
const axios = require('axios');
const WebSocket = require('ws');
const activeLiveness = new Map();

// Config
const PORT = process.env.SOCKET_PORT || 3001;
const FACE_API_KEY = process.env.FACE_API_KEY;
const LARAVEL_API_URL = process.env.APP_URL || 'http://127.0.0.1';
const SOCKET_SECRET = process.env.SOCKET_SECRET || '';
const HOST = process.env.SOCKET_HOST || '0.0.0.0';

// Redis setup–Backend bilan bir xil sozlamalar
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    db: parseInt(process.env.SOCKET_REDIS_DB) || 2,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
    lazyConnect: false,
    keepAlive: 30000,
    showFriendlyErrorStack: true,
    keyPrefix: process.env.REDIS_PREFIX || '' // Laravel bilan bir xil
};

// Redis setup (for online users & multi-server scaling)
const redis = new Redis(redisConfig); // default localhost:6379
const subClient = redis.duplicate();
const pubClient = redis.duplicate();

const {createAdapter} = require('@socket.io/redis-adapter');
// HTTP & Socket.IO server
const httpServer = createServer();
const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
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

// Redis adapter for multi-server
io.adapter(createAdapter(pubClient, subClient));

// Emoji buffer
const MAX_BATCH = 30;
let emojiBuffer = [];

const livenessNamespace = io.of('/liveness');

//Function for flushing emoji buffer to API
const flushEmojiBatch = async () => {
    try {
        if (emojiBuffer.length === 0) return;
        const batch = [...emojiBuffer];
        emojiBuffer = [];
        axios.post(`${LARAVEL_API_URL}/api/v1/chat/emoji`, {items: batch}, {
                headers: {
                    'X-SOCKET-SECRET': String(SOCKET_SECRET),
                    'X-AUTH-TYPE': 'sanctum'
                }
            }
        ).catch(err => console.error("Batch log failed:", err.message));
    } catch (e) {
    }
};

// Middleware: authentication
io.use(async (socket, next) => {
    try {
        //MUHIM: Liveness namespace bo‘lsa skip qilamiz
        if (socket.nsp.name === '/liveness') {
            return next();
        }

        const {token, userId, secret, type = 'sanctum'} = socket.handshake.auth;
        if (!token) {
            return next(new Error('Authentication error: Token required'));
        }

        //1. Socket Secret ni tekshirish
        if (secret !== SOCKET_SECRET) {
            return next(new Error('Invalid socket secret'));
        }
        const response = await axios.get(`${LARAVEL_API_URL}/api/v1/user/socket/verify-token`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'X-AUTH-TYPE': type
            },
            timeout: 10000
        });

        if (response.data && response.data.valid) {
            //User ID ni response dan olish
            socket.user = {
                id: response.data.user?.id || null,
                short_name: response.data.user?.short_name || null,
                photo: response.data.user?.photo || null,
                organization: response.data.user?.organization || null,
                roles: response.data.user?.roles || null,
                canReceiveOnlineEvents: response.data.user.can_receive_online_events,
                type: type
            }

            if (!socket.user.id) {
                return next(new Error('User ID not found in response'));
            }
            next();
        } else {
            next(new Error('Invalid token'));
        }
    } catch (error) {
        next(new Error('Authentication failed: ' + error.message));
    }
});

livenessNamespace.use(async (socket, next) => {
    try {
        const {sessionId} = socket.handshake.auth;
        if (!sessionId) {
            return next(new Error('Session required'));
        }

        const response = await axios.post(
            `${LARAVEL_API_URL}/api/auth/v1/liveness/validate`,
            {session_id: sessionId},
            {
                headers: {
                    'X-SOCKET-SECRET': String(SOCKET_SECRET),
                    'X-AUTH-TYPE': 'sanctum'
                }
            }
        );

        if (!response.data.valid) {
            return next(new Error('Invalid session'));
        }

        socket.sessionId = sessionId;
        socket.sessionFace = response.data.sessionFace;
        socket.refImage = response.data.refImage;
        socket.userId = response.data.user_id;
        next();

    } catch (err) {
        next(new Error('Validation failed'));
    }
});

livenessNamespace.on('connection', (socket) => {

    const sessionId = socket.sessionId;

    // Agar oldin mavjud bo‘lsa yopamiz
    if (activeLiveness.has(sessionId)) {
        const old = activeLiveness.get(sessionId);
        old.faceWs?.close();
        clearTimeout(old.timeout);
        activeLiveness.delete(sessionId);
    }

    const sessionFace = socket.sessionFace;

    // Face serverga ulanamiz
    const faceWs = new WebSocket(
        `wss://face2.das-uty.uz/api/liveness/ws?api_key=${FACE_API_KEY}&person_id=${socket.userId}`
    );

    faceWs.on('open', () => {
        socket.emit('liveness:connected');
    });

    // Frontenddan frame keladi
    socket.on('liveness:frame', (payload) => {

        if (!payload?.frame) return;

        if (payload.frame.length > 1024 * 1024) {
            return socket.emit('liveness:error', {message: 'Frame too large'});
        }

        const sessionData = activeLiveness.get(sessionId);
        if (!sessionData) return;

        // HAR DOIM buffer qilamiz
        sessionData.framesBuffer.push(payload.frame);

        if (sessionData.framesBuffer.length > 5) {
            sessionData.framesBuffer.shift();
        }

        // keyin face serverga yuboramiz
        if (faceWs.readyState === WebSocket.OPEN) {
            faceWs.send(payload.frame);
        }
    });

    // Face javobi → frontend
    faceWs.on('message', async (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            const status = data.status;

            // Frontendga yuboramiz (har doim)
            socket.emit('liveness:event', data);

            const sessionData = activeLiveness.get(sessionId);
            const liveImage = sessionData.framesBuffer.at(-1);
            // SPOOF (fake yuz)
            if (status === 'spoof') {
                await axios.post(
                    `${LARAVEL_API_URL}/api/auth/v1/liveness/complete`,
                    {
                        session_id: sessionId,
                        success: false,
                        refImage: socket.refImage ?? null,
                        liveImage: liveImage,
                        faceStatus: 'spoof'
                    },
                    {
                        headers: {
                            'X-SOCKET-SECRET': SOCKET_SECRET
                        }
                    }
                );

                cleanup(sessionId);
                return;
            }

            // LIVE (haqiqiy yuz)
            if (status === 'live') {
                const sessionData = activeLiveness.get(sessionId);
                if (!sessionData) return;

                await new Promise(r => setTimeout(r, 300));

                const frames = sessionData.framesBuffer || [];

                if (!frames.length) {
                    socket.emit('liveness:error', {message: 'No frame captured'});
                    return;
                }

                const liveImage = frames.reverse().find(f => f && f.length > 10000);

                if (!liveImage) {
                    socket.emit('liveness:error', {message: 'Invalid frame'});
                    return;
                }

                const refImage = socket.refImage;

                try {
                    const cmp = await axios.post(
                        'https://face2.das-uty.uz/api/compare',
                        {
                            image1: refImage,
                            image2: liveImage,
                            person_id: socket.userId
                        },
                        {
                            headers: {
                                'x-api-key': FACE_API_KEY
                            }
                        }
                    );

                    const same = cmp.data.same_person;

                    await axios.post(
                        `${LARAVEL_API_URL}/api/auth/v1/liveness/complete`,
                        {
                            session_id: sessionId,
                            success: same,
                            refImage: refImage,
                            liveImage: liveImage,
                            faceStatus: 'live'
                        },
                        {
                            headers: {
                                'X-SOCKET-SECRET': SOCKET_SECRET
                            }
                        }
                    );

                    socket.emit('liveness:result', {
                        match: same,
                        similarity: cmp.data.similarity
                    });

                } catch (e) {
                    socket.emit('liveness:error', {message: 'Compare failed'});
                }

                cleanup(sessionId);
                return;
            }

            //  Qolgan statuslar faqat UI uchun
            if (status === 'no_face') {
                // hech narsa qilmaymiz, frontend ko‘rsatadi
            }

            if (status === 'too_far') {
                // frontendga chiqadi
            }

            if (status === 'too_close') {
                // frontendga chiqadi
            }

            if (status === 'in_range') {
                // scanning state
            }

        } catch (e) {
            console.log('Parse error:', e.message);
            socket.emit('liveness:error', {message: 'Invalid face response'});
        }
    });

    faceWs.on('error', () => {
        socket.emit('liveness:error', {message: 'Face server error'});
        cleanup(sessionId);
    });

    faceWs.on('close', () => {
        cleanup(sessionId);
    });

    // 10 sekund timeout
    const timeout = setTimeout(() => {
        socket.emit('liveness:error', {message: 'Timeout'});
        cleanup(sessionId);
    }, 10000);

    activeLiveness.set(sessionId, {
        socketId: socket.id,
        faceWs,
        timeout,
        framesBuffer: []
    });

    // Agar user disconnect qilsa
    socket.on('disconnect', () => {
        cleanup(sessionId);
    });
});

function cleanup(sessionId) {
    const session = activeLiveness.get(sessionId);
    if (!session) return;

    session.faceWs?.close();
    clearTimeout(session.timeout);
    activeLiveness.delete(sessionId);
}

// Connection handler
io.on('connection', async (socket) => {
    const user = socket.user;
    const socketId = socket.id;

    if (!user.id) {
        socket.disconnect();
        return;
    }

    // Join private room
    socket.join(`user_${user.id}`);

    if (user.canReceiveOnlineEvents) {
        socket.join('online_receivers');
    }

    // Mark user as online in Redis
    await redis.hset('online_users', user.id.toString(), JSON.stringify({
        socketId: socket.id,
        id: user.id,
        short_name: user.short_name,
        photo: user.photo,
        organization: user.organization,
        canReceiveOnlineEvents: user.canReceiveOnlineEvents,
        type: user.type
    }));

    // Broadcast online receiver users
    socket.to('online_receivers').emit('user:online', {user});

    // Front 'get_online_users' so'raganda ishlaydi
    socket.on('get_online_users', async () => {
        try {
            if (!user.canReceiveOnlineEvents) {
                return socket.emit('online_users', []);
            }

            // Redis hash dan barcha online userIdlarni olish
            const onlineUsers = await redis.hgetall('online_users');
            const list = Object.values(onlineUsers).map(item => JSON.parse(item));
            const {token, userId, secret, type = 'sanctum'} = socket.handshake.auth;
            if (!token) {
                return;
            }

            const userIds = list.map(u => u.id);
            const response = await axios.post(
                `${LARAVEL_API_URL}/api/v1/user/socket/users-photos`,
                {
                    user_ids: userIds
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'X-AUTH-TYPE': type
                    },
                    timeout: 10000
                }
            );

            const photosMap = Object.fromEntries(
                response.data.map(u => [u.id, u.photo])
            );
            const updatedList = list.map(user => ({
                ...user,
                photo: photosMap[user.id] || null
            }));

            // Faqat shu socketga yuborish
            socket.emit('online_users', updatedList);
        } catch (err) {
            socket.emit('online_users', []);
        }
    });

    socket.on('emoji', (data) => {
        try {
            const {toUserId, emoji} = data;
            // Kim yuborganini socketdan olamiz
            const fromUserId = socket.user.id;

            const userRoom = `user_${toUserId}`;
            io.to(userRoom).emit('emoji', {
                emoji,
                fromUserId,
                shortName: socket.user.short_name,
            });

            // 2. Bufferga qo‘shamiz
            emojiBuffer.push({
                'fromUserId': fromUserId,
                'toUserId': toUserId,
                'emoji': emoji,
                'ts': Date.now()
            });

            // 3. Agar 30 ta bo‘lsa -> bitta API chaqiramiz
            if (emojiBuffer.length >= MAX_BATCH) {
                flushEmojiBatch();
            }

        } catch (e) {
            console.error('Error handling notification: ', e);
        }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
        const userId = user.id.toString();
        const currentSocket = JSON.parse(await redis.hget('online_users', userId));
        if (!currentSocket) return;
        const currentSocketId = currentSocket.socketId;
        if (currentSocketId === socketId) {
            await redis.hdel('online_users', userId);
            socket.broadcast.emit('user:offline', {user});
            // redis.del(`presence:${userId}`);
        }

        for (const [sessionId, item] of activeLiveness.entries()) {
            if (item.socketId === socket.id) {
                item.faceWs.close();
                clearTimeout(item.timeout);
                activeLiveness.delete(sessionId);
            }
        }
    });

    // Ping-pong for connection health
    socket.on('ping', (cb) => {
        if (typeof cb === 'function') {
            cb('pong');
        }
    });

    socket.on('user:inactive', async () => {
        await redis.hdel('online_users', user.id.toString());
        socket.broadcast.emit('user:offline', {user});
    });

    socket.on('error', (err) => {
        console.error(`Socket error for user ${user.id}: ${err.message}`);
    });
});

// Socket server ishga tushganda, io yaratgandan keyin
const subscriber = new Redis(redisConfig); // yangi connection subscriber uchun

subscriber.subscribe('notifications', (err, count) => {
    if (err) {
    } else {
    }
});

subscriber.on('connect', () => console.log('Subscriber connected'));

subscriber.on('message', async (channel, message) => {
    try {
        const payload = JSON.parse(message); // {userId: 5, data: {}}
        const userRoom = `user_${payload.userId}`;
        // Agar user online bo‘lsa socketga yuborish
        io.to(userRoom).emit('notification', payload.data);
    } catch (e) {
        console.log(e)
    }
});

// Health check endpoint
httpServer.on('request', async (req, res) => {
});

// Start server
httpServer.listen(PORT, HOST);

// Graceful shutdown
['SIGINT', 'SIGTERM'].forEach(sig => {
    process.on(sig, async () => {
        await io.close();
        httpServer.close(() => process.exit(0));
    });
});
