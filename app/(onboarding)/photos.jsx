import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CONFIG } from "../../constants/config";
import OnboardingProgress from "../../components/OnboardingProgress";
import GradientButton from "../../components/GradientButton";
import BackHeader from "../../components/BackHeader";
import colors from "../../constants/colors";

const SLOT_WIDTH = (Dimensions.get("window").width - 16 * 2 - 12) / 2;
const SLOT_HEIGHT = SLOT_WIDTH * (4 / 3);

const TEST_PHOTOS = [
  "https://picsum.photos/seed/test1/400/600",
  "https://picsum.photos/seed/test2/400/600",
  "https://picsum.photos/seed/test3/400/600",
];

export default function PhotosScreen() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = async (uri, isRemote = false) => {
    if (isRemote) {
      setPhotos((prev) => [...prev, { uri, uploaded: true, url: uri }]);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photos", {
        uri,
        type: "image/jpeg",
        name: "photo.jpg",
      });

      const token = await AsyncStorage.getItem("voicematch_token");
      const response = await fetch(`${CONFIG.API_BASE_URL}/users/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }

      const uploadedUrl = data.data?.photos?.slice(-1)[0] || uri;
      setPhotos((prev) => [...prev, { uri, uploaded: true, url: uploadedUrl }]);
    } catch (error) {
      Alert.alert("Upload failed", error.message || "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const addTestPhoto = () => {
    const url = TEST_PHOTOS[photos.length % TEST_PHOTOS.length];
    uploadPhoto(url, true);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (photos.length < 1) {
      Alert.alert("Photo required", "Please add at least 1 photo to continue.");
      return;
    }
    router.push("/(onboarding)/voice-intro");
  };

  const slots = Array.from({ length: 6 }, (_, i) => photos[i] || null);

  return (
    <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
      <BackHeader title="" />
      <OnboardingProgress step={2} />

      <Text style={styles.title}>Add your best photos 📸</Text>
      <Text style={styles.subtitle}>Your first photo is your main photo</Text>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {slots.map((photo, index) =>
          photo ? (
            <View key={`filled-${index}`} style={styles.slot}>
              <Image source={{ uri: photo.url || photo.uri }} style={styles.photo} />
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Main</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              key={`empty-${index}`}
              style={styles.emptySlot}
              onPress={pickImage}
              disabled={uploading}
              activeOpacity={0.8}
            >
              {uploading && index === photos.length ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="add" size={28} color={colors.primary} />
                  <Text style={styles.addText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      <TouchableOpacity style={styles.testBtn} onPress={addTestPhoto} disabled={uploading} activeOpacity={0.8}>
        <Text style={styles.testBtnText}>Add Test Photo (Emulator)</Text>
      </TouchableOpacity>

      <GradientButton
        title="Continue"
        onPress={handleContinue}
        disabled={photos.length < 1 || uploading}
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 12,
  },
  slot: {
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  mainBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlot: {
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: '#FFB3BC',
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FFFFFF',
  },
  addText: {
    marginTop: 6,
    color: '#666666',
    fontWeight: "600",
    fontSize: 13,
  },
  testBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  testBtnText: {
    color: colors.primary,
    fontWeight: "600",
  },
  footerBtn: {
    marginBottom: 20,
  },
});
