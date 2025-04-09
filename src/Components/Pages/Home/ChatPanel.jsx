import React, { useState, useEffect, useRef } from "react";
import {
	PaperAirplaneIcon,
	FaceSmileIcon,
	CheckIcon,
	UserIcon,
	XMarkIcon,
	ArrowUturnLeftIcon,
	ChevronDownIcon
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { ref, push, onValue, update } from "firebase/database";
import { auth, database } from "../../../../firebaseConfig";
import { useChatStore } from "../../../store/chatstore";
import { debounce } from 'lodash';

const generateWebSocketURL = (chatId) => `ws://localhost:8080/${chatId}`;

const ChatPanel = ({ chat, onBack, className }) => {
	const [newMessage, setNewMessage] = useState("");
	const [messages, setMessages] = useState([]);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [replyingTo, setReplyingTo] = useState(null); // Track which message is being replied to
	const messagesEndRef = useRef(null);
	const [webSocket, setWebSocket] = useState(null);
	const [typingUsers, setTypingUsers] = useState([]);
	const activeChat = useChatStore((state) => state.activeChat);
	const addMessage = useChatStore((state) => state.addMessage);
	const emojiPickerRef = useRef(null);
	const emojiButtonRef = useRef(null);
	const messageRefs = useRef({});
	const [swipeState, setSwipeState] = useState({ isActive: false, startX: 0, offsetX: 0, msgId: null });

	// Custom Message Status Component
	const MessageStatus = ({ status, readBy = [] }) => {
		// Determine if the message has been read by all participants except sender
		const isRead = status === "read" ||
			(readBy.length > 1 && chat?.members?.every(memberId =>
				memberId === auth.currentUser?.uid || readBy.includes(memberId)
			));

		// Style for checkmarks - blue if read, gray if not
		const checkColor = isRead ? "text-blue-500" : "text-gray-400";

		// For single check (sent/delivered)
		if (status === "sent") {
			return (
				<div className="flex -space-x-1">
					<CheckIcon className="w-3.5 h-3.5 text-gray-400" />
				</div>
			);
		}
		return (
			<div className="flex -space-x-1">
				<CheckIcon className={`w-3.5 h-3.5 ${checkColor}`} />
				<CheckIcon className={`w-3.5 h-3.5 ${checkColor}`} />
			</div>
		);
	};

	// Touch handlers for swipe to reply (mobile)
	const handleTouchStart = (e, msgId) => {
		setSwipeState({
			isActive: true,
			startX: e.touches[0].clientX,
			offsetX: 0,
			msgId
		});
	};

	const handleTouchMove = (e) => {
		if (!swipeState.isActive) return;

		const currentX = e.touches[0].clientX;
		const offsetX = currentX - swipeState.startX;

		// Only allow right swipe (positive offset) up to 100px
		if (offsetX > 0) {
			setSwipeState(prev => ({
				...prev,
				offsetX: Math.min(offsetX, 100)
			}));
		}
	};

	const handleTouchEnd = () => {
		// If swiped more than 50px to the right, trigger reply
		if (swipeState.offsetX > 50) {
			const messageToReply = messages.find(msg => msg.id === swipeState.msgId);
			if (messageToReply) {
				setReplyingTo(messageToReply);
			}
		}

		// Reset swipe state
		setSwipeState({ isActive: false, startX: 0, offsetX: 0, msgId: null });
	};

	// Handle reply selection (desktop)
	const handleMessageClick = (msg) => {
		// Toggle reply - if clicking the same message, cancel reply
		setReplyingTo(replyingTo?.id === msg.id ? null : msg);
	};

	// Cancel reply
	const cancelReply = () => {
		setReplyingTo(null);
	};

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

	// Mark messages as read
	useEffect(() => {
		if (!chat?.chatId || !auth.currentUser?.uid) return;

		const chatMessagesRef = ref(database, `chats/${chat.chatId}/messages`);

		const unsubscribe = onValue(chatMessagesRef, (snapshot) => {
			const messagesData = snapshot.val();
			if (!messagesData) return;

			const currentUserId = auth.currentUser.uid;
			const updatePromises = [];

			Object.keys(messagesData).forEach(messageId => {
				const message = messagesData[messageId];

				if (message.senderId !== currentUserId &&
					message.status !== "read" &&
					(!message.readBy || !message.readBy.includes(currentUserId))) {

					const readBy = message.readBy ? [...message.readBy] : [];
					if (!readBy.includes(currentUserId)) {
						readBy.push(currentUserId);
					}

					const messageRef = ref(database, `chats/${chat.chatId}/messages/${messageId}`);
					updatePromises.push(update(messageRef, {
						status: "read",
						readBy: readBy
					}));
				}
			});

			Promise.all(updatePromises).catch(error => {
				console.error("Error marking messages as read:", error);
			});
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

	// Send message with reply information
	const sendMessage = async () => {
		if (!chat?.chatId || !newMessage.trim()) return;

		const messageData = {
			id: Date.now().toString(),
			text: newMessage,
			senderId: auth.currentUser?.uid,
			timestamp: Date.now(),
			chatId: chat.chatId,
			status: "sent",
			readBy: [auth.currentUser?.uid],
			// Include reply data if replying to a message
			replyTo: replyingTo ? {
				id: replyingTo.id,
				text: replyingTo.text,
				senderId: replyingTo.senderId
			} : null
		};

		setMessages((prev) => [...prev, messageData]);
		setNewMessage("");
		setReplyingTo(null); // Clear reply state after sending

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

	// Component to display the reply preview
	const ReplyPreview = ({ replyMessage }) => {
		if (!replyMessage) return null;

		const isOwnMessage = replyMessage.senderId === auth.currentUser?.uid;

		return (
			<div className="bg-gray-800/50 rounded-t-lg p-2 mb-2 border-l-4 border-highlight flex items-start">
				<div className="flex-1 overflow-hidden">
					<div className="text-xs font-medium text-highlight mb-1">
						{isOwnMessage ? "You" : chat?.userName || "User"}
					</div>
					<div className="text-xs text-gray-300 truncate">{replyMessage.text}</div>
				</div>
				<button
					onClick={cancelReply}
					className="text-gray-400 hover:text-gray-200 ml-2"
				>
					<XMarkIcon className="w-4 h-4" />
				</button>
			</div>
		);
	};

	// Component to display a replied message in the conversation
	const RepliedMessageContent = ({ replyData }) => {
		if (!replyData) return null;

		const isOwnReply = replyData.senderId === auth.currentUser?.uid;

		return (
			<div className="bg-gray-800/30 rounded p-1 mb-1 border-l-2 border-highlight">
				<div className="text-xs font-medium text-highlight">
					{isOwnReply ? "You" : chat?.userName || "User"}
				</div>
				<div className="text-xs text-gray-300 truncate">{replyData.text}</div>
			</div>
		);
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
					onClick={onBack}
				>
					<XMarkIcon className="w-5 h-5 text-white" />
				</button>
			</div>

			{/* Messages Display */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
				{messages.map((msg) => {
					const isSentByMe = msg.senderId === auth.currentUser?.uid;

					// Calculate transform for swipe animation
					const messageTransform = swipeState.isActive && swipeState.msgId === msg.id
						? `translateX(${swipeState.offsetX}px)`
						: 'translateX(0px)';

					return (
						<motion.div
							key={msg.id}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className={`flex ${isSentByMe ? "justify-end" : "justify-start"} group`}
							ref={el => messageRefs.current[msg.id] = el}
						>
							{/* Reply action indicator visible during swipe */}
							{!isSentByMe && swipeState.msgId === msg.id && swipeState.offsetX > 20 && (
								<div
									className="absolute left-0 flex items-center justify-center text-highlight"
									style={{ opacity: Math.min(swipeState.offsetX / 100, 1) }}
								>
									<ArrowUturnLeftIcon className="w-5 h-5 mr-1" />
									<span className="text-xs font-medium">Reply</span>
								</div>
							)}

							<div
								className={`p-3 max-w-xs text-sm rounded-xl shadow-md break-words whitespace-pre-wrap cursor-pointer
                  ${isSentByMe ? "bg-gray-900 text-white" : "bg-white/20 text-white"}`}
								style={{ transform: messageTransform, transition: swipeState.isActive ? 'none' : 'transform 0.2s ease' }}
								onClick={() => handleMessageClick(msg)}
								onTouchStart={(e) => handleTouchStart(e, msg.id)}
								onTouchMove={handleTouchMove}
								onTouchEnd={handleTouchEnd}
								onTouchCancel={handleTouchEnd}
							>
								{/* Show reply content if this message is a reply */}
								{msg.replyTo && <RepliedMessageContent replyData={msg.replyTo} />}

								<p>{msg.text}</p>

								{isSentByMe && (
									<div className="flex items-center justify-end mt-1 space-x-2">
										<span className="text-xs text-gray-300">
											{new Date(msg.timestamp).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit'
											})}
										</span>
										<MessageStatus status={msg.status} readBy={msg.readBy} />
									</div>
								)}

								{!isSentByMe && (
									<div className="flex items-center justify-end mt-1">
										<span className="text-xs text-gray-300">
											{new Date(msg.timestamp).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit'
											})}
										</span>
									</div>
								)}

								{/* Desktop reply button - visible on hover */}
								<div className={`absolute ${isSentByMe ? "left-0 -translate-x-full" : "right-0 translate-x-full"} 
                  top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
									<button
										className="bg-gray-800 text-white rounded-full p-1 hover:bg-highlight transition"
										onClick={(e) => {
											e.stopPropagation();
											setReplyingTo(msg);
										}}
									>
										<ArrowUturnLeftIcon className="w-4 h-4" />
									</button>
								</div>
							</div>
						</motion.div>
					);
				})}
				<div ref={messagesEndRef} />
			</div>

			{/* Input Area with Reply Preview */}
			<div className="pt-3 border-t border-gray-700 flex flex-col bg-primary/20 backdrop-blur-md relative">
				{/* Reply preview */}
				{replyingTo && (
					<div className="px-3 mb-2">
						<ReplyPreview replyMessage={replyingTo} />
					</div>
				)}

				{/* Message input controls */}
				<div className="flex items-center space-x-3 px-3 pb-3">
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
						placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
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
			</div>
		</motion.div>
	);
};

export default ChatPanel;