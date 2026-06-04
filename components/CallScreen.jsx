import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as api from "../services/api";
import colors from "../constants/colors";

export default function CallScreen({ callId, otherUser, channel, token }) {
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("Connecting...");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    const statusTimer = setTimeout(() => setStatus("On call"), 3000);
    return () => clearTimeout(statusTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleEndCall = async () => {
    try {
      if (callId) {
        await api.endCall(callId, duration);
      }
    } catch (_error) {
      // still navigate back even if API fails
    } finally {
      router.back();
    }
  };

  const photoUrl = otherUser?.profile_photo_urls?.[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={48} color={colors.gray} />
          </View>
        )}

        <Text style={styles.name}>{otherUser?.full_name || "Voice Call"}</Text>
        <Text style={styles.timer}>{formatTimer(duration)}</Text>
        <Text style={styles.status}>{status}</Text>

        {channel ? <Text style={styles.meta}>Channel: {channel}</Text> : null}
        {token ? <Text style={styles.meta}>Agora token ready</Text> : null}
        <Text style={styles.note}>
          Agora SDK integration requires a native build. UI and call lifecycle are wired to the backend.
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlActive]}
          onPress={() => setIsMuted((prev) => !prev)}
        >
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endButton} onPress={handleEndCall}>
          <Ionicons name="call" size={28} color={colors.white} style={styles.endIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeaker && styles.controlActive]}
          onPress={() => setIsSpeaker((prev) => !prev)}
        >
          <Ionicons name={isSpeaker ? "volume-high" : "volume-medium"} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    backgroundColor: colors.grayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  timer: {
    color: colors.white,
    fontSize: 18,
    marginBottom: 8,
  },
  status: {
    color: colors.grayMuted,
    fontSize: 16,
    marginBottom: 16,
  },
  meta: {
    color: colors.gray,
    fontSize: 12,
    marginBottom: 4,
  },
  note: {
    color: colors.grayMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  controlActive: {
    backgroundColor: colors.grayLight,
  },
  endButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  endIcon: {
    transform: [{ rotate: "135deg" }],
  },
});
