# LUMINTERN Real-Time Chat System

## Overview

The LUMINTERN Chat System enables real-time communication between Freshers and Businesses using Socket.io. Messages are persisted in MongoDB for reliability and history.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHAT SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   CLIENT A   │      │   SOCKET.IO  │      │   CLIENT B   │  │
│  │  (Business)  │◄────►│    SERVER    │◄────►│  (Fresher)   │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                     │                     │          │
│         │                     │                     │          │
│         ▼                     ▼                     ▼          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   REST API   │      │   MONGODB    │      │   REST API   │  │
│  │   Endpoints  │◄────►│   Store      │◄────►│   Endpoints  │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Database Models

### ChatRoom Schema
```javascript
{
  task: ObjectId,           // Reference to Task
  participants: [ObjectId], // Array of 2 User IDs
  isActive: Boolean,
  lastMessage: {
    text: String,
    sender: ObjectId,
    timestamp: Date
  },
  unreadCounts: Map,        // { userId: count }
  createdAt: Date,
  updatedAt: Date
}
```

### ChatMessage Schema
```javascript
{
  room: ObjectId,           // Reference to ChatRoom
  sender: ObjectId,         // Reference to User
  messageText: String,
  messageType: 'text' | 'file' | 'image' | 'system',
  attachment: {
    url: String,
    filename: String,
    filesize: Number,
    mimetype: String
  },
  isRead: Boolean,
  readAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 Socket.io Events

### Client → Server Events

#### `join_room`
Join a chat room for a specific task.

```javascript
socket.emit('join_room', { roomId: 'room_id_here' });
```

**Response:** `room_joined` event

---

#### `leave_room`
Leave a chat room.

```javascript
socket.emit('leave_room', { roomId: 'room_id_here' });
```

---

#### `send_message`
Send a message to a room.

```javascript
socket.emit('send_message', {
  roomId: 'room_id_here',
  messageText: 'Hello!',
  messageType: 'text', // optional: 'text', 'file', 'image'
  attachment: {         // optional
    url: 'https://...',
    filename: 'file.pdf',
    filesize: 1024,
    mimetype: 'application/pdf'
  }
});
```

**Response:** `receive_message` event broadcast to room

---

#### `typing_start`
Notify others that user is typing.

```javascript
socket.emit('typing_start', { roomId: 'room_id_here' });
```

---

#### `typing_stop`
Notify others that user stopped typing.

```javascript
socket.emit('typing_stop', { roomId: 'room_id_here' });
```

---

#### `mark_read`
Mark all messages in room as read.

```javascript
socket.emit('mark_read', { roomId: 'room_id_here' });
```

---

### Server → Client Events

#### `receive_message`
Received when a new message arrives.

```javascript
socket.on('receive_message', (data) => {
  // data: { _id, room, sender, messageText, messageType, attachment, isRead, createdAt }
});
```

---

#### `room_joined`
Confirmation of joining a room.

```javascript
socket.on('room_joined', (data) => {
  // data: { roomId, message }
});
```

---

#### `user_joined_room`
Notification when another user joins the room.

```javascript
socket.on('user_joined_room', (data) => {
  // data: { userId, userName, roomId }
});
```

---

#### `user_left_room`
Notification when another user leaves the room.

```javascript
socket.on('user_left_room', (data) => {
  // data: { userId, userName, roomId }
});
```

---

#### `user_typing`
Notification when user starts typing.

```javascript
socket.on('user_typing', (data) => {
  // data: { userId, userName, roomId }
});
```

---

#### `user_stopped_typing`
Notification when user stops typing.

```javascript
socket.on('user_stopped_typing', (data) => {
  // data: { userId, roomId }
});
```

---

#### `new_message_notification`
Notification for new message (even when not in room).

```javascript
socket.on('new_message_notification', (data) => {
  // data: { roomId, message: { _id, text, sender, timestamp } }
});
```

---

#### `messages_read`
Notification when messages are read by other user.

```javascript
socket.on('messages_read', (data) => {
  // data: { roomId, readBy }
});
```

---

#### `user_status`
Online/offline status updates.

```javascript
socket.on('user_status', (data) => {
  // data: { userId, status: 'online' | 'offline' }
});
```

---

#### `error`
Error messages from server.

```javascript
socket.on('error', (data) => {
  // data: { message }
});
```

---

## 🔐 Security

### Authentication
- JWT token required for Socket.io connection
- Token verified on every connection
- Invalid tokens rejected immediately

### Room Access Control
- Users can only join rooms where they are participants
- All message operations verify room membership
- Outsiders blocked entirely

### Message Validation
- Message text required (non-empty)
- Maximum 5000 characters
- Soft delete preserves data integrity

---

## 📡 REST API Endpoints

### Chat Room Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/chat/room/:taskId` | Create chat room for task | Business/Fresher |
| GET | `/api/chat/rooms` | Get user's chat rooms | Authenticated |
| GET | `/api/chat/room/task/:taskId` | Get room by task ID | Authenticated |

