import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MessagePanel from './MessagePanel';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import DirectoryPanel from './DirectoryPanel';
import { auth, database } from '../../../../firebaseConfig';
import { ref, set, get, push, onValue, serverTimestamp } from 'firebase/database';
import './../../../App.css';

const Home = () => {
	const [activeScreen, setActiveScreen] = useState('messages');
	const [selectedChat, setSelectedChat] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [chats, setChats] = useState([]);
	const [isMobile, setIsMobile] = useState(window.innerWidth < 800);
	const navigate = useNavigate();

	// Update screen size dynamically
	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 800);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Fetch all chats for current user
	const GetChats = useCallback((user) => {
		if (!user) return;

		const chatsRef = ref(database, 'chats');
		const unsubscribeChats = onValue(chatsRef, (snapshot) => {
			try {
				const fetchedChats = [];
				snapshot.forEach((child) => {
					const chat = child.val();
					if (chat?.participants?.includes(user.uid)) {
						fetchedChats.push({ id: child.key, ...chat });
					}
				});
				setChats(fetchedChats);
			} catch (error) {
				console.error('Error fetching chats:', error);
			}
		});

		return () => unsubscribeChats();
	}, []);

	// Unified chat creation/handling logic
	const onStartChat = async (selectedUser) => {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) throw new Error('User not authenticated');

			const userId = currentUser.uid;
			const selectedUserId = selectedUser.uid;

			const chatsRef = ref(database, 'chats');
			const snapshot = await get(chatsRef);

			let chatId = null;
			snapshot.forEach((child) => {
				const chat = child.val();
				if (chat.participants?.includes(userId) && chat.participants?.includes(selectedUserId)) {
					chatId = child.key;
				}
			});

			if (!chatId) {
				const newChatRef = push(chatsRef);
				chatId = newChatRef.key;
				await set(newChatRef, {
					participants: [userId, selectedUserId],
					createdAt: serverTimestamp(),
					type: 'personal',
					members: [userId, selectedUserId]
				});
			}

			setSelectedChat({
				chatId,
				userName: selectedUser.name,
				userProfilePicture: selectedUser.photoURL,
				type: 'personal',
				members: [userId, selectedUserId]
			});

		} catch (error) {
			console.error('Chat initialization error:', error);
		}
	};

	// Auth state handler
	useEffect(() => {
		const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
			try {
				setCurrentUser(user);
				if (user) {
					await set(ref(database, `users/${user.uid}`), {
						uid: user.uid,
						email: user.email,
						name: user.displayName,
						photoURL: user.photoURL
					});
					GetChats(user);
				}
			} catch (error) {
				console.error('Auth state error:', error);
			}
		});

		return () => unsubscribeAuth();
	}, [GetChats]);

	// Navigation guard
	if (!currentUser) {
		navigate('/signin');
		return null;
	}

	// Handles chat selection
	const handleChatSelect = async (user) => {
		await onStartChat(user);
		if (isMobile) {
			setActiveScreen('chat');
		}
	};

	return (
		<div className="overflow-x-hidden relative flex-col lg:flex-row h-screen bg-cover bg-center backdrop-blur-xl inset-0 bg-white/10 bg-no-repeat bg-fixed home-background">
			{/* Mobile Navigation */}
			{activeScreen === 'messages' && isMobile && (
				<div className="lg:hidden fixed bottom-0 left-0 w-full bg-primary flex justify-around items-center p-3 z-50">
					<Sidebar onScreenChange={setActiveScreen} activeScreen={activeScreen} />
				</div>
			)}

			{/* Main Content */}
			<div className="flex-1 flex flex-col lg:flex-row h-full">
				{/* Desktop Layout */}
				{!isMobile && (
					<div className="hidden lg:flex lg:flex-row h-full w-full">
						<MessagePanel onChatSelect={handleChatSelect} className="flex-1 basis-1/4" />
						{selectedChat && (
							<ChatPanel
								chat={selectedChat}
								onBack={() => setActiveScreen('messages')}
								className="flex-1 basis-1/2"
							/>
						)}
						<DirectoryPanel
							onChatSelect={handleChatSelect}
							userProfileImage={currentUser?.photoURL}
							className="flex-1 basis-1/4"
						/>
					</div>
				)}

				{/* Mobile Layout */}
				{isMobile && (
					<div className="lg:hidden flex-1 overflow-y-auto">
						{activeScreen === 'messages' && <MessagePanel onChatSelect={handleChatSelect} />}
						{activeScreen === 'chat' && selectedChat && (
							<ChatPanel
								chat={selectedChat}
								onBack={() => setActiveScreen('messages')}
							/>
						)}
						{activeScreen === 'directory' && (
							<DirectoryPanel onChatSelect={handleChatSelect} />
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default Home;