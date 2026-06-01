import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import SwipeCard, { CARD_HEIGHT } from "../../components/SwipeCard";
import MatchAnimation from "../../components/MatchAnimation";
import { useSwipeStore } from "../../store/swipeStore";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";
import * as api from "../../services/api";

export default function Discover() {
  const { feedUsers, isLoading, loadFeed, swipeAction, limitError, clearLimitError } = useSwipeStore();
  const loadMatches = useMatchStore((state) => state.loadMatches);
  const addMatch = useMatchStore((state) => state.addMatch);
  const user = useAuthStore((state) => state.user);
  
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Premium/Limit states
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState('likes');

  // Load feed and payment status on mount
  useEffect(() => {
    loadFeed().catch((error) => {
      Alert.alert("Error", error.message || "Failed to load feed");
    });
    
    // Fetch payment status
    api.getPaymentStatus()
      .then(res => setPaymentStatus(res?.data))
      .catch(() => {}); // Silently fail
  }, [loadFeed]);

  // Show limit modal when limitError changes
  useEffect(() => {
    if (limitError) {
      setLimitType(limitError.code === 'SUPER_LIKE_LIMIT' ? 'superlike' : 'likes');
      setShowLimitModal(true);
    }
  }, [limitError]);

  const handleSwipe = async (direction) => {
    const currentUser = feedUsers[0];
    if (!currentUser || actionLoading) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await swipeAction(currentUser.id, direction);

      if (result?.matched) {
        setMatchedUser(currentUser);
        setMatchId(result.matchId);
        setShowMatchAnimation(true);
        addMatch({
          id: result.matchId,
          matchedAt: new Date().toISOString(),
          otherUser: currentUser,
          lastMessage: null,
        });
        loadMatches().catch(() => {});
      }
    } catch (error) {
      if (error.response?.status === 402) {
        // Limit error is already handled by limitError state
        return;
      }
      Alert.alert("Swipe failed", error.message || "Could not complete swipe");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = () => {
    const id = matchId;
    setShowMatchAnimation(false);
    if (id) {
      router.push(`/chat/${id}`);
    }
  };

  const handleKeepSwiping = () => {
    setShowMatchAnimation(false);
    setMatchedUser(null);
  };

  const handleCloseLimitModal = () => {
    setShowLimitModal(false);
    clearLimitError();
  };

  const handleUpgradePremium = () => {
    handleCloseLimitModal();
    router.push("/premium");
  };

  const visibleUsers = feedUsers.slice(0, 3);
  const isPremium = paymentStatus?.isPremium;
  const likesRemaining = paymentStatus?.dailyLikesRemaining ?? 0;

  return (
    <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Text style={styles.logo}>VoiceMatch</Text>
          <View style={styles.topBarRight}>
            {/* Like Counter */}
            <TouchableOpacity 
              style={styles.likeCounter}
              onPress={() => router.push("/premium")}
              activeOpacity={0.8}
            >
              <Text style={styles.likeCounterEmoji}>❤️</Text>
              <Text style={styles.likeCounterText}>
                {isPremium ? '∞' : likesRemaining}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.topIcons}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={24} color="#1A1A2E" />
              </TouchableOpacity>
              {/* Settings/gear icon removed per request */}
            </View>
          </View>
        </View>

        <View style={styles.cardArea}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : visibleUsers.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="flame-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No more profiles</Text>
              <Text style={styles.emptySub}>Check back later for new voices</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => loadFeed()} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color={colors.text} />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardStack}>
              {visibleUsers
                .slice()
                .reverse()
                .map((feedUser, index, array) => {
                  const isTop = index === array.length - 1;
                  const stackIndex = array.length - 1 - index;
                  return (
                    <SwipeCard
                      key={feedUser.id}
                      user={feedUser}
                      isTop={isTop}
                      stackIndex={stackIndex}
                      onSwipeLeft={() => handleSwipe("pass")}
                      onSwipeRight={() => handleSwipe("like")}
                    />
                  );
                })}
            </View>
          )}
        </View>

        {visibleUsers.length > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.passBtn}
              onPress={() => handleSwipe("pass")}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color="#CCCCCC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.starBtn}
              onPress={() => handleSwipe("superlike")}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={26} color="#FFD700" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSwipe("like")}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#FF4458', '#FF2D55']} style={styles.likeBtn}>
                <Ionicons name="heart" size={30} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Limit Modal */}
        <Modal
          visible={showLimitModal}
          transparent
          animationType="slide"
          onRequestClose={handleCloseLimitModal}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={handleCloseLimitModal}
          >
            <View style={styles.modalContent}>
              <Pressable>
                <View style={styles.modalCard}>
                  {/* Close button */}
                  <TouchableOpacity 
                    style={styles.modalClose} 
                    onPress={handleCloseLimitModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>

                  {/* Icon */}
                  <Ionicons 
                    name="lock" 
                    size={56} 
                    color="#FF4458" 
                    style={styles.modalIcon} 
                  />

                  {/* Title */}
                  <Text style={styles.modalTitle}>Daily Limit Reached! 🔒</Text>

                  {/* Subtitle */}
                  <Text style={styles.modalSubtitle}>
                    {limitType === 'superlike' 
                      ? "You've used all your free super likes for today"
                      : "You've used all your free likes for today"}
                  </Text>

                  {/* Reset timer */}
                  {limitError?.resetsIn && (
                    <Text style={styles.modalTimer}>
                      ⏰ Resets in {limitError.resetsIn}
                    </Text>
                  )}

                  {/* Features list */}
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="heart" size={16} color={colors.primary} />
                      <Text style={styles.featureItemText}>Unlimited daily likes</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="star" size={16} color={colors.primary} />
                      <Text style={styles.featureItemText}>5 super likes/day</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="flash" size={16} color={colors.primary} />
                      <Text style={styles.featureItemText}>Weekly profile boost</Text>
                    </View>
                  </View>

                  {/* Upgrade button */}
                  <TouchableOpacity 
                    onPress={handleUpgradePremium}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FF4458', '#FF2D55']}
                      style={styles.upgradeBtn}
                    >
                      <Ionicons name="diamond" size={18} color="white" />
                      <Text style={styles.upgradeBtnText}>Get Premium ₹99/month</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Dismiss button */}
                  <TouchableOpacity 
                    onPress={handleCloseLimitModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dismissBtn}>Wait for reset</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <MatchAnimation
          visible={showMatchAnimation}
          currentUser={user}
          matchedUser={matchedUser}
          onMessage={handleSendMessage}
          onKeepSwiping={handleKeepSwiping}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: '#FF4458',
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  likeCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: 'rgba(255, 68, 88, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  likeCounterEmoji: {
    fontSize: 16,
  },
  likeCounterText: {
    fontSize: 14,
    fontWeight: "600",
    color: '#FF4458',
  },
  topIcons: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  cardArea: {
    flex: 1,
    paddingTop: 4,
    alignItems: 'center',
  },
  cardStack: {
    position: "relative",
    height: CARD_HEIGHT,
    width: '100%',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: '#1A1A2E',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshText: {
    color: '#FFFFFF',
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingBottom: 16,
    paddingTop: 16,
  },
  passBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  starBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  likeBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalTimer: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  featuresList: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureItemText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 26,
    marginBottom: 12,
  },
  upgradeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  dismissBtn: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
});
