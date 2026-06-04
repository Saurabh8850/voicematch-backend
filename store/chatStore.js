import { create } from "zustand";
import * as api from "../services/api";

export const useChatStore = create((set, get) => ({
  messages: {},
  isLoading: false,

  loadMessages: async (matchId) => {
    set({ isLoading: true });
    try {
      const response = await api.getMessages(matchId);
      set((state) => ({
        messages: {
          ...state.messages,
          [matchId]: response.data?.messages || [],
        },
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addMessage: (matchId, message) => {
    set((state) => {
      const existing = state.messages[matchId] || [];
      const alreadyExists = existing.some((item) => item.id === message.id);
      if (alreadyExists) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [matchId]: [message, ...existing],
        },
      };
    });
  },

  sendMessage: async (matchId, content) => {
    try {
      const response = await api.sendMessage(matchId, content);
      const message = response.data?.message;
      if (message) {
        get().addMessage(matchId, message);
      }
      return message;
    } catch (error) {
      throw error;
    }
  },
}));
