import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { ShopLicense } from '../types';

interface HomeScreenProps {
  license: ShopLicense | null;
  onNavigate: (screen: 'create-bill' | 'search' | 'settings' | 'activate') => void;
  totalBills: number;
}

export function HomeScreen({ license, onNavigate, totalBills }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topBar}>
            <View style={styles.badgeContainer}>
              <View style={[styles.badgeDot, { backgroundColor: license ? '#4CAF50' : '#FF9800' }]} />
              <Text style={styles.badgeText}>
                {license ? license.tenant_name : 'Shop Not Activated'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsIconBtn}
              onPress={() => onNavigate('settings')}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIconText}>⚙</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.appName}>TailorBook</Text>
          <Text style={styles.subtitle}>Your tailoring shop, organized.</Text>

          {/* Quick Counter */}
          <View style={styles.counterBox}>
            <Text style={styles.counterNumber}>{totalBills}</Text>
            <Text style={styles.counterLabel}>Local Bills Stored</Text>
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
            <Text style={styles.buttonIcon}>＋</Text>
            <View>
              <Text style={styles.buttonTitle}>Create New Bill</Text>
              <Text style={styles.buttonSubtitle}>Record bill number & capture photo</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => onNavigate('search')}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonIcon, styles.buttonIconSecondary]}>⌕</Text>
            <View>
              <Text style={[styles.buttonTitle, styles.buttonTitleSecondary]}>
                Search Existing Bills
              </Text>
              <Text style={styles.buttonSubtitleSecondary}>
                Search by bill number, phone, or voice
              </Text>
            </View>
          </TouchableOpacity>

          {!license && (
            <TouchableOpacity
              style={styles.activationNotice}
              onPress={() => onNavigate('activate')}
              activeOpacity={0.8}
            >
              <Text style={styles.activationNoticeText}>
                ⚠️ Tap here to activate your shop license
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footerNote}>100% Offline · Private · Fast</Text>
      </View>
    </SafeAreaView>
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
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#E0EEF9',
    fontSize: 13,
    fontWeight: '600',
  },
  settingsIconBtn: {
    padding: 8,
  },
  settingsIconText: {
    color: '#E0EEF9',
    fontSize: 22,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#A8C4DF',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  counterBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  counterNumber: {
    color: ACCENT,
    fontSize: 24,
    fontWeight: '800',
  },
  counterLabel: {
    color: '#B0C9E0',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  divider: {
    height: 4,
    backgroundColor: ACCENT,
  },
  actions: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    gap: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonPrimary: {
    backgroundColor: BRAND_MID,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: BRAND_MID,
  },
  buttonIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    marginRight: 16,
    lineHeight: 34,
  },
  buttonIconSecondary: {
    color: BRAND_MID,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  buttonTitleSecondary: {
    color: BRAND_MID,
  },
  buttonSubtitle: {
    fontSize: 12,
    color: '#CFE2F3',
  },
  buttonSubtitleSecondary: {
    fontSize: 12,
    color: '#557291',
  },
  activationNotice: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEEBA',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  activationNoticeText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: '#7B8FA1',
    fontSize: 12,
    letterSpacing: 1.2,
    paddingBottom: 20,
    textTransform: 'uppercase',
  },
});

