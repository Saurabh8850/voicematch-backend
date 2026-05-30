import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { CONFIG } from "../constants/config";

const client = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("voicematch_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_error) {
      // ignore storage read errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem("voicematch_token");
      } catch (_storageError) {
        // ignore
      }
      router.replace("/(auth)/login");
    }
    return Promise.reject(error);
  }
);

async function request(fn) {
  try {
    const response = await fn();
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong. Please try again.";
    throw new Error(message);
  }
}

export async function sendOtp(phone) {
  return request(() => client.post("/auth/send-otp", { phone }));
}

export async function verifyOtp(phone, otp, deviceToken) {
  return request(() =>
    client.post("/auth/verify-otp", { phone, otp, deviceToken })
  );
}

export async function updateFcmToken(fcmToken) {
  return request(() => client.post("/auth/update-fcm", { fcmToken }));
}

export async function getMe() {
  return request(() => client.get("/users/me"));
}

export async function updateProfile(data) {
  return request(() => client.put("/users/profile", data));
}

export async function updatePreferences(data) {
  return request(() => client.put("/users/preferences", data));
}

export async function uploadPhotos(formData) {
  return request(() =>
    client.post("/users/photos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
}

export async function uploadVoiceIntro(formData) {
  return request(() =>
    client.post("/users/voice-intro", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
}

export async function getUserById(id) {
  return request(() => client.get(`/users/${id}`));
}

export async function updateLocation(lat, lng) {
  return request(() => client.put("/users/location", { lat, lng }));
}

export async function getFeed() {
  return request(() => client.get("/swipes/feed"));
}

export async function swipeAction(targetUserId, swipeType) {
  return request(() => client.post("/swipes/action", { targetUserId, swipe_type: swipeType }));
}

export async function getMatches() {
  return request(() => client.get("/matches"));
}

export async function getMatch(matchId) {
  return request(() => client.get(`/matches/${matchId}`));
}

export async function unmatch(matchId) {
  return request(() => client.delete(`/matches/${matchId}`));
}

export async function getMessages(matchId, cursor) {
  const params = cursor ? { cursor } : {};
  return request(() => client.get(`/messages/${matchId}`, { params }));
}

export async function sendMessage(matchId, content) {
  return request(() => client.post(`/messages/${matchId}`, { content }));
}

export async function sendVoiceMessage(matchId, formData) {
  return request(() =>
    client.post(`/messages/${matchId}/voice`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
}

export async function markRead(matchId) {
  return request(() => client.put(`/messages/${matchId}/read`));
}

export async function initiateCall(receiverId) {
  return request(() => client.post("/calls/initiate", { receiverId }));
}

export async function endCall(callId, duration) {
  return request(() => client.post(`/calls/${callId}/end`, { duration }));
}

export async function getCallHistory() {
  return request(() => client.get("/calls/history"));
}

export async function getIcebreakers(matchId) {
  return request(() => client.post("/ai/icebreakers", { matchId }));
}

export async function getCompatibility(matchId) {
  return request(() => client.post("/ai/compatibility", { matchId }));
}

export async function createOrder(plan) {
  return request(() => client.post("/payments/create-order", { plan }));
}

export async function verifyPayment(data) {
  return request(() => client.post("/payments/verify", data));
}

export async function findVoiceRoom() {
  return request(() => client.post("/rooms/find"));
}

export async function cancelVoiceRoomFind() {
  return request(() => client.delete("/rooms/find/cancel"));
}

export async function leaveVoiceRoom() {
  return request(() => client.post("/rooms/leave"));
}

export async function getVoiceRooms() {
  return request(() => client.get("/rooms"));
}

export async function createVoiceRoom(payload) {
  return request(() => client.post("/rooms/create", payload));
}

export async function getVoiceRoom(roomId) {
  return request(() => client.get(`/rooms/${roomId}`));
}

export async function joinVoiceRoom(roomId) {
  return request(() => client.post(`/rooms/${roomId}/join`));
}

export async function leaveVoiceRoomById(roomId) {
  return request(() => client.delete(`/rooms/${roomId}/leave`));
}

export default client;
