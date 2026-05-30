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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../store/authStore";
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

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
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

  const openEdit = () => {
    setEditName(user?.full_name || "");
    setEditAge(age ? String(age) : "");
    setEditBio(user?.bio || "");
    setEditVisible(true);
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
      Alert.alert("Saved", "Profile updated successfully.");
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
        Alert.alert("Uploaded", "Your voice intro is live!");
      }
    } catch (error) {
      Alert.alert("Upload failed", error.message || "Could not upload voice intro");
    } finally {
      setUploadingVoice(false);
    }
  };

  const saveNotifications = async () => {
    try {
      await AsyncStorage.setItem(
        NOTIF_KEY,
        JSON.stringify({ matchNotif, messageNotif })
      );
      setNotifVisible(false);
      Alert.alert("Saved", "Notification preferences saved.");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not save preferences");
    }
  };

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Profile</Text>

        <View style={styles.header}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.avatar}>
              <Text style={styles.avatarInitials}>{getInitials(user?.full_name)}</Text>
            </LinearGradient>
          )}
          <View style={styles.headerText}>
            <Text style={styles.name}>
              {user?.full_name || "VoiceMatch User"}
              {age ? `, ${age}` : ""}
            </Text>
            <Text style={styles.phone}>{user?.phone ? `+91 ${user.phone}` : ""}</Text>
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>
        </View>

        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionTitle}>Profile completion</Text>
            <Text style={styles.completionPercent}>{completion}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion}%` }]} />
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={openEdit}>
          <Ionicons name="create-outline" size={20} color={colors.text} />
          <Text style={styles.primaryBtnText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/(onboarding)/photos")}>
          <Ionicons name="images-outline" size={22} color={colors.primary} />
          <Text style={styles.menuText}>Edit Photos</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setVoiceVisible(true)}>
          <Ionicons name="mic-outline" size={22} color={colors.primary} />
          <Text style={styles.menuText}>Voice Intro</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setNotifVisible(true)}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/premium")} style={styles.premiumWrap}>
          <LinearGradient
            colors={[colors.primary, colors.premiumGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <Ionicons name="diamond" size={28} color={colors.gold} />
            <View style={styles.premiumTextWrap}>
              <Text style={styles.premiumTitle}>Go Premium</Text>
              <Text style={styles.premiumSub}>Unlimited likes & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}
      </ScrollView>

      {/* Edit Profile Modal */}
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
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveProfile} disabled={savingProfile}>
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

      {/* Voice Intro Modal */}
      <Modal visible={voiceVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Voice Intro</Text>
            {user?.voice_intro_url ? (
              <View style={styles.voicePlayerWrap}>
                <VoicePlayer audioUrl={user.voice_intro_url} size="medium" />
                <Text style={styles.voiceHint}>Current intro</Text>
              </View>
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

            {recordedUri && (
              <Text style={styles.recordedNote}>Recording ready — tap Upload</Text>
            )}

            <VoiceRecorder
              isRecording={isRecording}
              onRecordingChange={setIsRecording}
              onRecordComplete={handleVoiceRecorded}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setVoiceVisible(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={uploadVoiceIntro}
                disabled={uploadingVoice}
              >
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

      {/* Notifications Modal */}
      <Modal visible={notifVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>New matches</Text>
              <Switch
                value={matchNotif}
                onValueChange={setMatchNotif}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Messages</Text>
              <Switch
                value={messageNotif}
                onValueChange={setMessageNotif}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <TouchableOpacity style={styles.modalSaveFull} onPress={saveNotifications}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelFull} onPress={() => setNotifVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  screenTitle: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: 8, marginBottom: 16 },
  header: { flexDirection: "row", gap: 16, marginBottom: 20 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarInitials: { fontSize: 36, fontWeight: "800", color: colors.text },
  headerText: { flex: 1 },
  name: { fontSize: 22, fontWeight: "800", color: colors.text },
  phone: { marginTop: 4, color: colors.textSecondary, fontSize: 14 },
  bio: { marginTop: 8, color: colors.textSecondary, lineHeight: 20 },
  completionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  completionTitle: { color: colors.text, fontWeight: "600" },
  completionPercent: { color: colors.primary, fontWeight: "700" },
  progressTrack: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  primaryBtnText: { color: colors.text, fontWeight: "800", fontSize: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  premiumWrap: { marginTop: 8, marginBottom: 16 },
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  premiumTextWrap: { flex: 1 },
  premiumTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  premiumSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
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
  modalCancelFull: { paddingVertical: 14, alignItems: "center" },
  voicePlayerWrap: { marginBottom: 16 },
  voiceHint: { color: colors.textSecondary, marginBottom: 12 },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  recordBtnText: { color: colors.text, fontWeight: "600" },
  recordedNote: { color: colors.success, marginBottom: 8, fontSize: 13 },
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
