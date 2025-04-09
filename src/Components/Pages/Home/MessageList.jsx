// File: MessageList.jsx
import React, { useState, useRef } from "react";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import MessageStatus from "./MessageStatus";
import RepliedMessageContent from "./RepliedMessageContent";

const MessageList = ({ messages, currentUserId, chatName, onReply }) => {
	const messageRefs = useRef({});
	const [swipeState, setSwipeState] = useState({
		isActive: false,
		startX: 0,
		offsetX: 0,
		msgId: null
	});

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
				onReply(messageToReply);
			}
		}

		// Reset swipe state
		setSwipeState({ isActive: false, startX: 0, offsetX: 0, msgId: null });
	};

	return (
		<>
			{messages.map((msg) => {
				const isSentByMe = msg.senderId === currentUserId;

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
							onClick={() => onReply(msg)}
							onTouchStart={(e) => handleTouchStart(e, msg.id)}
							onTouchMove={handleTouchMove}
							onTouchEnd={handleTouchEnd}
							onTouchCancel={handleTouchEnd}
						>
							{/* Show reply content if this message is a reply */}
							{msg.replyTo && (
								<RepliedMessageContent
									replyData={msg.replyTo}
									currentUserId={currentUserId}
									chatName={chatName}
								/>
							)}

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
										onReply(msg);
									}}
								>
									<ArrowUturnLeftIcon className="w-4 h-4" />
								</button>
							</div>
						</div>
					</motion.div>
				);
			})}
		</>
	);
};

export default MessageList;