import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Animated } from "react-native";
import VoiceRecorder from "../../components/VoiceRecorder";
import VoicePlayer from "../../components/VoicePlayer";
import * as api from "../../services/api";
import colors from "../../constants/colors";

export default function VoiceIntro() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            setIsRecording(false);
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => {
        clearInterval(timerRef.current);
        animation.stop();
      };
    }

    clearInterval(timerRef.current);
    pulseAnim.setValue(1);
    return undefined;
  }, [isRecording, pulseAnim]);

  const handleRecordComplete = (uri, recordedDuration) => {
    if (recordedDuration < 10) {
      Alert.alert("Too short", "Please record at least 10 seconds.");
      setRecordingUri(null);
      setDuration(0);
      setRecordSeconds(0);
      return;
    }
    setRecordingUri(uri);
    setDuration(recordedDuration);
  };

  const handleFinish = async () => {
    if (!recordingUri) {
      Alert.alert("Recording required", "Please record your voice intro first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("voiceIntro", {
        uri: recordingUri,
        name: "voice-intro.m4a",
        type: "audio/m4a",
      });
      await api.uploadVoiceIntro(formData);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Upload failed", error.message || "Could not upload voice intro");
    } finally {
      setUploading(false);
    }
  };

  const handleReRecord = () => {
    setRecordingUri(null);
    setDuration(0);
    setRecordSeconds(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>

      <Text style={styles.title}>Record your voice intro</Text>
      <Text style={styles.subtitle}>Let them hear you before they swipe</Text>

      <View style={styles.centerArea}>
        <Pressable
          onPressIn={() => {
            if (!recordingUri) {
              setRecordSeconds(0);
              setIsRecording(true);
            }
          }}
          onPressOut={() => setIsRecording(false)}
        >
          <Animated.View
            style={[
              styles.recordButton,
              isRecording && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name="mic" size={42} color={colors.white} />
          </Animated.View>
        </Pressable>

        <VoiceRecorder
          isRecording={isRecording}
          onRecordingChange={setIsRecording}
          onRecordComplete={handleRecordComplete}
        />

        <Text style={styles.hint}>
          {isRecording
            ? `Release to Stop • ${recordSeconds}s`
            : recordingUri
              ? "Preview your recording below"
              : "Hold to Record"}
        </Text>

        {recordingUri && (
          <View style={styles.previewBox}>
            <VoicePlayer audioUrl={recordingUri} size="large" />
            <TouchableOpacity style={styles.rerecordButton} onPress={handleReRecord}>
              <Text style={styles.rerecordText}>Re-record</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, (!recordingUri || uploading) && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={!recordingUri || uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Finish & Find Matches</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.grayLight,
    borderRadius: 2,
    marginVertical: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.gray,
    marginBottom: 24,
  },
  centerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recordButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  hint: {
    marginTop: 16,
    color: colors.grayDark,
    fontSize: 15,
    fontWeight: "600",
  },
  previewBox: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
  },
  rerecordButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  rerecordText: {
    color: colors.primary,
    fontWeight: "600",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
