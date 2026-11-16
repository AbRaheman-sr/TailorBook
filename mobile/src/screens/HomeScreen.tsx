import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { ShopLicense } from '../types';

interface HomeScreenProps {
  license: ShopLicense | null;
  onNavigate: (screen: 'create-bill' | 'search' | 'settings' | 'activate') => void;
  totalBills: number;
}

export function HomeScreen({ license, onNavigate, totalBills }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 12;
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Safe Area Notch Inset */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <View style={styles.topBar}>
            <View style={styles.badgeContainer}>
              <Ionicons
                name="storefront-outline"
                size={14}
                color={license ? '#4ADE80' : '#FBBF24'}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.badgeText}>
                {license ? license.tenant_name : 'Shop Not Activated'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsIconBtn}
              onPress={() => onNavigate('settings')}
              activeOpacity={0.7}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color="#E0EEF9" />
            </TouchableOpacity>
          </View>

          <View style={styles.logoRow}>
            <Feather name="scissors" size={26} color="#F5A623" style={{ marginRight: 8 }} />
            <Text style={styles.appName}>TailorBook</Text>
          </View>
          <Text style={styles.subtitle}>Your tailoring shop, organized.</Text>

          {/* Quick Counter */}
          <View style={styles.counterBox}>
            <View style={styles.counterIconWrapper}>
              <Ionicons name="receipt-outline" size={22} color="#F5A623" />
            </View>
            <View style={styles.counterContent}>
              <Text style={styles.counterNumber}>{totalBills}</Text>
              <Text style={styles.counterLabel}>Customer Bills Stored</Text>
            </View>
          </View>
        </View>

        {/* Accent Divider */}
        <View style={styles.divider} />

        {/* Primary Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => onNavigate('create-bill')}
            activeOpacity={0.85}
          >
            <View style={styles.buttonIconBadgePrimary}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.buttonTextWrapper}>
              <Text style={styles.buttonTitle}>Create Customer Bill</Text>
              <Text style={styles.buttonSubtitle}>Record customer bill # & capture receipt photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => onNavigate('search')}
            activeOpacity={0.85}
          >
            <View style={styles.buttonIconBadgeSecondary}>
              <Ionicons name="search" size={20} color="#1A3C5E" />
            </View>
            <View style={styles.buttonTextWrapper}>
              <Text style={[styles.buttonTitle, styles.buttonTitleSecondary]}>
                Search Customer Bills
              </Text>
              <Text style={styles.buttonSubtitleSecondary}>
                Search by bill number or customer mobile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Footer with Bottom Inset */}
        <View style={[styles.footerRow, { paddingBottom: bottomPadding }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.footerNote}>TailorBook · 100% Offline & Private</Text>
        </View>
      </View>
    </View>
  );
}

const BRAND_DARK = '#1A3C5E';
const BRAND_MID = '#2B5C8A';
const ACCENT = '#F5A623';
const BG = '#F4F6F9';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_DARK,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    backgroundColor: BRAND_DARK,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#E0EEF9',
    fontSize: 13,
    fontWeight: '600',
  },
  settingsIconBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.1,
  },
  subtitle: {
    fontSize: 13,
    color: '#A8C4DF',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    width: '100%',
    maxWidth: 280,
  },
  counterIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  counterContent: {
    flex: 1,
  },
  counterNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  counterLabel: {
    color: '#B0C9E0',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  divider: {
    height: 3,
    backgroundColor: ACCENT,
  },
  actions: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  buttonPrimary: {
    backgroundColor: BRAND_MID,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  buttonIconBadgePrimary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  buttonIconBadgeSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  buttonTextWrapper: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  buttonTitleSecondary: {
    color: '#1A3C5E',
  },
  buttonSubtitle: {
    fontSize: 12,
    color: '#CFE2F3',
    lineHeight: 16,
  },
  buttonSubtitleSecondary: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerNote: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});
