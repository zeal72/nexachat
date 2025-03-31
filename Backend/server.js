const WebSocket = require('ws');
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { getDatabase, ref, set, push, serverTimestamp } = require('firebase/database');
const { initializeApp } = require('firebase/app');

// Initialize Firebase
const firebaseConfig = { /* your config */ };
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
const activeConnections = new Map(); // { userId: { socket, chatIds } }
const chatRooms = new Map(); // { chatId: { participants, messages, typingUsers } }


async function getChatHistoryFromFirebase(chatId) {
	const dbRef = ref(database, `chats/${chatId}/messages`);
	const snapshot = await get(dbRef);
	return snapshot.val() ? Object.values(snapshot.val()) : [];
}

wss.on('connection', (ws, request) => {
	const { query } = url.parse(request.url, true);
	const { userId, chatId } = query;

	if (!userId || !chatId) {
		console.error('❌ Missing userId or chatId');
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

	console.log(`👤 User ${userId} connected to chat ${chatId}`);

	// Send initial data
	ws.send(JSON.stringify({
		type: 'init',
		history: chatRooms.get(chatId).messages.slice(-50),
		typingUsers: Array.from(chatRooms.get(chatId).typingUsers)
	}));

	// Message handler
	ws.on('message', async (rawData) => {
		try {
			// Handle binary data (file uploads)
			if (rawData instanceof Buffer) {
				const fileId = uuidv4();
				const filePath = path.join(uploadDir, fileId);
				fs.writeFileSync(filePath, rawData);

				const fileInfo = {
					id: fileId,
					type: 'file',
					originalName: 'file', // In real app, send metadata first
					mimeType: 'application/octet-stream',
					size: rawData.length,
					sender: userId,
					timestamp: Date.now(),
					status: 'delivered'
				};

				chatRooms.get(chatId).messages.push(fileInfo);
				broadcastToChat(chatId, { type: 'file', ...fileInfo });
				return;
			}

			// Handle text messages
			const message = JSON.parse(rawData);

			if (message.type === 'typing') {
				// Typing indicator
				if (message.isTyping) {
					chatRooms.get(chatId).typingUsers.add(userId);
				} else {
					chatRooms.get(chatId).typingUsers.delete(userId);
				}
				broadcastToChat(chatId, {
					type: 'typing',
					userId,
					isTyping: message.isTyping
				});
				return;
			}

			if (message.type === 'read_receipt') {
				// Update message status
				const msg = chatRooms.get(chatId).messages.find(m => m.id === message.messageId);
				if (msg) msg.status = 'read';
				broadcastToChat(chatId, {
					type: 'read_receipt',
					messageId: message.messageId,
					readerId: userId,
					timestamp: Date.now()
				});
				return;
			}

			// Regular text message
			const textMessage = {
				type: 'message',
				id: uuidv4(),
				text: message.text,
				sender: userId,
				timestamp: serverTimestamp(),
				status: 'delivered',
				chatId // Add chatId reference
			};

			chatRooms.get(chatId).messages.push(textMessage);
			const messageRef = ref(database, `chats/${chatId}/messages/${textMessage.id}`);
			await set(messageRef, textMessage);

			// Then broadcast to participants
			broadcastToChat(chatId, textMessage);

		} catch (error) {
			console.error('❗ Error processing message:', error);
		}
	});

	// Handle disconnection
	ws.on('close', () => {
		console.log(`❌ User ${userId} disconnected`);
		cleanupUser(userId, chatId);
	});

	ws.on('error', (error) => {
		console.error(`❗ WebSocket error for user ${userId}:`, error);
		cleanupUser(userId, chatId);
	});
});

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