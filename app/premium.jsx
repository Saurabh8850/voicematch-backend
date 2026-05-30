import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as api from "../services/api";
import colors from "../constants/colors";

const PLANS = [
  {
    id: "monthly",
    title: "Monthly",
    price: "₹299/month",
    badge: null,
    badgeColor: colors.primary,
    highlighted: false,
  },
  {
    id: "quarterly",
    title: "Quarterly",
    price: "₹699/3 months",
    badge: "Most Popular",
    badgeColor: colors.popularBadge,
    highlighted: true,
  },
  {
    id: "yearly",
    title: "Yearly",
    price: "₹1999/year",
    badge: "Best Value",
    badgeColor: colors.valueBadge,
    highlighted: false,
  },
];

const FEATURES = [
  "Unlimited swipes",
  "See who liked you",
  "Profile boost",
  "Priority matching",
];

export default function PremiumScreen() {
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleSubscribe = async (plan) => {
    setLoadingPlan(plan);
    try {
      const response = await api.createOrder(plan);
      const order = response.data;
      Alert.alert(
        "Razorpay Checkout",
        `Order created: ${order.orderId}\nAmount: ₹${Number(order.amount) / 100}\n\nNative Razorpay SDK requires a development build. Complete payment in production.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Payment error", error.message || "Could not create order");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Go Premium</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="diamond" size={56} color={colors.gold} style={styles.crown} />

        {PLANS.map((plan) => (
          <View
            key={plan.id}
            style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}
          >
            {plan.badge && (
              <View style={[styles.badge, { backgroundColor: plan.badgeColor }]}>
                <Text style={styles.badgeText}>{plan.badge}</Text>
              </View>
            )}

            <Text style={styles.planTitle}>{plan.title}</Text>
            <Text style={styles.planPrice}>{plan.price}</Text>

            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => handleSubscribe(plan.id)}
              disabled={loadingPlan === plan.id}
            >
              {loadingPlan === plan.id ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.subscribeText}>Subscribe</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  crown: {
    alignSelf: "center",
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardHighlighted: {
    backgroundColor: colors.cardHighlight,
    borderColor: colors.primary,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  planPrice: {
    fontSize: 16,
    color: colors.grayDark,
    marginTop: 4,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    color: colors.text,
    fontSize: 14,
  },
  subscribeButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  subscribeText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
