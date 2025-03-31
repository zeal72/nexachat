import React, { useState, useEffect } from "react";
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { firestore, auth } from "../../../../firebaseConfig";
import './../../../App.css';

const DirectoryPanel = ({ onChatSelect, onBack, className, userProfileImage }) => {
	const [search, setSearch] = useState("");
	const [users, setUsers] = useState([]);

	useEffect(() => {
		const usersRef = collection(firestore, "users");
		const q = query(usersRef, where("friends", "array-contains", auth.currentUser?.uid));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetchedUsers = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			setUsers(fetchedUsers);
		});

		return unsubscribe;
	}, []);

	// Filter users based on search input
	const filteredUsers = users.filter((user) =>
		user.name.toLowerCase().includes(search.toLowerCase())
	);

	return (
		<div className={`flex flex-col h-screen py-5 px-2 border-r-gray-200 text-white bg-glass-bg backdrop-blur-lg rounded-xl ${className}`}>
			{/* Search Bar */}
			<div className="relative mb-4 flex gap-2 items-center">
				{/* Profile Image or Default Icon */}
				<div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
					{userProfileImage ? (
						<img
							src={userProfileImage}
							alt="User Profile"
							className="w-full h-full rounded-full object-cover border-dashed border-gray-700/30"
						/>
					) : (
						<UserIcon className="w-6 h-6 text-gray-400" />
					)}
				</div>

				<input
					type="text"
					className="w-full p-2 pl-10 bg-white/20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight"
					placeholder="Search contacts..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<MagnifyingGlassIcon className="absolute left-16 top-4 w-5 h-5 text-gray-400" />
			</div>

			{/* Contacts List */}
			<div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth space-y-4">
				{filteredUsers.map((user) => (
					<Link
						key={user.id}
						to={`/chat/${user.id}`}
						className="flex items-center space-x-3 p-3 hover:bg-white/10 rounded-lg transition"
						onClick={() => onChatSelect(user)}
					>
						<div className="relative w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
							{/* User Avatar or Default Icon */}
							{user.avatar ? (
								<img
									src={user.avatar}
									alt={user.name}
									className="w-full h-full rounded-full object-cover border border-gray-700/30"
								/>
							) : (
								<UserIcon className="w-6 h-6 text-gray-400" />
							)}
							{user.online && (
								<span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border border-white rounded-full"></span>
							)}
						</div>
						<div>
							<h4 className="text-white font-semibold">{user.name}</h4>
							<span className="text-gray-400 text-sm">{user.online ? "Online" : "Offline"}</span>
						</div>
					</Link>
				))}
			</div>

			{/* Back Button */}
			<button
				className="fixed top-0 lg:hidden left-0 p-2 bg-highlight rounded-lg hover:bg-highlight/80 transition"
				onClick={onBack}
			>
				<XMarkIcon className="w-5 h-5 text-white" />
			</button>
		</div>
	);
};

export default DirectoryPanel;
