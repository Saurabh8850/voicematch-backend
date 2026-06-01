import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BackHeader from '../components/BackHeader';
import { colors } from '../constants/colors';
import * as api from '../services/api';
import { useAuthStore } from '../store/authStore';

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '₹99',
    period: '/month',
    totalPrice: '₹99',
    perMonth: '₹99/mo',
    badge: null,
    color: ['#FF4458', '#FF6B7A'],
  },
  {
    id: 'quarterly', 
    name: 'Quarterly',
    price: '₹299',
    period: '/3 months',
    totalPrice: '₹299',
    perMonth: '₹99.6/mo',
    badge: 'MOST POPULAR',
    badgeColor: '#FF4458',
    color: ['#FF4458', '#E03347'],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '₹599',
    period: '/year',
    totalPrice: '₹599',
    perMonth: '₹49.9/mo',
    badge: 'BEST VALUE',
    badgeColor: '#FF8C00',
    color: ['#FF8C00', '#FF4458'],
  },
];

const FEATURES = [
  { icon: 'heart', text: 'Unlimited Daily Likes', free: '10/day', premium: 'Unlimited' },
  { icon: 'star', text: 'Super Likes', free: '2/day', premium: '5/day' },
  { icon: 'eye', text: 'See Who Liked You', free: false, premium: true },
  { icon: 'mic', text: 'Voice Room', free: '30 min/day', premium: 'Unlimited' },
  { icon: 'sparkles', text: 'AI Icebreakers', free: '3/day', premium: 'Unlimited' },
  { icon: 'flash', text: 'Profile Boost', free: false, premium: '1/week' },
  { icon: 'refresh', text: 'Rewind Last Swipe', free: false, premium: true },
  { icon: 'checkmark-circle', text: 'Read Receipts', free: false, premium: true },
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuthStore();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const orderRes = await api.createOrder(selectedPlan);
      if (!orderRes?.data?.orderId) throw new Error('Order failed');
      
      // For now show success (Razorpay native SDK needs APK build)
      Alert.alert(
        '🎉 Almost there!',
        `Order created for ${PLANS.find(p => p.id === selectedPlan)?.price}. Razorpay payment will work in the production APK build.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Could not create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BackHeader title="VoiceMatch Premium" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={['#FF4458', '#FF8C00']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.hero}
        >
          <Text style={styles.crownEmoji}>👑</Text>
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlimited likes, voice rooms & more
          </Text>
        </LinearGradient>

        {/* Plan Cards */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.8}
            >
              {selectedPlan === plan.id ? (
                <LinearGradient
                  colors={plan.color}
                  style={styles.planCardSelected}
                >
                  {plan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <View style={styles.planRow}>
                    <View>
                      <Text style={styles.planNameSelected}>{plan.name}</Text>
                      <Text style={styles.planPerMonth}>{plan.perMonth}</Text>
                    </View>
                    <View style={styles.planPriceBox}>
                      <Text style={styles.planPriceSelected}>{plan.price}</Text>
                      <Text style={styles.planPeriodSelected}>{plan.period}</Text>
                    </View>
                  </View>
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.planCard}>
                  {plan.badge && (
                    <View style={[styles.badge, { backgroundColor: plan.badgeColor }]}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <View style={styles.planRow}>
                    <View>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPerMonthGray}>{plan.perMonth}</Text>
                    </View>
                    <View style={styles.planPriceBox}>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Features Comparison */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What you get</Text>
          
          {/* Header row */}
          <View style={styles.featureHeader}>
            <Text style={[styles.featureHeaderText, { flex: 2 }]}>Feature</Text>
            <Text style={styles.featureHeaderText}>Free</Text>
            <Text style={[styles.featureHeaderText, { color: colors.primary }]}>Premium</Text>
          </View>

          {FEATURES.map((feature, index) => (
            <View key={index} style={[
              styles.featureRow,
              index % 2 === 0 && styles.featureRowAlt
            ]}>
              <View style={styles.featureLeft}>
                <Ionicons name={feature.icon} size={18} color={colors.primary} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
              
              <Text style={styles.featureFree}>
                {feature.free === false ? '❌' : feature.free}
              </Text>
              
              <Text style={styles.featurePremium}>
                {feature.premium === true ? '✅' : feature.premium}
              </Text>
            </View>
          ))}
        </View>

        {/* Subscribe Button */}
        <View style={styles.subscribeSection}>
          <TouchableOpacity onPress={handleSubscribe} disabled={loading} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF4458', '#FF2D55']}
              style={styles.subscribeBtn}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="diamond" size={20} color="white" />
                  <Text style={styles.subscribeBtnText}>
                    Subscribe — {PLANS.find(p => p.id === selectedPlan)?.price}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            Cancel anytime. Billed as per selected plan.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    padding: 32,
    alignItems: 'center',
  },
  crownEmoji: { fontSize: 56, marginBottom: 8 },
  heroTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  
  plansSection: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  planCardSelected: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 18, fontWeight: '700', color: colors.text },
  planNameSelected: { fontSize: 18, fontWeight: '700', color: 'white' },
  planPerMonth: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  planPerMonthGray: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  planPriceBox: { alignItems: 'flex-end' },
  planPrice: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  planPriceSelected: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  planPeriod: { fontSize: 12, color: colors.textMuted },
  planPeriodSelected: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#FF4458',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  selectedCheck: { position: 'absolute', top: 12, right: 12 },

  featuresSection: { paddingHorizontal: 16, marginBottom: 16 },
  featureHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    marginBottom: 4,
  },
  featureHeaderText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  featureRowAlt: { backgroundColor: colors.inputBg },
  featureLeft: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: colors.text, flex: 1 },
  featureFree: { flex: 1, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  featurePremium: { flex: 1, fontSize: 12, color: colors.primary, textAlign: 'center', fontWeight: '600' },

  subscribeSection: { padding: 16, paddingBottom: 32 },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 30,
    marginBottom: 12,
  },
  subscribeBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  disclaimer: { textAlign: 'center', fontSize: 12, color: colors.textMuted },
});
