import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import colors from "../constants/colors";

// Audio will work in development build
let useAudioRecorder = null;
let AudioModule = null;
let RecordingPresets = null;
let setAudioModeAsync = null;
let audioModuleReady = false;

try {
  const expoAudio = require("expo-audio");
  useAudioRecorder = expoAudio.useAudioRecorder;
  AudioModule = expoAudio.AudioModule;
  RecordingPresets = expoAudio.RecordingPresets;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
  audioModuleReady = true;
} catch (_error) {
  audioModuleReady = false;
}

function VoiceRecorderMock({ isRecording, onRecordComplete, onRecordingChange }) {
  const startTimeRef = useRef(null);
  const prevRecordingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    if (isRecording && !prevRecordingRef.current) {
      startTimeRef.current = Date.now();
    }
    if (!isRecording && prevRecordingRef.current) {
      const duration = Math.floor(
        (Date.now() - (startTimeRef.current || Date.now())) / 1000
      );
      startTimeRef.current = null;
      if (duration > 0) {
        onRecordComplete?.(`mock-recording://${Date.now()}.m4a`, Math.max(duration, 1));
      }
    }
    prevRecordingRef.current = isRecording;
  }, [isRecording, onRecordComplete]);

  return (
    <View style={styles.wrapper} pointerEvents="none">
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}
    </View>
  );
}

function VoiceRecorderExpo({ onRecordComplete, isRecording, onRecordingChange }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const prevRecordingRef = useRef(false);
  const startTimeRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const permissionsReadyRef = useRef(false);

  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    const run = async () => {
      try {
        if (isRecording && !prevRecordingRef.current) {
          if (!permissionsReadyRef.current && AudioModule) {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            if (!status.granted) {
              throw new Error("Microphone permission is required");
            }
            permissionsReadyRef.current = true;
          }

          if (setAudioModeAsync) {
            await setAudioModeAsync({
              allowsRecording: true,
              playsInSilentMode: true,
            });
          }

          await recorder.prepareToRecordAsync();
          recorder.record();
          startTimeRef.current = Date.now();
        }

        if (!isRecording && prevRecordingRef.current) {
          await recorder.stop();
          const uri = recorder.uri;
          const duration = Math.floor(
            (Date.now() - (startTimeRef.current || Date.now())) / 1000
          );
          startTimeRef.current = null;

          if (uri && duration > 0) {
            onRecordComplete?.(uri, duration);
          }
        }

        prevRecordingRef.current = isRecording;
      } catch (_error) {
        onRecordingChange?.(false);
        prevRecordingRef.current = false;
      }
    };

    run();
  }, [isRecording, recorder, onRecordComplete, onRecordingChange]);

  return (
    <View style={styles.wrapper} pointerEvents="none">
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}
    </View>
  );
}

export default function VoiceRecorder(props) {
  if (audioModuleReady && useAudioRecorder && RecordingPresets) {
    return <VoiceRecorderExpo {...props} />;
  }
  return <VoiceRecorderMock {...props} />;
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: colors.primary,
    opacity: 0.35,
  },
});
