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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CONFIG } from "../../constants/config";
import colors from "../../constants/colors";

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    if (photos.length < 2) {
      Alert.alert("More photos needed", "Please add at least 2 photos to continue.");
      return;
    }
    router.push("/(onboarding)/voice-intro");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: "66%" }]} />
      </View>

      <Text style={styles.title}>Add your photos</Text>
      <Text style={styles.subtitle}>Add at least 2 photos to continue</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {photos.map((photo, index) => (
          <View key={`${photo.url}-${index}`} style={styles.slot}>
            <Image source={{ uri: photo.url || photo.uri }} style={styles.photo} />
            <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(index)}>
              <Ionicons name="close" size={16} color={colors.text} />
            </TouchableOpacity>
            {index === 0 && <Text style={styles.mainLabel}>Main Photo</Text>}
          </View>
        ))}

        {photos.length < 6 && (
          <TouchableOpacity style={styles.emptySlot} onPress={pickImage} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="add" size={28} color={colors.primary} />
                <Text style={styles.addText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.testBtn} onPress={addTestPhoto} disabled={uploading}>
        <Text style={styles.testBtnText}>Add Test Photo (Emulator)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, (photos.length < 2 || uploading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={photos.length < 2 || uploading}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
    backgroundColor: colors.surface,
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 12,
  },
  slot: {
    width: "47%",
    height: 200,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  emptySlot: {
    width: "47%",
    height: 200,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  addText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.overlayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mainLabel: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  testBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  testBtnText: {
    color: colors.textSecondary,
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
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
