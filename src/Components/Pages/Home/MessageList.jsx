import React, { useState, useRef, useEffect } from "react";
import ReactDOM from 'react-dom';
import { ArrowUturnLeftIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import MessageStatus from "./MessageStatus";
import RepliedMessageContent from "./RepliedMessageContent";

const MessageList = ({
	messages,
	currentUserId,
	chatId,
	chatName,
	onReply,
	onEdit,
	onDelete,
	webSocket
}) => {
	const [contextMenu, setContextMenu] = useState({
		visible: false,
		x: 0,
		y: 0,
		message: null
	});

	const [editingMessageId, setEditingMessageId] = useState(null);
	const [editedText, setEditedText] = useState('');

	const messageRefs = useRef({});
	const [swipeState, setSwipeState] = useState({
		isActive: false,
		startX: 0,
		offsetX: 0,
		msgId: null
	});
	const [deleteConfirmModal, setDeleteConfirmModal] = useState({
		visible: false,
		message: null
	});
	const handleDeleteClick = (message) => {
		closeContextMenu();
		setDeleteConfirmModal({
			visible: true,
			message
		});
	};
	const confirmDelete = () => {
		if (deleteConfirmModal.message) {
			onDelete(deleteConfirmModal.message);
			setDeleteConfirmModal({ visible: false, message: null });
		}
	};

	const cancelDelete = () => {
		setDeleteConfirmModal({ visible: false, message: null });
	};

	// Context menu handlers
	const handleMessageAction = (e, message) => {
		e.preventDefault();
		e.stopPropagation();

		const isTouch = e.type === 'touchstart';
		const posX = isTouch ? e.touches[0].clientX : e.clientX;
		const posY = isTouch ? e.touches[0].clientY : e.clientY;

		setContextMenu({
			visible: true,
			x: posX,
			y: posY,
			message
		});
	};

	const closeContextMenu = () => {
		setContextMenu({ visible: false, x: 0, y: 0, message: null });
	};

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (!e.target.closest('.context-menu')) {
				closeContextMenu();
			}
		};

		window.addEventListener('click', handleClickOutside);
		window.addEventListener('contextmenu', handleClickOutside);

		return () => {
			window.removeEventListener('click', handleClickOutside);
			window.removeEventListener('contextmenu', handleClickOutside);
		};
	}, []);

	// Swipe handlers
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
		const offsetX = e.touches[0].clientX - swipeState.startX;
		setSwipeState(prev => ({ ...prev, offsetX: Math.min(offsetX, 100) }));
	};

	const handleTouchEnd = () => {
		if (swipeState.offsetX > 50) {
			const message = messages.find(msg => msg.id === swipeState.msgId);
			message && onReply(message);
		}
		setSwipeState({ isActive: false, startX: 0, offsetX: 0, msgId: null });
	};

	// Message action handlers
	const handleAction = (action, message) => {
		closeContextMenu();
		action(message);
	};

	// Long press handling for mobile
	const [pressTimer, setPressTimer] = useState(null);

	const startPress = (e, msg) => {
		e.preventDefault();
		const timer = setTimeout(() => {
			handleMessageAction(e, msg);
		}, 500);
		setPressTimer(timer);
	};

	const cancelPress = () => {
		if (pressTimer) {
			clearTimeout(pressTimer);
			setPressTimer(null);
		}
	};

	// Edit message handlers
	const handleEdit = (message) => {
		setEditingMessageId(message.id);
		setEditedText(message.text);
	};

	const handleSaveEdit = async (message) => {
		if (!chatId || !editedText.trim()) return;

		try {
			// Send edit via WebSocket
			if (webSocket?.readyState === WebSocket.OPEN) {
				webSocket.send(JSON.stringify({
					type: 'message_edited',
					messageId: message.id,
					newText: editedText,
					chatId
				}));
			}

			// Update the message in the UI via the parent component
			onEdit({
				...message,
				text: editedText,
				edited: true,
				updatedAt: new Date().toISOString()
			});

			setEditingMessageId(null);
		} catch (error) {
			console.error("Message editing failed:", error);
		}
	};

	const handleCancelEdit = () => {
		setEditingMessageId(null);
	};

	return (
		<>
			{/* Context Menu Portal */}
			{contextMenu.visible && ReactDOM.createPortal(
				<div
					className="context-menu fixed z-[9999] bg-gray-800 rounded-lg p-2 shadow-xl"
					style={{
						left: Math.min(contextMenu.x + 10, window.innerWidth - 200),
						top: Math.min(contextMenu.y - 10, window.innerHeight - 150),
						transform: 'none'
					}}
				>
					<div className="flex flex-col space-y-2 text-white text-sm">
						{contextMenu.message?.senderId === currentUserId && (
							<>
								<button
									className="flex items-center px-4 py-2 hover:bg-gray-700 rounded"
									onClick={(e) => {
										e.stopPropagation();
										handleAction(handleEdit, contextMenu.message);
									}}
								>
									<PencilIcon className="w-4 h-4 mr-2" />
									Edit
								</button>
								<button
									className="flex items-center px-4 py-2 hover:bg-gray-700 rounded text-red-400"
									onClick={(e) => {
										e.stopPropagation();
										handleAction(onDelete, contextMenu.message);
									}}
								>
									<TrashIcon className="w-4 h-4 mr-2" />
									Delete
								</button>
							</>
						)}
						<button
							className="flex items-center px-4 py-2 hover:bg-gray-700 rounded"
							onClick={(e) => {
								e.stopPropagation();
								handleAction(onReply, contextMenu.message);
							}}
						>
							<ArrowUturnLeftIcon className="w-4 h-4 mr-2" />
							Reply
						</button>
					</div>
				</div>,
				document.body
			)}

			{/* Messages List */}
			{messages.map((msg) => {
				const isSentByMe = msg.senderId === currentUserId;
				const isDeleted = !!msg.deleted;
				const isEdited = !!msg.edited && !isDeleted;
				const isBeingEdited = editingMessageId === msg.id;

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
						{/* Swipe Indicator */}
						{!isSentByMe && swipeState.msgId === msg.id && swipeState.offsetX > 20 && (
							<div
								className="absolute left-0 flex items-center justify-center text-highlight"
								style={{ opacity: Math.min(swipeState.offsetX / 100, 1) }}
							>
								<ArrowUturnLeftIcon className="w-5 h-5 mr-1" />
								<span className="text-xs font-medium">Reply</span>
							</div>
						)}

						{/* Message Bubble */}
						<div
							className={`p-3 max-w-xs text-sm rounded-xl shadow-md break-words whitespace-pre-wrap cursor-pointer
                ${isDeleted ? 'opacity-50 italic' : ''} 
                ${isSentByMe ? "bg-gray-900 text-white" : "bg-white/20 text-white"}`}
							style={{
								transform: messageTransform,
								transition: swipeState.isActive ? 'none' : 'transform 0.2s ease'
							}}
							onClick={() => !isDeleted && onReply(msg)}
							onContextMenu={(e) => !isDeleted && handleMessageAction(e, msg)}
							onTouchStart={(e) => {
								if (!isDeleted) {
									e.currentTarget.style.backgroundColor = isSentByMe ? '#1a1a1a' : '#ffffff15';
									startPress(e, msg);
									handleTouchStart(e, msg.id);
								}
							}}
							onTouchEnd={(e) => {
								e.currentTarget.style.backgroundColor = '';
								cancelPress();
								handleTouchEnd();
							}}
							onTouchCancel={cancelPress}
							onTouchMove={!isDeleted ? handleTouchMove : undefined}
						>
							{/* Reply Preview */}
							{msg.replyTo && !isDeleted && (
								<RepliedMessageContent
									replyData={msg.replyTo}
									currentUserId={currentUserId}
									chatName={chatName}
								/>
							)}

							{/* Message Content */}
							{isDeleted ? (
								<p className="italic">Message deleted</p>
							) : isBeingEdited ? (
								<>
									<textarea
										className="w-full p-2 bg-gray-700 text-white rounded"
										value={editedText}
										onChange={(e) => setEditedText(e.target.value)}
										autoFocus
									/>
									<div className="flex justify-end space-x-2 mt-1">
										<button
											className="px-3 py-1 bg-green-500 text-white rounded"
											onClick={() => handleSaveEdit(msg)}
										>
											Save
										</button>
										<button
											className="px-3 py-1 bg-gray-500 text-white rounded"
											onClick={handleCancelEdit}
										>
											Cancel
										</button>
									</div>
								</>
							) : (
								<>
									<p>{msg.text}</p>
									{isEdited && (
										<span className="text-xs text-gray-300 ml-2">(edited)</span>
									)}
								</>
							)}

							{/* Message Metadata */}
							<div className="flex items-center justify-end mt-1 space-x-2">
								{msg.timestamp && (
									<span className="text-xs text-gray-300">
										{new Date(msg.timestamp).toLocaleTimeString([], {
											hour: '2-digit',
											minute: '2-digit'
										})}
									</span>
								)}
								{isSentByMe && !isDeleted && (
									<MessageStatus status={msg.status} readBy={msg.readBy} />
								)}
							</div>

							{/* Desktop Reply Button */}
							{!isDeleted && (
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
							)}
						</div>

						{deleteConfirmModal.visible && ReactDOM.createPortal(
							<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
								<div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
									<h3 className="text-white text-lg font-medium mb-4">Delete Message</h3>
									<p className="text-gray-200 mb-6">Are you sure you want to delete this message? This action cannot be undone.</p>
									<div className="flex justify-end space-x-3">
										<button
											className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
											onClick={cancelDelete}
										>
											Cancel
										</button>
										<button
											className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
											onClick={confirmDelete}
										>
											Delete
										</button>
									</div>
								</div>
							</div>,
							document.body
						)}

					</motion.div>
				);
			})}
		</>
	);
};

export default MessageList;