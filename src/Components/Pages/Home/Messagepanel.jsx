import React, { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import './../../../App.css';
import Header from "./header";
import { useChatStore } from "../../../store/chatstore";
import { auth, database } from "../../../../firebaseConfig";
import { ref, onValue } from "firebase/database";
import { useCallback } from "react";

const MessagePanel = ({ onChatSelect }) => {
	const [search, setSearch] = useState("");
	const [users, setUsers] = useState([]);
	const [unreadCounts, setUnreadCounts] = useState({});
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const { setActiveChat } = useChatStore();
	const currentUserUid = auth.currentUser?.uid;

	// Fetch users with realtime updates
	useEffect(() => {
		const usersRef = ref(database, "users");
		const unsubscribe = onValue(usersRef, (snapshot) => {
			const usersData = snapshot.val();
			if (usersData) {
				const usersList = Object.keys(usersData).map((key) => ({
					id: usersData[key].uid,
					...usersData[key],
				}));
				setUsers(usersList.filter((user) => user.uid !== currentUserUid));
			}
			setLoading(false);
		});
		return () => unsubscribe();
	}, [currentUserUid]);

	// Track unread messages
	useEffect(() => {
		if (!currentUserUid) return;

		// Listen to all chats
		const chatsRef = ref(database, "chats");
		const unsubscribe = onValue(chatsRef, (snapshot) => {
			const chatsData = snapshot.val();
			if (!chatsData) return;

			const newUnreadCounts = {};

			// Process each chat
			Object.keys(chatsData).forEach(chatId => {
				const chat = chatsData[chatId];

				// Skip if no messages or not a participant
				if (!chat.messages || !chat.participants?.includes(currentUserUid)) return;

				// Find other participant's ID (for 1:1 chats)
				const otherUserId = chat.participants.find(id => id !== currentUserUid);
				if (!otherUserId) return;

				// Count unread messages
				let unreadCount = 0;
				Object.values(chat.messages).forEach(msg => {
					// Count messages sent by other user and not read by current user
					if (msg.senderId === otherUserId &&
						msg.status !== "read" &&
						!msg.readBy?.includes(currentUserUid)) {
						unreadCount++;
					}
				});

				// Store unread count for this user
				if (unreadCount > 0) {
					newUnreadCounts[otherUserId] = unreadCount;
				}
			});

			setUnreadCounts(newUnreadCounts);
		});

		return () => unsubscribe();
	}, [currentUserUid]);

	const handleMessageClick = async (user) => {
		setActiveChat({
			id: user.uid,
			name: user.name,
			avatar: user.photoURL
		});

		onChatSelect(user);
	};

	return (
		<div className={`p-4 h-screen scroll-smooth overflow-y-auto no-scrollbar border-r border-gray-200 bg-glass-bg backdrop-blur-lg`}>
			<Header className="fixed top-1" />
			<div className="relative mb-4 z-0">
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full p-2 pl-10 bg-white/20 border border-gray-300 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight"
					placeholder="Search users..."
				/>
				<MagnifyingGlassIcon className="absolute left-3 top-2 w-5 h-5 text-gray-400" />
			</div>

			<div className="flex-1 space-y-4 mb-12">
				{users
					.filter(user => user.name?.toLowerCase().includes(search.toLowerCase()))
					.map((user) => (
						<div
							key={user.id}
							onClick={() => handleMessageClick(user)}
							className="flex items-center space-x-3 p-3 hover:bg-white/20 rounded-lg border border-gray-700/30 shadow-sm transition cursor-pointer relative"
						>
							<div className="relative">
								<img
									src={user.photoURL || "/default-avatar.jpg"}
									alt={user.name}
									className="w-10 h-10 rounded-full object-cover border border-gray-700/30"
								/>
								{unreadCounts[user.uid] > 0 && (
									<div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
										{unreadCounts[user.uid] > 9 ? '9+' : unreadCounts[user.uid]}
									</div>
								)}
							</div>
							<div className="flex-1">
								<div className="flex justify-between items-center">
									<h4 className="text-white font-semibold">{user.name}</h4>
									{unreadCounts[user.uid] > 0 && (
										<span className="w-3 h-3 bg-highlight rounded-full"></span>
									)}
								</div>
								<p className="text-sm font-medium text-gray-400">{user.email}</p>
							</div>
						</div>
					))}
			</div>
		</div>
	);
};

export default MessagePanel;