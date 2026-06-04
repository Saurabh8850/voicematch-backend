import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { sendOtpViaFirebase } from "../../services/firebaseAuth";
import GradientButton from "../../components/GradientButton";
import colors from "../../constants/colors";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Login screen mounted");
  }, []);

  const handleSendOtp = async () => {
    console.log("Send OTP pressed", phone);
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      await sendOtpViaFirebase(cleaned);
      router.push({ pathname: "/(auth)/otp", params: { phone: cleaned } });
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.hero}>
            <View style={styles.logoArea}>
              <View style={styles.logoGlow} />
              <Ionicons name="flame" size={64} color={colors.primary} />
              <Text style={styles.logo}>VoiceMatch</Text>
              <Text style={styles.tagline}>Where voices connect hearts</Text>
            </View>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.heading}>Welcome back 👋</Text>
            <Text style={styles.subheading}>Sign in to continue</Text>

            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, ""))}
              />
            </View>

            <GradientButton
              title="Continue →"
              onPress={handleSendOtp}
              loading={loading}
              style={styles.continueBtn}
            />

            <Text style={styles.legal}>
              By continuing you agree to our Terms & Privacy Policy
            </Text>
          </View>
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
  },
  hero: {
    flex: 0.45,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  logoArea: {
    alignItems: "center",
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF4458',
    opacity: 0.08,
  },
  logo: {
    fontSize: 42,
    fontWeight: "800",
    color: '#1A1A2E',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    fontStyle: "italic",
    marginTop: 8,
  },
  sheet: {
    flex: 0.55,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: '#1A1A2E',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 28,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  prefixBox: {
    backgroundColor: '#FFF5F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: "center",
  },
  prefixText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  phoneInput: {
    flex: 1,
    height: 56,
    backgroundColor: '#FFF5F7',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#FFE8EC',
  },
  continueBtn: {
    marginBottom: 20,
  },
  legal: {
    fontSize: 12,
    color: '#999999',
    textAlign: "center",
    lineHeight: 18,
  },
});
