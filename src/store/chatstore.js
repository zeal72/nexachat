import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
	// Current active chat
	activeChat: null,

	// All messages, keyed by chatId
	messages: {},

	// Actions
	setActiveChat: (chat) => set({ activeChat: chat }),

	addMessage: (message) => {
		set(state => {
			const chatId = message.chatId;
			return {
				messages: {
					...state.messages,
					[chatId]: [...(state.messages[chatId] || []), message],
				},
			};
		});
	},

	getChatMessages: (chatId) => {
		return get().messages[chatId] || [];
	},

	clearMessages: (chatId) => {
		set(state => ({
			messages: {
				...state.messages,
				[chatId]: [],
			},
		}));
	}
}));
