// File: MessageInput.jsx
import React, { useState, useRef, useEffect } from "react";
import { PaperAirplaneIcon, FaceSmileIcon } from "@heroicons/react/24/outline";
import { ref, push, update } from "firebase/database";
import { auth, database } from "../../../../firebaseConfig";
import EmojiPicker from "emoji-picker-react";

const MessageInput = ({ chatId, replyingTo, webSocket, onReplySent }) => {
	const [newMessage, setNewMessage] = useState("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

	const sendMessage = async () => {
		if (!chatId || !newMessage.trim()) return;

		const messageData = {
			id: Date.now().toString(),
			text: newMessage,
			senderId: auth.currentUser?.uid,
			timestamp: Date.now(),
			chatId: chatId,
			status: "sent",
			readBy: [auth.currentUser?.uid], // Sender has automatically read their own message
			// Include reply data if replying to a message
			replyTo: replyingTo ? {
				id: replyingTo.id,
				text: replyingTo.text,
				senderId: replyingTo.senderId
			} : null
		};

		setNewMessage("");
		if (onReplySent) onReplySent(); // Clear reply state

		try {
			// Send via WebSocket
			if (webSocket?.readyState === WebSocket.OPEN) {
				webSocket.send(JSON.stringify(messageData));
			}

			// Push to Firebase
			const chatMessagesRef = ref(database, `chats/${chatId}/messages`);
			const newMessageRef = await push(chatMessagesRef, { ...messageData, status: "delivered" });

			// Update message status to delivered
			await update(ref(database, `chats/${chatId}/messages/${newMessageRef.key}`), {
				status: "delivered"
			});
		} catch (error) {
			console.error("Message sending failed:", error);
		}
	};

	return (
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
	);
};

export default MessageInput;