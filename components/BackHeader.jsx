import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';

export default function BackHeader({ title, rightComponent, onBack }) {
  const insets = useSafeAreaInsets();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </TouchableOpacity>
      
      {title ? (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      
      {rightComponent ? (
        <View style={styles.right}>{rightComponent}</View>
      ) : (
        <View style={styles.rightEmpty} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.inputBg,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  rightEmpty: {
    width: 40,
  },
});
