import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MatchAnimation({ visible, currentUser, matchedUser, onMessage, onKeepSwiping }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const leftPhoto = useRef(new Animated.Value(-width/2)).current;
  const rightPhoto = useRef(new Animated.Value(width/2)).current;
  const heartsY = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (visible) {
      // Reset
      opacity.setValue(0);
      scale.setValue(0.5);
      leftPhoto.setValue(-width/2);
      rightPhoto.setValue(width/2);
      heartsY.forEach(h => h.setValue(0));

      // Animate in sequence
      Animated.sequence([
        // Fade in overlay
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Photos slide in
        Animated.parallel([
          Animated.spring(leftPhoto, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(rightPhoto, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Float hearts continuously
      heartsY.forEach((h, i) => {
        Animated.loop(
          Animated.timing(h, {
            toValue: -300,
            duration: 2000 + i * 300,
            delay: i * 200,
            useNativeDriver: true,
          })
        ).start();
      });
    }
  }, [visible]);

  const heartPositions = [60, 120, 190, 260, 320];
  const heartOpacities = heartsY.map(h =>
    h.interpolate({ inputRange: [-300, -150, 0], outputRange: [0, 1, 0] })
  );

  const currentPhoto = currentUser?.profile_photo_urls?.[0];
  const matchedPhoto = matchedUser?.profile_photo_urls?.[0];
  const matchedName = matchedUser?.full_name || matchedUser?.name || 'Someone';

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.container, { opacity }]}>
        
        {/* Floating hearts */}
        {heartsY.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.floatingHeart,
              {
                left: heartPositions[i],
                transform: [{ translateY: h }],
                opacity: heartOpacities[i],
              }
            ]}
          >
            <Ionicons name="heart" size={24 + i * 4} color="#FF4458" />
          </Animated.View>
        ))}

        {/* Match title */}
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', marginBottom: 40 }}>
          <Text style={styles.matchEmoji}>💕</Text>
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <Text style={styles.matchSubtitle}>
            You and {matchedName} liked each other
          </Text>
        </Animated.View>

        {/* Photos row */}
        <View style={styles.photosRow}>
          {/* Current user photo - slides from left */}
          <Animated.View style={[styles.photoWrapper, { transform: [{ translateX: leftPhoto }] }]}>
            <LinearGradient
              colors={['#FF4458', '#FF6B7A']}
              style={styles.photoGradientBorder}
            >
              {currentPhoto ? (
                <Image source={{ uri: currentPhoto }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Text style={styles.photoInitial}>
                    {(currentUser?.full_name || currentUser?.name || 'Y')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Heart in middle */}
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="heart" size={40} color="#FF4458" />
          </Animated.View>

          {/* Matched user photo - slides from right */}
          <Animated.View style={[styles.photoWrapper, { transform: [{ translateX: rightPhoto }] }]}>
            <LinearGradient
              colors={['#FF4458', '#FF6B7A']}
              style={styles.photoGradientBorder}
            >
              {matchedPhoto ? (
                <Image source={{ uri: matchedPhoto }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Text style={styles.photoInitial}>
                    {matchedName[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity onPress={onMessage} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF4458', '#FF2D55']}
              style={styles.sendBtn}
            >
              <Ionicons name="chatbubble" size={20} color="white" />
              <Text style={styles.sendBtnText}>Send Message</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onKeepSwiping} style={styles.keepBtn} activeOpacity={0.8}>
            <Text style={styles.keepBtnText}>Keep Swiping</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  floatingHeart: {
    position: 'absolute',
    bottom: 100,
  },
  matchEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  matchTitle: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  matchSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 48,
  },
  photoWrapper: {},
  photoGradientBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  photoPlaceholder: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 28,
  },
  sendBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  keepBtn: {
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
  },
  keepBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
});
