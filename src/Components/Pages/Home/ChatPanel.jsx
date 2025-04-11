import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon, UserIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { ref, onValue, get, update, serverTimestamp } from "firebase/database";
import { auth, database } from "../../../../firebaseConfig";
import { useChatStore } from "../../../store/chatstore";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ReplyPreview from "./ReplyPreview";
import markMessagesAsRead from "./utils/markMessagesAsRead";
import { generateWebSocketURL } from "./utils/websocket";

const ChatPanel = ({ chat, onBack, className }) => {
	const [messages, setMessages] = useState([]);
	const [replyingTo, setReplyingTo] = useState(null);
	const [editingMessage, setEditingMessage] = useState(null);
	const [webSocket, setWebSocket] = useState(null);
	const messagesEndRef = useRef(null);
	const addMessage = useChatStore((state) => state.addMessage);

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// WebSocket connection
	useEffect(() => {
		if (!chat?.chatId) return;

		const ws = new WebSocket(generateWebSocketURL(chat.chatId));
		setWebSocket(ws);

		ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				if (message.chatId === chat.chatId) {
					if (message.type === 'message_deleted') {
						setMessages(prev => prev.map(msg =>
							msg.id === message.messageId ? { ...msg, deleted: true } : msg
						));
					} else if (message.type === 'message_edited') {
						setMessages(prev => prev.map(msg =>
							msg.id === message.messageId ? { ...msg, text: message.newText, edited: true } : msg
						));
					} else {
						setMessages(prev => [...prev, message]);
						addMessage(message);
					}
				}
			} catch (error) {
				console.error("Message parsing error:", error);
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			setWebSocket(null);
		};

		ws.onclose = () => setWebSocket(null);

		return () => ws.close();
	}, [chat?.chatId, addMessage]);

	// Mark messages as read
	useEffect(() => {
		if (!chat?.chatId || !auth.currentUser?.uid) return;

		const chatMessagesRef = ref(database, `chats/${chat.chatId}/messages`);
		const unsubscribe = onValue(chatMessagesRef, (snapshot) => {
			const messagesData = snapshot.val();
			if (messagesData) {
				markMessagesAsRead(messagesData, chat.chatId, auth.currentUser.uid);
			}
		});

		return () => unsubscribe();
	}, [chat?.chatId]);

	// Load messages
	useEffect(() => {
		if (!chat?.chatId) return;

		const chatMessagesRef = ref(database, `chats/${chat.chatId}/messages`);
		const unsubscribe = onValue(chatMessagesRef, (snapshot) => {
			const messagesData = snapshot.val();
			if (messagesData) {
				const messagesList = Object.keys(messagesData).map(key => ({
					id: key,
					...messagesData[key]
				}));

				// Sort messages by timestamp
				const sortedMessages = messagesList.sort((a, b) => a.timestamp - b.timestamp);
				setMessages(sortedMessages);
			}
		});

		return () => unsubscribe();
	}, [chat?.chatId]);

	// Message actions
	const cancelReply = () => setReplyingTo(null);
	const cancelEdit = () => setEditingMessage(null);


	const handleDeleteMessage = async (message) => {
		if (!chat?.chatId) return;

		try {
			// Send delete via WebSocket for real-time updates
			if (webSocket?.readyState === WebSocket.OPEN) {
				webSocket.send(JSON.stringify({
					type: 'message_deleted',
					messageId: message.id,
					chatId: chat.chatId
				}));
			}

			// Find the Firebase key for this message to update in database
			const chatMessagesRef = ref(database, `chats/${chat.chatId}/messages`);
			const snapshot = await get(chatMessagesRef);
			const messagesData = snapshot.val();

			// Find the Firebase key by matching the message id
			let firebaseKey = null;
			if (messagesData) {
				for (const key in messagesData) {
					if (messagesData[key].id === message.id) {
						firebaseKey = key;
						break;
					}
				}
			}

			if (firebaseKey) {
				// Option 1: Soft Delete - Mark as deleted but keep in database
				const messageRef = ref(database, `chats/${chat.chatId}/messages/${firebaseKey}`);
				await update(messageRef, {
					deleted: true,
					deletedAt: serverTimestamp()
				});

				// Update local state to reflect changes
				setMessages(prev => prev.map(msg =>
					msg.id === message.id
						? { ...msg, deleted: true }
						: msg
				));

				// Option 2: Hard Delete - Uncomment to completely remove the message
				// await remove(messageRef);
				// setMessages(prev => prev.filter(msg => msg.id !== message.id));
			} else {
				console.error("Could not find Firebase key for message");
			}
		} catch (error) {
			console.error("Message deletion failed:", error);
		}
	};


	const handleEditMessage = async (editedMessage) => {
		if (!chat?.chatId || !editedMessage.text.trim() || !editedMessage) return;

		try {
			// Send edit via WebSocket for real-time updates
			if (webSocket?.readyState === WebSocket.OPEN) {
				webSocket.send(JSON.stringify({
					type: 'message_edited',
					messageId: editedMessage.id,
					newText: editedMessage.text,
					chatId: chat.chatId
				}));
			}

			// Find the Firebase key for this message to update in database
			const chatMessagesRef = ref(database, `chats/${chat.chatId}/messages`);
			const snapshot = await get(chatMessagesRef);
			const messagesData = snapshot.val();

			// Find the Firebase key by matching the message id
			let firebaseKey = null;
			if (messagesData) {
				for (const key in messagesData) {
					if (messagesData[key].id === editedMessage.id) {
						firebaseKey = key;
						break;
					}
				}
			}

			if (firebaseKey) {
				// Update using the correct Firebase key
				const messageRef = ref(database, `chats/${chat.chatId}/messages/${firebaseKey}`);
				await update(messageRef, {
					text: editedMessage.text,
					edited: true,
					updatedAt: serverTimestamp()
				});

				// Update local state to reflect changes
				setMessages(prev => prev.map(msg =>
					msg.id === editedMessage.id
						? { ...msg, text: editedMessage.text, edited: true }
						: msg
				));
			} else {
				console.error("Could not find Firebase key for message");
			}
		} catch (error) {
			console.error("Message editing failed:", error);
		}
	};

	return (
		<motion.div
			initial={{ x: "100%", opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			exit={{ x: "100%", opacity: 0 }}
			transition={{ duration: 0.5, ease: "easeInOut" }}
			className={`flex flex-col h-full max-h-screen overflow-hidden border-r border-gray-200 bg-glassmorphism p-4 backdrop-blur-md relative ${className}`}
		>
			{/* Chat Header */}
			<ChatHeader chat={chat} onBack={onBack} />

			{/* Messages Display */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
				<MessageList
					messages={messages}
					currentUserId={auth.currentUser?.uid}
					chatId={chat?.chatId}
					chatName={chat?.userName}
					onReply={setReplyingTo}
					onEdit={handleEditMessage}
					onDelete={handleDeleteMessage}
					webSocket={webSocket}
				/>
				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
			<div className="pt-3 border-t border-gray-700 flex flex-col bg-primary/20 backdrop-blur-md relative">
				{/* Reply/Edit Preview */}
				{replyingTo && (
					<div className="px-3 mb-2">
						<ReplyPreview
							replyMessage={replyingTo}
							chatName={chat?.userName}
							onCancel={cancelReply}
						/>
					</div>
				)}

				{editingMessage && (
					<div className="px-3 mb-2 flex justify-between items-center bg-blue-900/20 rounded-lg">
						<span className="text-sm text-blue-300">Editing message</span>
						<button
							onClick={cancelEdit}
							className="p-1 hover:bg-blue-900/30 rounded-full"
						>
							<XMarkIcon className="w-4 h-4 text-blue-300" />
						</button>
					</div>
				)}

				{/* Message Input */}
				<MessageInput
					chatId={chat?.chatId}
					replyingTo={replyingTo}
					webSocket={webSocket}
					editMessage={editingMessage}
					onReplySent={cancelReply}
					onEditComplete={cancelEdit}
				/>
			</div>
		</motion.div>
	);
};

// Chat Header Component remains unchanged
const ChatHeader = ({ chat, onBack }) => (
	<div className="flex items-center rounded-lg p-4 bg-white/10 backdrop-blur-lg border-b border-gray-700">
		{chat?.userProfilePicture ? (
			<img
				src={chat.userProfilePicture}
				alt="User"
				className="w-10 h-10 rounded-full mr-3 object-cover"
			/>
		) : (
			<div className="w-10 h-10 rounded-full mr-3 bg-gray-700 flex items-center justify-center">
				<UserIcon className="w-6 h-6 text-gray-400" />
			</div>
		)}
		<h2 className="text-white font-semibold text-lg">
			{chat?.userName || "New Chat"}
		</h2>
		<button
			className="lg:hidden ml-auto p-2 bg-highlight rounded-lg hover:bg-highlight/80 transition"
			onClick={onBack}
		>
			<XMarkIcon className="w-5 h-5 text-white" />
		</button>
	</div>
);

export default ChatPanel;