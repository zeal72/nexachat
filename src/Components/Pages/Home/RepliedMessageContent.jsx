
// File: RepliedMessageContent.jsx
import React from "react";

const RepliedMessageContent = ({ replyData, currentUserId, chatName }) => {
	if (!replyData) return null;

	const isOwnReply = replyData.senderId === currentUserId;

	return (
		<div className="bg-gray-800/30 rounded p-1 mb-1 border-l-2 border-highlight">
			<div className="text-xs font-medium text-highlight">
				{isOwnReply ? "You" : chatName || "User"}
			</div>
			<div className="text-xs text-gray-300 truncate">{replyData.text}</div>
		</div>
	);
};

export default RepliedMessageContent;
