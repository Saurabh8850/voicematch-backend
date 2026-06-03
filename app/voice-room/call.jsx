import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "../../store/authStore";
import * as api from "../../services/api";
import {
  isAgoraAvailable,
  joinVoiceChannel,
  leaveAndDestroyEngine,
} from "../../services/agoraVoice";
import BackHeader from "../../components/BackHeader";
import colors from "../../constants/colors";
import { getInitials } from "../../utils/user";

const SLOT_COUNT = 6;

export default function VoiceRoomCallScreen() {
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();

  const channel = params.channel;
  const token = params.token;
  const uid = params.uid;
  const roomId = params.roomId;
  const roomName = params.roomName || "Voice Room";
  const roomType = params.roomType || "group";

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [members, setMembers] = useState([]);
  const [speakingIds, setSpeakingIds] = useState({});
  const [membersVisible, setMembersVisible] = useState(false);
  const [agoraReady, setAgoraReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(!isAgoraAvailable());
  const engineRef = useRef(null);
  const pollRef = useRef(null);

  const isHost = members.some((m) => m.userId === user?.id && m.isHost);

  const loadRoomDetails = useCallback(async () => {
    if (!roomId) {
      return;
    }
    try {
      const response = await api.getVoiceRoom(roomId);
      const room = response.data?.room;
      if (room?.members) {
        setMembers(
          room.members.map((m) => ({
            userId: m.userId,
            full_name: m.full_name,
            profile_photo_urls: m.profile_photo_urls || [],
            isHost: m.isHost || m.userId === room.hostId,
          }))
        );
      }
    } catch (_error) {
      // keep existing members
    }
  }, [roomId]);

  useEffect(() => {
    if (user) {
      setMembers((prev) => {
        const exists = prev.some((m) => m.userId === user.id);
        if (exists) {
          return prev;
        }
        return [
          {
            userId: user.id,
            full_name: user.full_name || "You",
            profile_photo_urls: user.profile_photo_urls || [],
            isHost: prev.length === 0,
          },
          ...prev,
        ];
      });
    }
    loadRoomDetails();
    if (roomId) {
      pollRef.current = setInterval(loadRoomDetails, 5000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [user, roomId, loadRoomDetails]);

  useEffect(() => {
    let mounted = true;

    const initAgora = async () => {
      if (!channel || !token) {
        setFallbackMode(true);
        return;
      }

      if (!isAgoraAvailable()) {
        setFallbackMode(true);
        return;
      }

      try {
        const result = await joinVoiceChannel({ channel, token, uid });
        if (!mounted) {
          await leaveAndDestroyEngine(result.engine);
          return;
        }

        if (!result.joined) {
          setFallbackMode(true);
          return;
        }

        engineRef.current = result.engine;
        setAgoraReady(true);
        setFallbackMode(false);

        result.engine.addListener?.("onAudioVolumeIndication", (speakers) => {
          const map = {};
          (speakers || []).forEach((s) => {
            if (s.uid && s.volume > 10) {
              map[String(s.uid)] = true;
            }
          });
          setSpeakingIds(map);
        });

        result.engine.addListener?.("onUserJoined", () => {
          loadRoomDetails();
        });

        result.engine.addListener?.("onUserOffline", () => {
          loadRoomDetails();
        });
      } catch (error) {
        setFallbackMode(true);
        console.warn("[voice-room/call] Agora init failed:", error.message);
      }
    };

    initAgora();

    return () => {
      mounted = false;
      leaveAndDestroyEngine(engineRef.current);
      engineRef.current = null;
    };
  }, [channel, token, uid, loadRoomDetails]);

  useEffect(() => {
    if (!engineRef.current) {
      return;
    }
    engineRef.current.muteLocalAudioStream?.(isMuted);
  }, [isMuted]);

  const handleLeave = async () => {
    try {
      if (roomId) {
        await api.leaveVoiceRoomById(roomId);
      } else {
        await api.leaveVoiceRoom();
      }
    } catch (_error) {
      // still leave UI
    }
    await leaveAndDestroyEngine(engineRef.current);
    engineRef.current = null;
    router.back();
  };

  const handleInvite = async () => {
    const link = `voicematch://voice-room/call?roomId=${roomId || ""}&channel=${channel || ""}`;
    const message = `Join my VoiceMatch room: ${roomName}\n${link}`;
    try {
      await Clipboard.setStringAsync(link);
      if (Platform.OS === "web") {
        Alert.alert("Link copied", "Room link copied to clipboard.");
        return;
      }
      try {
        await Share.share({ message });
      } catch (_shareError) {
        Alert.alert("Link copied", "Room link copied to clipboard.");
      }
    } catch (error) {
      Alert.alert("Invite failed", error.message || link);
    }
  };

  const renderSlot = (index) => {
    const member = members[index];
    const speaking = member && speakingIds[String(member.userId)];

    if (!member) {
      return (
        <View key={`empty-${index}`} style={styles.slot}>
          <View style={styles.emptySlot}>
            <Ionicons name="add" size={24} color={colors.textMuted} />
          </View>
          <Text style={styles.slotName}>Open</Text>
        </View>
      );
    }

    const photo = member.profile_photo_urls?.[0];
    const pulseAnim = speaking ? styles.speakingRing : null;

    return (
      <View key={member.userId} style={styles.slot}>
        <View style={[styles.avatarRing, pulseAnim]}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.slotAvatar} />
          ) : (
            <View style={[styles.slotAvatar, styles.slotPlaceholder]}>
              <Text style={styles.slotInitials}>{getInitials(member.full_name)}</Text>
            </View>
          )}
          {member.isHost && (
            <View style={styles.crown}>
              <Ionicons name="star" size={12} color={colors.gold} />
            </View>
          )}
        </View>
        <Text style={styles.slotName} numberOfLines={1}>
          {member.userId === user?.id ? "You" : member.full_name?.split(" ")[0]}
        </Text>
      </View>
    );
  };

  const slots = Array.from({ length: roomType === "random" ? 2 : SLOT_COUNT }, (_, i) => i);

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <BackHeader title={roomName} onBack={handleLeave} />

      <View style={styles.grid}>
        {slots.map((index) => renderSlot(index))}
      </View>

      <TouchableOpacity style={styles.swipeHint} onPress={() => setMembersVisible(true)}>
        <Text style={styles.swipeHintText}>Swipe up for members ↑</Text>
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlActive]}
          onPress={() => setIsMuted((m) => !m)}
        >
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, isSpeaker && styles.controlActive]}
          onPress={() => setIsSpeaker((s) => !s)}
        >
          <Ionicons name={isSpeaker ? "volume-high" : "volume-mute"} size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleInvite}>
          <Ionicons name="share-social" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
          <Ionicons name="exit" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={membersVisible} transparent animationType="slide">
        <View style={styles.panelOverlay}>
          <View style={styles.panel}>
            <View style={styles.panelHandle} />
            <Text style={styles.panelTitle}>Members ({members.length})</Text>
            <FlatList
              data={members}
              keyExtractor={(item) => item.userId}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <Text style={styles.memberName}>
                    {item.full_name}
                    {item.isHost ? " 👑" : ""}
                  </Text>
                  {isHost && item.userId !== user?.id && (
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Remove member", "This will be available in a future update.")
                      }
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
            <TouchableOpacity style={styles.panelClose} onPress={() => setMembersVisible(false)}>
              <Text style={styles.panelCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  roomTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  fallbackNote: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  liveNote: { fontSize: 11, color: colors.online, marginTop: 2, fontWeight: "600" },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    alignContent: "center",
    justifyContent: "center",
    gap: 12,
  },
  slot: { width: "30%", alignItems: "center", marginVertical: 10 },
  avatarRing: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.border,
  },
  speakingRing: { borderColor: colors.primary, borderWidth: 3 },
  slotAvatar: { width: 72, height: 72, borderRadius: 36 },
  slotPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  slotInitials: { color: colors.text, fontWeight: "800", fontSize: 22 },
  crown: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 2,
  },
  emptySlot: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  slotName: { marginTop: 8, color: colors.textSecondary, fontSize: 12, maxWidth: 90 },
  swipeHint: { alignItems: "center", paddingVertical: 8 },
  swipeHintText: { color: colors.textMuted, fontSize: 12 },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingBottom: 28,
    paddingTop: 8,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlActive: { backgroundColor: colors.card },
  leaveBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  panelOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "55%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  panelTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12 },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberName: { color: colors.text, fontWeight: "600", flex: 1 },
  removeText: { color: colors.primary, fontWeight: "700" },
  panelClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  panelCloseText: { color: colors.text, fontWeight: "700" },
});
