// File: ReplyPreview.jsx
import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { auth } from "../../../../firebaseConfig";

const ReplyPreview = ({ replyMessage, chatName, onCancel }) => {
	if (!replyMessage) return null;

	const isOwnMessage = replyMessage.senderId === auth.currentUser?.uid;

	return (
		<div className="bg-gray-800/50 rounded-t-lg p-2 mb-2 border-l-4 border-highlight flex items-start">
			<div className="flex-1 overflow-hidden">
				<div className="text-xs font-medium text-highlight mb-1">
					{isOwnMessage ? "You" : chatName || "User"}
				</div>
				<div className="text-xs text-gray-300 truncate">{replyMessage.text}</div>
			</div>
			<button
				onClick={onCancel}
				className="text-gray-400 hover:text-gray-200 ml-2"
			>
				<XMarkIcon className="w-4 h-4" />
			</button>
		</div>
	);
};

export default ReplyPreview;
