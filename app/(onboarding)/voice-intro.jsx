import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VoiceRecorder from "../../components/VoiceRecorder";
import VoicePlayer from "../../components/VoicePlayer";
import OnboardingProgress from "../../components/OnboardingProgress";
import GradientButton from "../../components/GradientButton";
import BackHeader from "../../components/BackHeader";
import * as api from "../../services/api";
import colors from "../../constants/colors";

function WaveformBars({ active }) {
  const bars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.4))).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => b.setValue(0.4));
      return undefined;
    }
    const anims = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 300 + i * 80,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: 300 + i * 80,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [active, bars]);

  return (
    <View style={waveStyles.row}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[waveStyles.bar, { transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    marginTop: 16,
  },
  bar: {
    width: 5,
    height: 32,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
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
    <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
      <BackHeader title="" />
      <OnboardingProgress step={3} />

      <Text style={styles.title}>Record your voice 🎙️</Text>
      <Text style={styles.subtitle}>Let matches hear you before swiping</Text>

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
          <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
            <LinearGradient
              colors={isRecording ? colors.gradientPrimary : [colors.primary, colors.primaryLight]}
              style={styles.outerRing}
            >
              <View style={[styles.innerCircle, isRecording && styles.innerRecording]}>
                {isRecording ? (
                  <Text style={styles.timer}>{formatTime(recordSeconds)}</Text>
                ) : (
                  <Ionicons name="mic" size={48} color={colors.primary} />
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </Pressable>

        <VoiceRecorder
          isRecording={isRecording}
          onRecordingChange={setIsRecording}
          onRecordComplete={handleRecordComplete}
        />

        <Text style={styles.hint}>
          {isRecording
            ? "Recording... tap to stop"
            : recordingUri
              ? "Preview your recording"
              : "Tap to start recording"}
        </Text>
        <Text style={styles.limitHint}>Min 10s · Max 60s</Text>

        {recordingUri && (
          <View style={styles.previewBox}>
            <WaveformBars active />
            <VoicePlayer audioUrl={recordingUri} size="large" />
            <TouchableOpacity onPress={handleReRecord} activeOpacity={0.8}>
              <Text style={styles.rerecordText}>Re-record</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <GradientButton
        title="Finish & Find Matches"
        onPress={handleFinish}
        loading={uploading}
        disabled={!recordingUri}
        style={styles.footerBtn}
      />
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 24,
  },
  centerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: '#FFFFFF',
    alignItems: "center",
    justifyContent: "center",
  },
  innerRecording: {
    backgroundColor: '#FFF5F7',
  },
  timer: {
    fontSize: 32,
    fontWeight: "800",
    color: '#1A1A2E',
  },
  hint: {
    marginTop: 20,
    color: '#666666',
    fontSize: 15,
    fontWeight: "600",
  },
  limitHint: {
    marginTop: 6,
    color: '#999999',
    fontSize: 13,
  },
  previewBox: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
  },
  rerecordText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
    marginTop: 8,
  },
  footerBtn: {
    marginBottom: 20,
  },
});
