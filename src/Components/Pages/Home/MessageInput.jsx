import React, { useState, useRef, useEffect } from "react";
import { PaperAirplaneIcon, FaceSmileIcon } from "@heroicons/react/24/outline";
import { ref, push, update, serverTimestamp, get } from "firebase/database";
import { auth, database } from "../../../../firebaseConfig";
import EmojiPicker from "emoji-picker-react";

const MessageInput = ({
	chatId,
	replyingTo,
	webSocket,
	editMessage,
	onReplySent,
	onEditComplete
}) => {
	const [newMessage, setNewMessage] = useState(editMessage ? editMessage.text : "");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const emojiPickerRef = useRef(null);
	const emojiButtonRef = useRef(null);

	// Update message state when editMessage changes
	useEffect(() => {
		// Make sure editMessage updates the input text
		if (editMessage) {
			setNewMessage(editMessage.text);
		} else {
			setNewMessage("");
		}
	}, [editMessage]);

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

	const handleEditMessage = async () => {
		if (!chatId || !newMessage.trim() || !editMessage) return;

		try {
			// Send edit via WebSocket
			if (webSocket?.readyState === WebSocket.OPEN) {
				webSocket.send(JSON.stringify({
					type: 'message_edited',
					messageId: editMessage.id,
					newText: newMessage,
					chatId
				}));
			}

			// We need to find the Firebase key for this message
			const chatMessagesRef = ref(database, `chats/${chatId}/messages`);
			const snapshot = await get(chatMessagesRef);
			const messagesData = snapshot.val();

			// Find the Firebase key by matching the message id
			let firebaseKey = null;
			if (messagesData) {
				for (const key in messagesData) {
					if (messagesData[key].id === editMessage.id) {
						firebaseKey = key;
						break;
					}
				}
			}

			if (firebaseKey) {
				// Now update using the correct Firebase key
				const messageRef = ref(database, `chats/${chatId}/messages/${firebaseKey}`);
				await update(messageRef, {
					text: newMessage,
					edited: true,
					updatedAt: serverTimestamp()
				});

				setNewMessage("");
				onEditComplete(); // Clear edit state
			} else {
				console.error("Could not find Firebase key for message");
			}
		} catch (error) {
			console.error("Message editing failed:", error);
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (editMessage) {
			handleEditMessage();
		} else {
			sendMessage();
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
				placeholder={replyingTo ? "Type your reply..." : editMessage ? "Edit message..." : "Type a message..."}
				value={newMessage}
				onChange={(e) => setNewMessage(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						handleSubmit(e);
					}
				}}
			/>

			{/* Send/Edit Button */}
			<button onClick={handleSubmit}>
				<PaperAirplaneIcon className="w-5 h-5 cursor-pointer text-white" />
			</button>
		</div>
	);
};

export default MessageInput;