require('dotenv').config();
const WebSocket = require('ws');
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { getDatabase, ref, set, update, serverTimestamp } = require('firebase/database');
const { initializeApp } = require('firebase/app');

// Initialize Firebase
const firebaseConfig = {
	apiKey: process.env.VITE_FIREBASE_API_KEY,
	authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
	databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
	projectId: process.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.VITE_FIREBASE_APP_ID,
	measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir);
}

const wss = new WebSocket.Server({ port: 8080 }, () => {
	console.log('✅ WebSocket server started on port 8080');
});

// Store active connections and chat rooms
const activeConnections = new Map();
const chatRooms = new Map();

wss.on('connection', (ws, request) => {
	const { query } = url.parse(request.url, true);
	const { userId, chatId } = query;

	if (!userId || !chatId) {
		ws.close(4001, 'Missing userId or chatId');
		return;
	}

	// Connection setup
	if (!activeConnections.has(userId)) {
		activeConnections.set(userId, { socket: ws, chatIds: new Set() });
	}
	activeConnections.get(userId).chatIds.add(chatId);

	// Chat room initialization
	if (!chatRooms.has(chatId)) {
		chatRooms.set(chatId, {
			participants: new Set(),
			messages: [],
			typingUsers: new Set()
		});
	}
	chatRooms.get(chatId).participants.add(userId);

	// Message handler
	ws.on('message', async (rawData) => {
		try {
			if (rawData instanceof Buffer) {
				// Existing file handling
				return;
			}

			const message = JSON.parse(rawData);

			// Handle different message types
			switch (message.type) {
				case 'typing':
				case 'read_receipt':
					// Existing handlers
					break;

				case 'edit_message':
					await handleEditMessage(chatId, userId, message);
					break;

				case 'delete_message':
					await handleDeleteMessage(chatId, userId, message);
					break;

				default:
					await handleRegularMessage(chatId, userId, message);
			}
		} catch (error) {
			console.error('❗ Error processing message:', error);
		}
	});

	// Existing cleanup handlers
});

async function handleEditMessage(chatId, userId, message) {
	const msgIndex = chatRooms.get(chatId).messages.findIndex(m => m.id === message.messageId);
	if (msgIndex === -1) return;

	const originalMessage = chatRooms.get(chatId).messages[msgIndex];
	if (originalMessage.sender !== userId) return;

	// Update in-memory message
	const updatedMessage = {
		...originalMessage,
		text: message.newText,
		edited: true,
		updatedAt: Date.now()
	};
	chatRooms.get(chatId).messages[msgIndex] = updatedMessage;

	// Update Firebase
	const messageRef = ref(database, `chats/${chatId}/messages/${message.messageId}`);
	await update(messageRef, {
		text: message.newText,
		edited: true,
		updatedAt: serverTimestamp()
	});

	// Broadcast update
	broadcastToChat(chatId, {
		type: 'message_edited',
		messageId: message.messageId,
		newText: message.newText,
		edited: true,
		updatedAt: updatedMessage.updatedAt
	});
}

async function handleDeleteMessage(chatId, userId, message) {
	const msgIndex = chatRooms.get(chatId).messages.findIndex(m => m.id === message.messageId);
	if (msgIndex === -1) return;

	const originalMessage = chatRooms.get(chatId).messages[msgIndex];
	if (originalMessage.sender !== userId) return;

	// Update in-memory message
	const updatedMessage = {
		...originalMessage,
		deleted: true,
		updatedAt: Date.now()
	};
	chatRooms.get(chatId).messages[msgIndex] = updatedMessage;

	// Update Firebase
	const messageRef = ref(database, `chats/${chatId}/messages/${message.messageId}`);
	await update(messageRef, {
		deleted: true,
		updatedAt: serverTimestamp()
	});

	// Broadcast update
	broadcastToChat(chatId, {
		type: 'message_deleted',
		messageId: message.messageId,
		deleted: true,
		updatedAt: updatedMessage.updatedAt
	});
}

async function handleRegularMessage(chatId, userId, message) {
	const textMessage = {
		type: 'message',
		id: uuidv4(),
		text: message.text,
		sender: userId,
		status: 'delivered',
		chatId,
		timestamp: Date.now()
	};

	// Add to in-memory store
	chatRooms.get(chatId).messages.push(textMessage);

	// Save to Firebase
	const messageRef = ref(database, `chats/${chatId}/messages/${textMessage.id}`);
	await set(messageRef, {
		...textMessage,
		timestamp: serverTimestamp()
	});

	// Broadcast message
	broadcastToChat(chatId, textMessage);
}

// Existing helper functions remain unchanged
// Helper function to broadcast to all participants in a chat
function broadcastToChat(chatId, data) {
	if (!chatRooms.has(chatId)) return;

	chatRooms.get(chatId).participants.forEach(participantId => {
		const connection = activeConnections.get(participantId);
		if (connection?.socket.readyState === WebSocket.OPEN) {
			connection.socket.send(JSON.stringify(data));
		}
	});
}

// Cleanup user connections
function cleanupUser(userId, chatId) {
	if (activeConnections.has(userId)) {
		const userData = activeConnections.get(userId);
		userData.chatIds.delete(chatId);
		if (userData.chatIds.size === 0) {
			activeConnections.delete(userId);
		}
	}

	if (chatRooms.has(chatId)) {
		const room = chatRooms.get(chatId);
		room.participants.delete(userId);
		room.typingUsers.delete(userId);

		if (room.participants.size === 0) {
			chatRooms.delete(chatId);
		}
	}
}

// File download endpoint (Express would be better for production)
const http = require('http');
const server = http.createServer((req, res) => {
	if (req.url.startsWith('/files/')) {
		const fileId = req.url.split('/')[2];
		const filePath = path.join(uploadDir, fileId);

		if (fs.existsSync(filePath)) {
			const mimeType = mime.lookup(filePath) || 'application/octet-stream';
			res.setHeader('Content-Type', mimeType);
			res.setHeader('Content-Disposition', `attachment; filename=${fileId}`);
			fs.createReadStream(filePath).pipe(res);
		} else {
			res.statusCode = 404;
			res.end('File not found');
		}
	} else {
		res.statusCode = 404;
		res.end('Not found');
	}
});

server.listen(8081, () => {
	console.log('✅ File server started on port 8081');
});