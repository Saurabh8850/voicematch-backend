import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "../../services/api";
import { sendOtpViaFirebase, verifyOtpCode } from "../../services/firebaseAuth";
import { useAuthStore } from "../../store/authStore";
import GradientButton from "../../components/GradientButton";
import BackHeader from "../../components/BackHeader";
import colors from "../../constants/colors";

export default function OtpScreen() {
  const params = useLocalSearchParams();
  const phone = String(params.phone || "");
  const login = useAuthStore((state) => state.login);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    console.log("OTP screen loaded, phone:", phone);
  }, [phone]);

  useEffect(() => {
    if (!phone) {
      router.replace("/(auth)/login");
    }
  }, [phone]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = () => {
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const maskedPhone = phone ? `${phone.slice(0, 2)}******${phone.slice(-2)}` : "";

  const handleChange = (value, index) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = cleaned;
    setDigits(nextDigits);

    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleResend = async () => {
    if (!phone) {
      return;
    }
    setResending(true);
    try {
      await sendOtpViaFirebase(phone);
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      Alert.alert("OTP Sent", "A new code has been sent.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtpCode(phone, otp);
      const { token, isNewUser, user } = response.data;
      await login(token, user);

      const pendingPush = await AsyncStorage.getItem("voicematch_pending_push_token");
      if (pendingPush) {
        try {
          await api.updateFcmToken(pendingPush);
          await AsyncStorage.removeItem("voicematch_pending_push_token");
        } catch (_error) {
          // non-blocking
        }
      }

      if (isNewUser) {
        router.replace("/(onboarding)/basic-info");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("Verification failed", error.message || "Could not verify OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!phone) {
    return (
      <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
        <SafeAreaView style={styles.container}>
          <StatusBar style="dark" />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
      <BackHeader title="Verify OTP" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.title}>Verify Phone 📱</Text>
        <Text style={styles.subtitle}>We sent a code to +91 {maskedPhone}</Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => {
            const isActive = focusedIndex === index || digit.length > 0;
            return (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputsRef.current[index] = ref;
                }}
                style={[styles.otpBox, isActive && styles.otpBoxActive]}
                value={digit}
                onChangeText={(value) => handleChange(value, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={index === 0}
              />
            );
          })}
        </View>

        {countdown > 0 ? (
          <Text style={styles.timerText}>Resend in {formatCountdown()}</Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.8}>
            <Text style={styles.resendText}>{resending ? "Sending..." : "Resend OTP"}</Text>
          </TouchableOpacity>
        )}

        <GradientButton title="Verify" onPress={handleVerify} loading={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 28,
  },
  otpBox: {
    width: 52,
    height: 64,
    borderWidth: 2,
    borderColor: '#FFE8EC',
    borderRadius: 16,
    fontSize: 24,
    fontWeight: "700",
    color: '#1A1A2E',
    backgroundColor: '#FFFFFF',
  },
  otpBoxActive: {
    borderColor: '#FF4458',
  },
  timerText: {
    textAlign: "center",
    color: colors.textSecondary,
    marginBottom: 28,
    fontSize: 14,
  },
  resendText: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 28,
    fontSize: 15,
  },
});
