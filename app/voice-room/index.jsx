import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as api from "../../services/api";
import colors from "../../constants/colors";
import { getInitials } from "../../utils/user";

const POLL_MS = 3000;
const TOPICS = ["Dating Talk", "Music", "Movies", "Random"];
const MAX_MEMBER_OPTIONS = [2, 4, 6];

export default function VoiceRoomHub() {
  const [tab, setTab] = useState("random");
  const [finding, setFinding] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [maxMembers, setMaxMembers] = useState(4);
  const [creating, setCreating] = useState(false);
  const pollRef = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
      api.cancelVoiceRoomFind().catch(() => {});
    };
  }, []);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const response = await api.getVoiceRooms();
      setRooms(response.data?.rooms || []);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not load rooms");
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "rooms") {
      loadRooms();
      const interval = setInterval(loadRooms, 8000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [tab, loadRooms]);

  const goToCall = (data) => {
    router.push({
      pathname: "/voice-room/call",
      params: {
        channel: data.channel,
        token: data.token,
        uid: String(data.uid || 0),
        roomId: data.roomId || "",
        roomName: data.roomName || "Voice Room",
        roomType: data.roomType || "random",
      },
    });
  };

  const stopFinding = async () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setFinding(false);
    try {
      await api.cancelVoiceRoomFind();
    } catch (_error) {
      // ignore
    }
  };

  const pollFind = async () => {
    try {
      const response = await api.findVoiceRoom();
      const data = response.data;
      if (data.status === "matched") {
        await stopFinding();
        goToCall({
          channel: data.channel,
          token: data.token,
          uid: data.uid,
          roomId: data.roomId,
          roomName: data.otherUser?.full_name || "Random Match",
          roomType: "random",
          otherUser: JSON.stringify(data.otherUser || {}),
        });
      }
    } catch (error) {
      await stopFinding();
      Alert.alert("Matching failed", error.message || "Could not find a partner");
    }
  };

  const startMatching = () => {
    setFinding(true);
    pollFind();
    pollRef.current = setInterval(pollFind, POLL_MS);
  };

  const handleCreateRoom = async () => {
    const name = roomName.trim();
    if (!name) {
      Alert.alert("Room name required", "Please enter a name for your room.");
      return;
    }

    setCreating(true);
    try {
      const response = await api.createVoiceRoom({ name, topic, maxMembers });
      const data = response.data;
      setCreateVisible(false);
      setRoomName("");
      goToCall({
        channel: data.channel,
        token: data.token,
        uid: data.uid,
        roomId: data.room?.id,
        roomName: data.room?.name || name,
        roomType: "group",
      });
    } catch (error) {
      Alert.alert("Create failed", error.message || "Could not create room");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (room) => {
    try {
      const response = await api.joinVoiceRoom(room.id);
      const data = response.data;
      goToCall({
        channel: data.channel,
        token: data.token,
        uid: data.uid,
        roomId: room.id,
        roomName: room.name,
        roomType: "group",
      });
    } catch (error) {
      Alert.alert("Join failed", error.message || "Could not join room");
    }
  };

  const renderRoom = ({ item }) => {
    const hostPhoto = item.host?.profile_photo_urls?.[0];
    return (
      <TouchableOpacity style={styles.roomCard} onPress={() => handleJoinRoom(item)}>
        <View style={styles.roomLeft}>
          {hostPhoto ? (
            <Image source={{ uri: hostPhoto }} style={styles.roomAvatar} />
          ) : (
            <View style={[styles.roomAvatar, styles.roomAvatarPlaceholder]}>
              <Text style={styles.roomInitials}>{getInitials(item.host?.full_name)}</Text>
            </View>
          )}
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{item.name}</Text>
            <View style={styles.topicTag}>
              <Text style={styles.topicText}>{item.topic}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.roomCount}>
          {item.memberCount}/{item.maxMembers}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Room</Text>
        {tab === "rooms" ? (
          <TouchableOpacity onPress={() => setCreateVisible(true)} style={styles.createBtn}>
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.createBtn} />
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "random" && styles.tabActive]}
          onPress={() => setTab("random")}
        >
          <Text style={[styles.tabText, tab === "random" && styles.tabTextActive]}>Random</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "rooms" && styles.tabActive]}
          onPress={() => setTab("rooms")}
        >
          <Text style={[styles.tabText, tab === "rooms" && styles.tabTextActive]}>Rooms</Text>
        </TouchableOpacity>
      </View>

      {tab === "random" ? (
        <View style={styles.randomContent}>
          {!finding ? (
            <>
              <Animated.View style={[styles.pulseOuter, { transform: [{ scale: pulse }] }]}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.pulseInner}>
                  <Ionicons name="mic" size={52} color={colors.text} />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.randomHeading}>Find Someone to Talk To</Text>
              <Text style={styles.randomSub}>Get matched with someone new for a voice chat</Text>
              <TouchableOpacity style={styles.startBtn} onPress={startMatching}>
                <Text style={styles.startBtnText}>Start Matching</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.findingText}>Finding someone...</Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={stopFinding}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <View style={styles.roomsContent}>
          <Text style={styles.sectionLabel}>Active Rooms</Text>
          {loadingRooms && rooms.length === 0 ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              renderItem={renderRoom}
              refreshing={loadingRooms}
              onRefresh={loadRooms}
              ListEmptyComponent={
                <View style={styles.emptyRooms}>
                  <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No active rooms. Create one!</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      <Modal visible={createVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Room</Text>
            <TextInput
              style={styles.input}
              placeholder="Room name"
              placeholderTextColor={colors.textMuted}
              value={roomName}
              onChangeText={setRoomName}
            />
            <Text style={styles.modalLabel}>Topic</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicRow}>
              {TOPICS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.topicChip, topic === t && styles.topicChipActive]}
                  onPress={() => setTopic(t)}
                >
                  <Text style={[styles.topicChipText, topic === t && styles.topicChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Max members</Text>
            <View style={styles.memberRow}>
              {MAX_MEMBER_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.memberChip, maxMembers === n && styles.memberChipActive]}
                  onPress={() => setMaxMembers(n)}
                >
                  <Text style={[styles.memberChipText, maxMembers === n && styles.memberChipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCreateVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreate} onPress={handleCreateRoom} disabled={creating}>
                {creating ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: "700" },
  tabTextActive: { color: colors.text },
  randomContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  pulseOuter: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255,68,88,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  pulseInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
  },
  randomHeading: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" },
  randomSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
  },
  startBtnText: { color: colors.text, fontSize: 17, fontWeight: "800" },
  findingText: { color: colors.text, fontSize: 18, fontWeight: "600", marginTop: 20 },
  cancelBtn: { marginTop: 24, padding: 12 },
  cancelText: { color: colors.textSecondary, fontSize: 15 },
  roomsContent: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  roomAvatar: { width: 48, height: 48, borderRadius: 24 },
  roomAvatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  roomInitials: { color: colors.text, fontWeight: "700" },
  roomInfo: { flex: 1 },
  roomName: { color: colors.text, fontWeight: "700", fontSize: 16 },
  topicTag: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topicText: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
  roomCount: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  emptyRooms: { alignItems: "center", paddingTop: 48 },
  emptyText: { color: colors.textMuted, marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 16 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  modalLabel: { color: colors.textSecondary, fontWeight: "600", marginBottom: 8 },
  topicRow: { marginBottom: 16 },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  topicChipText: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
  topicChipTextActive: { color: colors.text },
  memberRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  memberChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  memberChipText: { color: colors.textSecondary, fontWeight: "700" },
  memberChipTextActive: { color: colors.text },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { color: colors.textSecondary, fontWeight: "700" },
  modalCreate: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  modalCreateText: { color: colors.text, fontWeight: "800" },
});
