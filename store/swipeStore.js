import { create } from "zustand";
import * as api from "../services/api";

export const useSwipeStore = create((set, get) => ({
  feedUsers: [],
  currentIndex: 0,
  isLoading: false,
  limitError: null,

  loadFeed: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getFeed();
      const users = response?.data?.users ?? response?.users ?? [];

      set({
        feedUsers: users,
        currentIndex: 0,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  swipeAction: async (targetUserId, direction) => {
    const { feedUsers, currentIndex } = get();

    try {
      const response = await api.swipeAction(targetUserId, direction);

      set({
        feedUsers: feedUsers.filter((user) => user.id !== targetUserId),
        currentIndex: Math.min(currentIndex, Math.max(feedUsers.length - 2, 0)),
        limitError: null,
      });

      if (response?.data?.matched) {
        return { matched: true, matchId: response.data.matchId };
      }
      return { matched: false };
    } catch (error) {
      // Check if it's a 402 limit error
      if (error.response?.status === 402) {
        const errorData = error.response?.data;
        set({
          limitError: {
            code: errorData?.code,
            message: errorData?.message,
            resetsIn: errorData?.resetsIn,
          }
        });
        throw error;
      }
      throw error;
    }
  },

  clearLimitError: () => set({ limitError: null }),
  resetFeed: () => set({ feedUsers: [], currentIndex: 0, limitError: null }),
}));

