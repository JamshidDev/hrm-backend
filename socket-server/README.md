# Virtual Cabinet Socket.IO Server

Real-time WebSocket server for Virtual Cabinet chat functionality.

## Installation

```bash
npm install
```

## Configuration

Copy `.env` file and configure:
- `PORT`: Socket server port (default: 3000)
- `LARAVEL_API_URL`: Laravel backend URL
- `LARAVEL_API_SECRET`: Secret key for API authentication

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Events

### Client -> Server

- `chat:join` - Join a chat room
  ```js
  socket.emit('chat:join', chatId)
  ```

- `chat:leave` - Leave a chat room
  ```js
  socket.emit('chat:leave', chatId)
  ```

- `message:send` - Send a new message
  ```js
  socket.emit('message:send', { chatId, message })
  ```

- `message:edit` - Edit a message
  ```js
  socket.emit('message:edit', { chatId, messageId, content })
  ```

- `message:delete` - Delete a message
  ```js
  socket.emit('message:delete', { chatId, messageId })
  ```

- `typing:start` - User started typing
  ```js
  socket.emit('typing:start', { chatId })
  ```

- `typing:stop` - User stopped typing
  ```js
  socket.emit('typing:stop', { chatId })
  ```

- `message:read` - Mark message as read
  ```js
  socket.emit('message:read', { chatId, messageId })
  ```

### Server -> Client

- `user:online` - User came online
- `user:offline` - User went offline
- `user:joined-chat` - User joined a chat
- `message:new` - New message received
- `message:edited` - Message was edited
- `message:deleted` - Message was deleted
- `typing:user-typing` - User is typing
- `typing:user-stopped` - User stopped typing
- `message:read-by` - Message read by user

## Health Check

```bash
curl http://localhost:3000/health
```

## Authentication

Socket connects with:
```js
socket = io('http://localhost:3000', {
    auth: {
        token: 'user-token',
        userId: 'user-id'
    }
})
```
