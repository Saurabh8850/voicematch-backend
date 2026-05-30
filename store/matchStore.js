import { create } from "zustand";
import * as api from "../services/api";

function normalizeMatch(match) {
  if (!match) {
    return null;
  }
  return {
    ...match,
    matched_at: match.matched_at || match.matchedAt,
    matchedAt: match.matchedAt || match.matched_at,
    otherUser: match.otherUser || null,
    lastMessage: match.lastMessage || null,
  };
}

export const useMatchStore = create((set, get) => ({
  matches: [],
  isLoading: false,

  loadMatches: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getMatches();
      const raw = response?.data?.matches ?? response?.matches ?? [];
      const matches = raw.map(normalizeMatch).filter(Boolean);
      set({ matches, isLoading: false });
      return matches;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addMatch: (matchEntry) => {
    const normalized = normalizeMatch(matchEntry);
    if (!normalized?.id) {
      return;
    }
    const { matches } = get();
    const exists = matches.some((m) => m.id === normalized.id);
    if (exists) {
      set({
        matches: matches.map((m) => (m.id === normalized.id ? { ...m, ...normalized } : m)),
      });
      return;
    }
    set({ matches: [normalized, ...matches] });
  },

  updateLastMessage: (matchId, message) => {
    const { matches } = get();
    set({
      matches: matches.map((match) =>
        match.id === matchId ? { ...match, lastMessage: message } : match
      ),
    });
  },

  getUnreadCount: () => {
    const { matches } = get();
    return matches.filter(
      (match) =>
        match.lastMessage &&
        !match.lastMessage.is_read &&
        match.lastMessage.sender_id !== match.otherUser?.id
    ).length;
  },

  removeMatch: (matchId) => {
    const { matches } = get();
    set({ matches: matches.filter((match) => match.id !== matchId) });
  },

  unmatch: async (matchId) => {
    await api.unmatch(matchId);
    get().removeMatch(matchId);
  },
}));
