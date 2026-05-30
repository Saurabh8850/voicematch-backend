import { create } from "zustand";
import * as api from "../services/api";

export const useSwipeStore = create((set, get) => ({
  feedUsers: [],
  currentIndex: 0,
  isLoading: false,

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

    const response = await api.swipeAction(targetUserId, direction);

    set({
      feedUsers: feedUsers.filter((user) => user.id !== targetUserId),
      currentIndex: Math.min(currentIndex, Math.max(feedUsers.length - 2, 0)),
    });

    if (response?.data?.matched) {
      return { matched: true, matchId: response.data.matchId };
    }
    return { matched: false };
  },

  resetFeed: () => set({ feedUsers: [], currentIndex: 0 }),
}));
