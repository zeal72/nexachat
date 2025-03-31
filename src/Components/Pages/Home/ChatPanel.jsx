import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	PaperAirplaneIcon,
	FaceSmileIcon,
	CheckIcon,
	UserIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { ref, push, onValue, serverTimestamp } from "firebase/database";
import { auth, database } from "../../../../firebaseConfig";
import { useChatStore } from "../../../store/chatstore";
import { debounce } from "lodash";  // Import debounce

const generateWebSocketURL = (chatId) => `ws://localhost:8080/${chatId}`;

const ChatPanel = ({ chat, onBack, className }) => {
	const [newMessage, setNewMessage] = useState("");
	// const [messages, setMessages] = useState([]); // REMOVE - use store
	const showEmojiPicker = useRef(false); // Ref instead of state
	const messagesEndRef = useRef(null);
	const [webSocket, setWebSocket] = useState(null);
	const [errorMessage, setErrorMessage] = useState("");
	const activeChat = useChatStore((state) => state.activeChat);
	const addMessage = useChatStore((state) => state.addMessage);
	const getChatMessages = useChatStore((state) => state.getChatMessages);
	const emojiPickerRef = useRef(null);
	const emojiButtonRef = useRef(null);
	const [typingUsers, setTypingUsers] = useState([]);
	const clearMessages = useChatStore((state) => state.clearMessages);  // Get clearMessages from store
	const messages = getChatMessages(chat?.chatId); // Get messages from store, using getter

	// --- Emoji Picker ---
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showEmojiPicker.current &&
				!emojiPickerRef.current?.contains(event.target) &&
				!emojiButtonRef.current?.contains(event.target)) {
				showEmojiPicker.current = false;
				forceUpdate();  // Force a re-render (see below)
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Force re-render hook - needed for ref-based showEmojiPicker
	const [, updateState] = useState();
	const forceUpdate = useCallback(() => updateState({}), []);

	const toggleEmojiPicker = () => {
		showEmojiPicker.current = !showEmojiPicker.current;
		forceUpdate();  // Force a re-render
	};

	// --- Message Synchronization ---
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// --- WebSocket Management ---
	useEffect(() => {
		if (!chat?.chatId) return;

		const ws = new WebSocket(generateWebSocketURL(chat.chatId));
		setWebSocket(ws);

		ws.onopen = () => {
			console.log("WebSocket connected");
		};

		ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				if (message.chatId === chat.chatId) {
					addMessage(message);
				}
			} catch (error) {
				console.error("Message parsing error:", error);
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		ws.onclose = () => {
			console.log("WebSocket disconnected");
		};

		const handleTyping = debounce(() => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({
					type: 'typing',
					isTyping: false,
					userId: auth.currentUser?.uid,  // Add userId
					chatId: chat.chatId  // Add chatId
				}));
			}
		}, 1000);

		const typingHandler = () => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({
					type: 'typing',
					isTyping: true,
					userId: auth.currentUser?.uid,  // Add userId
					chatId: chat.chatId  // Add chatId
				}));
				handleTyping();
			}
		};

		const markMessagesAsRead = () => {
			// Implementation remains the same
		};

		const handleInputChange = (e) => {
			setNewMessage(e.target.value);
			typingHandler();
		};

		// Set event listeners
		ws.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === 'typing') {
					setTypingUsers(prev => {
						if (data.isTyping) {
							return prev.includes(data.userId) ? prev : [...prev, data.userId];
						} else {
							return prev.filter(id => id !== data.userId);
						}
					});
				}
			} catch (error) {
				console.error("Error processing typing indicator:", error);
			}
		});

		window.addEventListener('focus', markMessagesAsRead);

		return () => {
			window.removeEventListener('focus', markMessagesAsRead);
			ws.close();
			clearMessages(chat.chatId); // Clear messages when chat is unmounted
		};
	}, [chat?.chatId, addMessage, clearMessages]);

	// --- Firebase Message Sync ---
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
				// setMessages(messagesList); // NO - Store handles state
				messagesList.forEach(msg => addMessage(msg)); // Populate store
			}
		});

		return () => unsubscribe();
	}, [chat?.chatId, addMessage]);

	// --- Message Sending Logic ---
	const sendMessage = async () => {
		if (!chat?.chatId || !newMessage.trim()) return;

		const tempId = Date.now().toString();
		const messageData = {
			id: tempId,
			text: newMessage,
			senderId: auth.currentUser?.uid,
			timestamp: Date.now(),
			chatId: chat.chatId,
			status: 'sending'
		};

		addMessage(messageData);
		setNewMessage('');

		try {
			if (webSocket?.readyState === WebSocket.OPEN) {
				webSocket.send(JSON.stringify(messageData));
			}
		} catch (error) {
			setErrorMessage("Failed to send message. Please try again.");
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
					onClick={onBack} // This triggers mobile navigation back
				>
					<XMarkIcon className="w-5 h-5 text-white" />
				</button>
			</div>

			{/* Messages Display */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
				{messages && messages.map((msg) => ( // Use messages from the store
					<motion.div
						key={msg.id}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className={`flex ${msg.senderId === auth.currentUser?.uid ? "justify-end" : "justify-start"}`}
					>
						<div className={`p-3 max-w-xs text-sm rounded-xl shadow-md ${msg.senderId === auth.currentUser?.uid
							? "bg-gray-900 text-white"
							: "bg-white/20 text-white"
							}`}>
							<p>{msg.text}</p>
							<div className="flex items-center justify-end mt-1 space-x-1">
								<span className="text-xs text-gray-300">
									{new Date(msg.timestamp).toLocaleTimeString()}
								</span>
								{msg.status === 'sending' && (
									<span className="text-xs text-gray-400">Sending...</span>
								)}
								{msg.status === 'delivered' && (
									<CheckIcon className="w-4 h-4 text-gray-400" />
								)}
								{msg.status === 'read' && (
									<CheckIcon className="w-4 h-4 text-blue-400" />
								)}
							</div>
						</div>
					</motion.div>
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
			<div className="pt-3 border-t border-gray-700 flex items-center bg-primary/20 backdrop-blur-md space-x-3 relative"> {/* Added relative positioning */}
				<button
					ref={emojiButtonRef}
					onClick={toggleEmojiPicker}  // Use toggle function
					className="p-2 hover:bg-white/10 rounded-full transition"
				>
					<FaceSmileIcon className="w-6 h-6 text-gray-400" />
				</button>

				{/* Emoji Picker as Overlay */}
				{showEmojiPicker.current && (
					<div
						ref={emojiPickerRef}
						className="absolute bottom-full left-0 mb-2 z-50"
					>
						<EmojiPicker
							onEmojiClick={e => setNewMessage(prev => prev + e.emoji)}
							previewConfig={{ showPreview: false }}
						/>
					</div>
				)}

				<input
					type="text"
					className="flex-1 p-2 pl-4 bg-white/20 text-white rounded-full"
					placeholder="Type a message..."
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
				/>
				<button onClick={sendMessage}>
					<PaperAirplaneIcon className="w-5 h-5 cursor-pointer text-white" />
				</button>
			</div>
		</motion.div>
	);
};

export default ChatPanel;
