import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";

const GENDERS = [
  { label: "Man", value: "male" },
  { label: "Woman", value: "female" },
  { label: "Non-binary", value: "non-binary" },
];

const INTERESTS = [
  { label: "Men", value: "male" },
  { label: "Women", value: "female" },
  { label: "Everyone", value: "everyone" },
];

export default function BasicInfoScreen() {
  const updateUser = useAuthStore((state) => state.updateUser);
  const [name, setName] = useState("");
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }
    if (!age) {
      Alert.alert("Missing age", "Please select your age.");
      return;
    }
    if (!gender) {
      Alert.alert("Missing gender", "Please select your gender.");
      return;
    }
    if (!interestedIn) {
      Alert.alert("Missing preference", "Please select who you are interested in.");
      return;
    }

    setLoading(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        age,
        gender,
        bio: "",
      });
      await api.updatePreferences({
        minAge: 18,
        maxAge: 60,
        preferredGender: interestedIn,
        maxDistance: 50,
      });
      updateUser({ full_name: name.trim(), gender });
      router.push("/(onboarding)/photos");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: "33%" }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Tell us about you</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.grayMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Age</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ageScroll}>
          {Array.from({ length: 43 }, (_, index) => 18 + index).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.ageChip, age === value && styles.ageChipSelected]}
              onPress={() => setAge(value)}
            >
              <Text style={[styles.ageText, age === value && styles.ageTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Gender</Text>
        <View style={styles.row}>
          {GENDERS.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.choiceBox, gender === item.value && styles.choiceBoxSelected]}
              onPress={() => setGender(item.value)}
            >
              <Text style={[styles.choiceText, gender === item.value && styles.choiceTextSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Interested in</Text>
        <View style={styles.row}>
          {INTERESTS.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.choiceBox, interestedIn === item.value && styles.choiceBoxSelected]}
              onPress={() => setInterestedIn(item.value)}
            >
              <Text
                style={[styles.choiceText, interestedIn === item.value && styles.choiceTextSelected]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
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
  content: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.grayDark,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  ageScroll: {
    marginBottom: 8,
  },
  ageChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: colors.white,
  },
  ageChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ageText: {
    color: colors.text,
    fontWeight: "600",
  },
  ageTextSelected: {
    color: colors.white,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  choiceBox: {
    flex: 1,
    minWidth: "30%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  choiceBoxSelected: {
    borderColor: colors.primary,
  },
  choiceText: {
    color: colors.text,
    fontWeight: "600",
  },
  choiceTextSelected: {
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
