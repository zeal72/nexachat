// File: ChatPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon, UserIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { ref, onValue } from "firebase/database";
import { auth, database } from "../../../../firebaseConfig";
import { useChatStore } from "../../../store/chatstore";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ReplyPreview from "./ReplyPreview";
import markMessagesAsRead from "./utils/markMessagesAsRead"; // ✅ Move this to the top
import { generateWebSocketURL } from "././utils/websocket";

const ChatPanel = ({ chat, onBack, className }) => {
	const [messages, setMessages] = useState([]);
	const [replyingTo, setReplyingTo] = useState(null);
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
					setMessages(prev => [...prev, message]);
					addMessage(message);
				}
			} catch (error) {
				console.error("Message parsing error:", error);
			}
		};

		ws.onclose = () => setWebSocket(null);

		return () => ws.close();
	}, [chat?.chatId, addMessage]);

	// Mark messages as read
	useEffect(() => {
		if (!chat?.chatId || !auth.currentUser?.uid) return;

		const chatMessagesRef = ref(database, `chats/${chat.chatId}/messages`);
		// import markMessagesAsRead from './utils/markMessagesAsRead';
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
				setMessages(messagesList);
			}
		});

		return () => unsubscribe();
	}, [chat?.chatId]);

	// Cancel reply
	const cancelReply = () => {
		setReplyingTo(null);
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
					chatName={chat?.userName}
					onReply={setReplyingTo}
				/>
				<div ref={messagesEndRef} />
			</div>

			{/* Input Area with Reply Preview */}
			<div className="pt-3 border-t border-gray-700 flex flex-col bg-primary/20 backdrop-blur-md relative">
				{/* Reply preview */}
				{replyingTo && (
					<div className="px-3 mb-2">
						<ReplyPreview
							replyMessage={replyingTo}
							chatName={chat?.userName}
							onCancel={cancelReply}
						/>
					</div>
				)}

				{/* Message input controls */}
				<MessageInput
					chatId={chat?.chatId}
					replyingTo={replyingTo}
					webSocket={webSocket}
					onReplySent={cancelReply}
				/>
			</div>
		</motion.div>
	);
};

// Chat Header Component
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