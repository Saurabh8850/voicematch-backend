import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "../../services/api";

const { width, height } = Dimensions.get("window");

export default function CallScreen() {
  const { callId, receiverId, receiverName, receiverPhoto } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [callStatus, setCallStatus] = useState("Connecting...");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timeout = setTimeout(() => {
      setCallStatus("On call");
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }, 2000);

    return () => {
      clearTimeout(timeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleEndCall = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (callId) await api.endCall(callId, duration);
    } catch (_e) {}
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a0a1e" />

      <LinearGradient
        colors={["#1a0a1e", "#2d1435", "#1a0a1e"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.circlesContainer}>
        <Animated.View
          style={[
            styles.outerCircle,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <View style={styles.innerCircle} />
      </View>

      <View style={[styles.photoContainer, { marginTop: insets.top + 80 }]}>
        {receiverPhoto ? (
          <Image source={{ uri: receiverPhoto }} style={styles.photo} />
        ) : (
          <LinearGradient
            colors={["#FF4458", "#FF6B7A"]}
            style={styles.photoPlaceholder}
          >
            <Text style={styles.photoInitial}>
              {(receiverName || "U")[0].toUpperCase()}
            </Text>
          </LinearGradient>
        )}
      </View>

      <Text style={[styles.name, { marginTop: 24 }]}>
        {receiverName || "Voice Call"}
      </Text>

      <Text style={styles.status}>
        {callStatus === "On call" ? formatDuration(duration) : callStatus}
      </Text>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted((v) => !v)}
          activeOpacity={0.95}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic"}
            size={26}
            color={isMuted ? "#FF4458" : "white"}
          />
          <Text style={styles.controlLabel}>
            {isMuted ? "Unmute" : "Mute"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleEndCall} activeOpacity={0.95}>
          <LinearGradient
            colors={["#FF4458", "#FF0000"]}
            style={styles.endCallBtn}
          >
            <Ionicons
              name="call"
              size={32}
              color="white"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
          onPress={() => setIsSpeaker((v) => !v)}
          activeOpacity={0.95}
        >
          <Ionicons
            name={isSpeaker ? "volume-high" : "volume-medium"}
            size={26}
            color={isSpeaker ? "#FF4458" : "white"}
          />
          <Text style={styles.controlLabel}>
            {isSpeaker ? "Earpiece" : "Speaker"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  circlesContainer: {
    position: "absolute",
    top: "25%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  outerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,68,88,0.15)",
    position: "absolute",
  },
  innerCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,68,88,0.2)",
  },
  photoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,68,88,0.6)",
    elevation: 10,
    shadowColor: "#FF4458",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  photoInitial: { fontSize: 52, fontWeight: "bold", color: "white" },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    letterSpacing: 1,
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  controlBtn: {
    alignItems: "center",
    gap: 8,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "rgba(255,68,88,0.2)",
  },
  controlLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 2,
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#FF4458",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
});
