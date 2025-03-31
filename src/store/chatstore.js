// store/chatStore.js
import { create } from 'zustand';

export const useChatStore = create((set) => ({
	// Current active chat
	activeChat: null,

	// All messages in active chat
	messages: [],

	// Actions
	setActiveChat: (chat) => set({ activeChat: chat }),
	addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
	clearMessages: () => set({ messages: [] })
}));
