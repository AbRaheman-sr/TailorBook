import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import {
  activateShop,
  testBackendConnection,
  normalizeServerUrl,
  DEFAULT_SERVER_URL,
} from '../services/auth.service';
import { showToast } from '../services/toast.service';
import { ShopLicense } from '../types';

interface ActivationScreenProps {
  currentLicense: ShopLicense | null;
  onBack?: () => void;
  onActivated: (license: ShopLicense) => void;
}

export function ActivationScreen({
  currentLicense,
  onBack,
  onActivated,
}: ActivationScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Test backend connectivity before submitting credentials
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const normalized = normalizeServerUrl(serverUrl);
      if (normalized !== serverUrl) {
        setServerUrl(normalized);
      }
      const res = await testBackendConnection(normalized);
      setTestResult(res);
      if (res.success) {
        showToast.success('Server Online', 'Backend connected to Supabase database!');
      } else {
        showToast.error('Connection Failed', res.message);
      }
    } catch (err: any) {
      const msg = err.message || 'Unknown network error.';
      setTestResult({ success: false, message: msg });
      showToast.error('Connection Error', msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleActivate = async () => {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      showToast.error('Required Fields', 'Please enter your shop username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const normalized = normalizeServerUrl(serverUrl);
      if (normalized !== serverUrl) {
        setServerUrl(normalized);
      }
      const result = await activateShop(normalized, cleanUser, cleanPass);
      if (result.success && result.license) {
        showToast.success('Shop Authorized', `Welcome, ${result.license.tenant_name}!`);
        onActivated(result.license);
      } else {
        showToast.error('Authorization Failed', result.message);
      }
    } catch (err: any) {
      showToast.error('Error', err.message || 'Activation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#E0EEF9" />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Text style={styles.headerTitle}>TailorBook</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo / Branding Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Feather name="scissors" size={30} color="#F5A623" />
            </View>
            <Text style={styles.brandTitle}>Shop Authorization</Text>
            <Text style={styles.brandSubtitle}>
              Enter credentials assigned by your administrator to activate this device. Once authorized, TailorBook functions seamlessly both online and offline.
            </Text>
          </View>

          {currentLicense && (
            <View style={styles.activeBanner}>
              <Ionicons name="checkmark-circle" size={22} color="#16A34A" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBannerTitle}>Currently Active</Text>
                <Text style={styles.activeBannerText}>Shop: {currentLicense.tenant_name}</Text>
                <Text style={styles.activeBannerSub}>Device: {currentLicense.device_id}</Text>
              </View>
            </View>
          )}

          {/* Login Card */}
          <View style={styles.formCard}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Username *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. startailor"
                  placeholderTextColor="#9AA6B2"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Password *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter shop password"
                  placeholderTextColor="#9AA6B2"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Server URL */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Backend Server URL</Text>
                <TouchableOpacity
                  onPress={() => setServerUrl(DEFAULT_SERVER_URL)}
                  style={styles.resetBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={13} color="#2B5C8A" style={{ marginRight: 4 }} />
                  <Text style={styles.resetBtnText}>Default</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="globe-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="https://your-domain.com/api"
                  placeholderTextColor="#9AA6B2"
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Network Tip */}
              <View style={styles.networkNote}>
                <Ionicons name="information-circle-outline" size={16} color="#0369A1" style={{ marginRight: 6 }} />
                <Text style={styles.networkNoteText}>
                  <Text style={{ fontWeight: '700' }}>Mobile Data & Wi-Fi:</Text> Works seamlessly over 4G/5G mobile data and local Wi-Fi.
                </Text>
              </View>

              {/* Test Connection Button */}
              <TouchableOpacity
                style={[styles.testBtn, isTesting && styles.btnDisabled]}
                onPress={handleTestConnection}
                disabled={isTesting}
                activeOpacity={0.8}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#1A3C5E" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={16} color="#1A3C5E" style={{ marginRight: 6 }} />
                    <Text style={styles.testBtnText}>Test Server Connection</Text>
                  </>
                )}
              </TouchableOpacity>

              {testResult && (
                <View
                  style={[
                    styles.testStatusBox,
                    testResult.success ? styles.testSuccessBox : styles.testErrorBox,
                  ]}
                >
                  <Ionicons
                    name={testResult.success ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={testResult.success ? '#16A34A' : '#DC2626'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.testStatusText,
                      testResult.success ? styles.testSuccessText : styles.testErrorText,
                    ]}
                  >
                    {testResult.success ? 'Server is online and reachable!' : 'Server unreachable. Tap Test Connection.'}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.activateBtn, (isLoading || isTesting) && styles.btnDisabled]}
              onPress={handleActivate}
              disabled={isLoading || isTesting}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.activateBtnText}>Authorize & Unlock App</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.securityBox}>
            <View style={styles.securityHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#1A3C5E" style={{ marginRight: 6 }} />
              <Text style={styles.securityTitle}>Security & Offline Protection</Text>
            </View>
            <Text style={styles.securityText}>
              • Only authorized shops registered in the admin portal can access TailorBook.
            </Text>
            <Text style={styles.securityText}>
              • After initial online authorization, all bills, photos, and searches remain 100% on your device and work completely offline without internet.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BRAND_DARK = '#1A3C5E';
const BRAND_MID = '#2B5C8A';
const ACCENT = '#F5A623';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_DARK,
  },
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  header: {
    backgroundColor: BRAND_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  backBtnText: {
    color: '#E0EEF9',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3C5E',
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 2,
  },
  activeBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  activeBannerSub: {
    fontSize: 11,
    color: '#22C55E',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A3C5E',
    marginBottom: 6,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  resetBtnText: {
    fontSize: 11,
    color: BRAND_MID,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  eyeBtn: {
    padding: 6,
  },
  networkNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  networkNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
  },
  testBtn: {
    marginTop: 10,
    backgroundColor: '#E0EEF9',
    borderWidth: 1,
    borderColor: '#B8D5E5',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: '#1A3C5E',
    fontSize: 13,
    fontWeight: '700',
  },
  testStatusBox: {
    marginTop: 8,
    padding: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  testSuccessBox: {
    backgroundColor: '#ECFDF5',
  },
  testErrorBox: {
    backgroundColor: '#FEF2F2',
  },
  testStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testSuccessText: {
    color: '#15803D',
  },
  testErrorText: {
    color: '#DC2626',
  },
  activateBtn: {
    backgroundColor: BRAND_DARK,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  activateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  securityBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A3C5E',
  },
  securityText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 4,
  },
});