### Messages

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/chat/room/:roomId/messages` | Get room messages (paginated) | Participant |
| GET | `/api/chat/room/:roomId/search` | Search messages in room | Participant |
| DELETE | `/api/chat/message/:messageId` | Soft delete message | Sender |
| GET | `/api/chat/unread` | Get total unread count | Authenticated |

---

## 💻 Client Integration Example

### JavaScript/React

```javascript
import { io } from 'socket.io-client';

// Connect to socket
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Join a room
socket.emit('join_room', { roomId: 'room_id' });

socket.on('room_joined', (data) => {
  console.log('Joined room:', data.roomId);
});

// Send message
const sendMessage = (roomId, text) => {
  socket.emit('send_message', {
    roomId,
    messageText: text
  });
};

// Listen for messages
socket.on('receive_message', (message) => {
  console.log('New message:', message);
  // Update UI with new message
});

// Typing indicators
socket.emit('typing_start', { roomId });

socket.on('user_typing', (data) => {
  console.log(`${data.userName} is typing...`);
});

// Mark messages as read
socket.emit('mark_read', { roomId });

// Disconnect
socket.disconnect();
```

---

## 📊 Message Pagination

```javascript
// Get messages with pagination
const response = await fetch('/api/chat/room/roomId/messages?page=1&limit=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data, pagination } = await response.json();
// pagination: { page, limit, total, pages }
```

---

## 🔍 Search Messages

```javascript
// Search messages in a room
const response = await fetch('/api/chat/room/roomId/search?query=keyword', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { results, data } = await response.json();
// data.messages: Array of matching messages
```

---

## 🚀 Scaling Considerations

### Current: Single Server
- ✅ Simple setup
- ✅ Low latency
- ❌ Single point of failure
- ❌ Limited horizontal scaling

### Production: Redis Adapter
```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**Benefits:**
- Horizontal scaling across multiple servers
- Message broadcasting across instances
- Session persistence

---

## 📈 Performance Optimizations

1. **Message Indexing**
   - Compound index on `{ room: 1, createdAt: -1 }`
   - Enables fast pagination queries

2. **Unread Count Caching**
   - Stored in ChatRoom document
   - Avoids counting messages on every request

3. **Soft Deletes**
   - Messages preserved for audit
   - Filtered in queries

4. **Connection Management**
   - User-to-socket mapping in memory
   - Automatic cleanup on disconnect

---

## 🧪 Testing

### Test Socket Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'test_token' }
});

socket.on('connect', () => console.log('✅ Connected'));
socket.on('connect_error', (err) => console.log('❌ Error:', err.message));
```

### Test Room Join
```javascript
socket.emit('join_room', { roomId: 'test_room' });
socket.on('room_joined', (data) => console.log('✅ Joined:', data));
socket.on('error', (data) => console.log('❌ Error:', data.message));
```

---

## 📞 Support

For chat system issues:
- **Email:** tech-support@lumintern.com
- **Documentation:** This file
- **Logs:** Check server console for Socket.io events