import React, { useState, useEffect, useRef } from "react";
import { PaperAirplaneIcon, FaceSmileIcon, CheckIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { ref, push, onValue } from "firebase/database";
import { auth, database } from "../../../../firebaseConfig";
import { useChatStore } from "../../../store/chatstore";
import { debounce } from 'lodash';

const generateWebSocketURL = (chatId) => `ws://localhost:8080/${chatId}`;

const ChatPanel = ({ chat, onBack, className }) => {
	const [newMessage, setNewMessage] = useState("");
	const [messages, setMessages] = useState([]);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const messagesEndRef = useRef(null);
	const [webSocket, setWebSocket] = useState(null);
	const [typingUsers, setTypingUsers] = useState([]);
	const activeChat = useChatStore((state) => state.activeChat);
	const addMessage = useChatStore((state) => state.addMessage);
	const emojiPickerRef = useRef(null);
	const emojiButtonRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showEmojiPicker &&
				!emojiPickerRef.current?.contains(event.target) &&
				!emojiButtonRef.current?.contains(event.target)) {
				setShowEmojiPicker(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showEmojiPicker]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	useEffect(() => {
		if (!chat?.chatId) return;

		const ws = new WebSocket(generateWebSocketURL(chat.chatId));
		setWebSocket(ws);

		ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				if (message.chatId === chat.chatId) {
					setMessages(prev => [...prev, message]);
					addMessage(message);
				}
			} catch (error) {
				console.error("Message parsing error:", error);
			}
		};

		ws.onclose = () => setWebSocket(null);

		return () => ws.close();
	}, [chat?.chatId]);

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
				setMessages(messagesList);
			}
		});

		return () => unsubscribe();
	}, [chat?.chatId]);

	const sendMessage = async () => {
		if (!chat?.chatId || !newMessage.trim()) return;

		const messageData = {
			id: Date.now().toString(),
			text: newMessage,
			senderId: auth.currentUser?.uid,
			timestamp: Date.now(),
			chatId: chat.chatId,
			status: "sent",
		};

		setMessages((prev) => [...prev, messageData]);
		setNewMessage("");

		try {
			// Send via WebSocket
			if (webSocket?.readyState === WebSocket.OPEN) {
				webSocket.send(JSON.stringify(messageData));
			}

			// Push to Firebase
			const chatMessagesRef = ref(database, `chats/${chat.chatId}/messages`);
			await push(chatMessagesRef, { ...messageData, status: "delivered" });

			// Update message status to delivered
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === messageData.id ? { ...msg, status: "delivered" } : msg
				)
			);
		} catch (error) {
			console.error("Message sending failed:", error);
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
				{messages.map((msg) => (
					<motion.div
						key={msg.id}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className={`flex ${msg.senderId === auth.currentUser?.uid ? "justify-end" : "justify-start"}`}
					>
						<div
							className={`p-3 max-w-xs text-sm rounded-xl shadow-md break-words whitespace-pre-wrap ${msg.senderId === auth.currentUser?.uid
								? "bg-gray-900 text-white"
								: "bg-white/20 text-white"
								}`}
						>
							<p>{msg.text}</p>
							<div className="flex items-center justify-end mt-1 space-x-1">
								<span className="text-xs text-gray-300">
									{new Date(msg.timestamp).toLocaleTimeString()}
								</span>
								{msg.status === "sent" && <CheckIcon className="w-4 h-4 text-gray-400" />}
								{msg.status === "delivered" && (
									<>
										<CheckIcon className="w-4 h-4 text-gray-400" />
										<CheckIcon className="w-4 h-4 text-gray-400" />
									</>
								)}
								{msg.status === "read" && (
									<>
										<CheckIcon className="w-4 h-4 text-blue-400" />
										<CheckIcon className="w-4 h-4 text-blue-400" />
									</>
								)}
							</div>
						</div>
					</motion.div>
				))}


				<div ref={messagesEndRef} />
			</div>...{/* Input Area */}
			{/* Input Area */}
			<div className="pt-3 border-t border-gray-700 flex items-center bg-primary/20 backdrop-blur-md space-x-3 relative">
				{/* Emoji Button */}
				<button
					ref={emojiButtonRef}
					onClick={() => setShowEmojiPicker(!showEmojiPicker)}
					className="p-2 hover:bg-white/10 rounded-full transition"
				>
					<FaceSmileIcon className="w-6 h-6 text-gray-400" />
				</button>

				{/* Emoji Picker */}
				{showEmojiPicker && (
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

				{/* Multi-line Input */}
				<textarea
					className="flex-1 h-10 p-2 pl-4 bg-white/20 text-white rounded-full resize-none overflow-hidden break-words whitespace-pre-wrap focus:outline-none"
					placeholder="Type a message..."
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							sendMessage();
						}
					}}
				/>


				{/* Send Button */}
				<button onClick={sendMessage}>
					<PaperAirplaneIcon className="w-5 h-5 cursor-pointer text-white" />
				</button>
			</div>

		</motion.div>

	);
};

export default ChatPanel;