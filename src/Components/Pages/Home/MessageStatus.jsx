
// File: MessageStatus.jsx
import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { auth } from "../../../../firebaseConfig";

const MessageStatus = ({ status, readBy = [], members = [] }) => {
	// Determine if the message has been read by all participants except sender
	const isRead = status === "read" ||
		(readBy.length > 1 && members.every(memberId =>
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

export default MessageStatus;