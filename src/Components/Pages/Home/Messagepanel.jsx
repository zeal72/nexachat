import React, { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import './../../../App.css';
import Header from "./header";
import { useChatStore } from "../../../store/chatstore";
import { auth, database } from "../../../../firebaseConfig";
import { ref, onValue } from "firebase/database";

const MessagePanel = ({ onChatSelect }) => {
	const [search, setSearch] = useState("");
	const [users, setUsers] = useState([]);
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const { setActiveChat } = useChatStore();

	// ✅ Real-time listener for all users (excludes current user)
	useEffect(() => {
		const usersRef = ref(database, "users");
		const unsubscribe = onValue(usersRef, (snapshot) => {
			const usersData = snapshot.val();
			if (usersData) {
				const usersList = Object.keys(usersData).map((key) => ({
					id: usersData[key].uid,
					...usersData[key],
				}));
				const currentUserUid = auth.currentUser?.uid;
				setUsers(usersList.filter((user) => user.uid !== currentUserUid));
			}
			setLoading(false);
		});
		return () => unsubscribe();
	}, []);

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

			<div className="flex-1 space-y-4">
				{users
					.filter(user => user.name?.toLowerCase().includes(search.toLowerCase()))
					.map((user) => (
						<div
							key={user.id}
							onClick={() => handleMessageClick(user)}
							className="flex items-center space-x-3 p-3 hover:bg-white/20 rounded-lg border border-gray-700/30 shadow-sm transition cursor-pointer"
						>
							<img
								src={user.photoURL || "/default-avatar.jpg"}
								alt={user.name}
								className="w-10 h-10 rounded-full object-cover border border-gray-700/30"
							/>
							<div className="flex-1">
								<h4 className="text-white font-semibold">{user.name}</h4>
								<p className="text-sm font-medium text-gray-400">{user.email}</p>
							</div>
						</div>
					))}
			</div>
		</div>
	);
};

export default MessagePanel;
