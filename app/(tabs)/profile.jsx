import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../store/authStore";
import { useMatchStore } from "../../store/matchStore";
import VoicePlayer from "../../components/VoicePlayer";
import VoiceRecorder from "../../components/VoiceRecorder";
import * as api from "../../services/api";
import colors from "../../constants/colors";
import { getAge, getInitials } from "../../utils/user";

const NOTIF_KEY = "voicematch_notification_prefs";

function profileCompletion(user) {
  let score = 0;
  if (user?.profile_photo_urls?.length) score += 25;
  if (user?.bio?.trim()) score += 25;
  if (user?.voice_intro_url) score += 25;
  if (getAge(user) || user?.gender) score += 25;
  return Math.min(100, score);
}

const MENU_ITEMS = [
  { icon: "create-outline", label: "Edit Profile", action: "edit" },
  { icon: "images-outline", label: "My Photos", action: "photos" },
  { icon: "mic-outline", label: "Voice Intro", action: "voice" },
  { icon: "notifications-outline", label: "Notifications", action: "notif" },
  { icon: "help-circle-outline", label: "Help", action: "help" },
];

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const matches = useMatchStore((state) => state.matches);
  const [loading, setLoading] = useState(true);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [voiceVisible, setVoiceVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  const [notifVisible, setNotifVisible] = useState(false);
  const [matchNotif, setMatchNotif] = useState(true);
  const [messageNotif, setMessageNotif] = useState(true);

  const refreshProfile = useCallback(async () => {
    const response = await api.getMe();
    updateUser(response.data?.user || {});
  }, [updateUser]);

  useEffect(() => {
    refreshProfile()
      .catch((error) => Alert.alert("Error", error.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [refreshProfile]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY)
      .then((raw) => {
        if (!raw) return;
        const prefs = JSON.parse(raw);
        setMatchNotif(prefs.matchNotif !== false);
        setMessageNotif(prefs.messageNotif !== false);
      })
      .catch(() => {});
  }, []);

  const photo = user?.profile_photo_urls?.[0];
  const age = getAge(user);
  const completion = useMemo(() => profileCompletion(user), [user]);

  const stats = useMemo(
    () => ({
      matches: matches.length,
      likes: user?.likes_received || 0,
      views: user?.profile_views || 0,
    }),
    [matches.length, user]
  );

  const openEdit = () => {
    setEditName(user?.full_name || "");
    setEditAge(age ? String(age) : "");
    setEditBio(user?.bio || "");
    setEditVisible(true);
  };

  const handleMenu = (action) => {
    if (action === "edit") openEdit();
    else if (action === "photos") router.push("/(onboarding)/photos");
    else if (action === "voice") setVoiceVisible(true);
    else if (action === "notif") setNotifVisible(true);
    else if (action === "help") Alert.alert("Help", "Contact support@voicematch.app");
  };

  const saveProfile = async () => {
    const name = editName.trim();
    const ageNum = parseInt(editAge, 10);
    if (!name) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    if (!ageNum || ageNum < 18 || ageNum > 60) {
      Alert.alert("Invalid age", "Age must be between 18 and 60.");
      return;
    }

    setSavingProfile(true);
    try {
      const response = await api.updateProfile({
        full_name: name,
        age: ageNum,
        bio: editBio.trim(),
        gender: user?.gender,
      });
      updateUser(response.data?.user || { full_name: name, age: ageNum, bio: editBio.trim() });
      setEditVisible(false);
    } catch (error) {
      Alert.alert("Save failed", error.message || "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleVoiceRecorded = (uri) => {
    setRecordedUri(uri);
    setIsRecording(false);
  };

  const uploadVoiceIntro = async () => {
    if (!recordedUri) {
      Alert.alert("No recording", "Hold the record button to capture your voice intro.");
      return;
    }

    setUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append("voiceIntro", {
        uri: recordedUri,
        name: `voice-intro-${Date.now()}.m4a`,
        type: "audio/m4a",
      });
      const response = await api.uploadVoiceIntro(formData);
      const url = response.data?.voiceIntroUrl;
      if (url) {
        updateUser({ voice_intro_url: url });
        setRecordedUri(null);
      }
    } catch (error) {
      Alert.alert("Upload failed", error.message || "Could not upload voice intro");
    } finally {
      setUploadingVoice(false);
    }
  };

  const saveNotifications = async () => {
    try {
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify({ matchNotif, messageNotif }));
      setNotifVisible(false);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not save preferences");
    }
  };

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={colors.gradientPrimary} style={styles.avatar}>
                <Text style={styles.avatarInitials}>{getInitials(user?.full_name)}</Text>
              </LinearGradient>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={openEdit} activeOpacity={0.8}>
              <Ionicons name="pencil" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>
            {user?.full_name || "VoiceMatch User"}
            {age ? `, ${age}` : ""}
          </Text>
          <Text style={styles.phone}>{user?.phone ? `+91 ${user.phone}` : ""}</Text>

          <View style={styles.statsRow}>
            {[
              { value: stats.matches, label: "Matches" },
              { value: stats.likes, label: "Likes" },
              { value: stats.views, label: "Views" },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>Complete your profile</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion}%` }]} />
          </View>
          <Text style={styles.completionPercent}>{completion}% complete</Text>
        </View>

        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.action}
            style={styles.menuItem}
            onPress={() => handleMenu(item.action)}
            activeOpacity={0.8}
          >
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/premium")}>
          <LinearGradient colors={colors.gradientGold} style={styles.premiumCard}>
            <Ionicons name="diamond" size={28} color={colors.gold} />
            <View style={styles.premiumTextWrap}>
              <Text style={styles.premiumTitle}>Go Premium 👑</Text>
              <Text style={styles.premiumSub}>Unlock unlimited matches</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              value={editName}
              onChangeText={setEditName}
            />
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor={colors.textMuted}
              value={editAge}
              onChangeText={setEditAge}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio"
              placeholderTextColor={colors.textMuted}
              value={editBio}
              onChangeText={setEditBio}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveProfile} disabled={savingProfile} activeOpacity={0.8}>
                {savingProfile ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={voiceVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Voice Intro</Text>
            {user?.voice_intro_url ? (
              <VoicePlayer audioUrl={user.voice_intro_url} size="medium" />
            ) : (
              <Text style={styles.voiceHint}>No voice intro yet</Text>
            )}
            <Pressable
              style={styles.recordBtn}
              onPressIn={() => setIsRecording(true)}
              onPressOut={() => setIsRecording(false)}
            >
              <Ionicons name="mic" size={22} color={colors.text} />
              <Text style={styles.recordBtnText}>
                {isRecording ? "Recording..." : "Hold to record new intro"}
              </Text>
            </Pressable>
            <VoiceRecorder
              isRecording={isRecording}
              onRecordingChange={setIsRecording}
              onRecordComplete={handleVoiceRecorded}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setVoiceVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={uploadVoiceIntro} disabled={uploadingVoice} activeOpacity={0.8}>
                {uploadingVoice ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.modalSaveText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={notifVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>New matches</Text>
              <Switch value={matchNotif} onValueChange={setMatchNotif} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Messages</Text>
              <Switch value={messageNotif} onValueChange={setMessageNotif} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
            <TouchableOpacity style={styles.modalSaveFull} onPress={saveNotifications} activeOpacity={0.8}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primary,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 32, fontWeight: "800", color: '#1A1A2E' },
  name: { fontSize: 22, fontWeight: "800", color: '#1A1A2E' },
  phone: { marginTop: 4, color: '#999999', fontSize: 14 },
  statsRow: {
    flexDirection: "row",
    marginTop: 20,
    width: "100%",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: '#1A1A2E' },
  statLabel: { fontSize: 12, color: '#999999', marginTop: 4 },
  completionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completionTitle: { color: '#1A1A2E', fontWeight: "700", fontSize: 16, marginBottom: 10 },
  progressTrack: { height: 8, backgroundColor: '#FFF5F7', borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  completionPercent: { color: '#999999', fontSize: 12, marginTop: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: "600", color: '#1A1A2E' },
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 18,
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  premiumTextWrap: { flex: 1 },
  premiumTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  premiumSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
  },
  logoutText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlayLight, justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 16 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  bioInput: { minHeight: 80, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { color: colors.textSecondary, fontWeight: "700" },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  modalSaveText: { color: colors.text, fontWeight: "800" },
  modalSaveFull: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  voiceHint: { color: colors.textSecondary, marginBottom: 12 },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  recordBtnText: { color: colors.text, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
});
