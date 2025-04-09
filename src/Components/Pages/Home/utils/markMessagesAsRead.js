// File: utils/markMessagesAsRead.js
import { ref, update } from "firebase/database";
import { database } from "../../../../../firebaseConfig";

const markMessagesAsRead = (messagesData, chatId, currentUserId) => {
	const updatePromises = [];

	// Go through each message and mark as read if from the other person
	Object.keys(messagesData).forEach(messageId => {
		const message = messagesData[messageId];

		// Only update messages from other users that haven't been read by current user
		if (message.senderId !== currentUserId &&
			message.status !== "read" &&
			(!message.readBy || !message.readBy.includes(currentUserId))) {

			// Create a new readBy array or update existing one
			const readBy = message.readBy ? [...message.readBy] : [];
			if (!readBy.includes(currentUserId)) {
				readBy.push(currentUserId);
			}

			// Update the message in Firebase
			const messageRef = ref(database, `chats/${chatId}/messages/${messageId}`);
			updatePromises.push(update(messageRef, {
				status: "read",
				readBy: readBy
			}));
		}
	});

	// Execute all updates
	Promise.all(updatePromises).catch(error => {
		console.error("Error marking messages as read:", error);
	});
};

export default markMessagesAsRead;