import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as api from "../services/api";
import colors from "../constants/colors";

export default function IcebreakerModal({ visible, matchId, onSelect, onClose }) {
  const [icebreakers, setIcebreakers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadIcebreakers = async () => {
    if (!matchId) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await api.getIcebreakers(matchId);
      setIcebreakers(response.data?.icebreakers || []);
    } catch (err) {
      setError(err.message || "Failed to load icebreakers");
      setIcebreakers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && matchId) {
      loadIcebreakers();
    }
  }, [visible, matchId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>AI Icebreakers ✨</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={loadIcebreakers}>
                <Text style={styles.refreshText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {icebreakers.map((suggestion, index) => (
                <TouchableOpacity
                  key={`${index}-${suggestion}`}
                  style={styles.card}
                  onPress={() => {
                    onSelect?.(suggestion);
                    onClose?.();
                  }}
                >
                  <Text style={styles.cardText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
              {icebreakers.length === 0 && (
                <Text style={styles.emptyText}>No suggestions available right now.</Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.refreshButton} onPress={loadIcebreakers} disabled={isLoading}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
            <Text style={styles.refreshText}>Refresh suggestions</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  list: {
    gap: 12,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: colors.grayLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyText: {
    textAlign: "center",
    color: colors.gray,
    paddingVertical: 24,
  },
  errorText: {
    color: colors.primary,
    textAlign: "center",
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: "600",
  },
});
