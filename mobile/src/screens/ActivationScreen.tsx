import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  activateShop,
  testBackendConnection,
  normalizeServerUrl,
  DEFAULT_SERVER_URL,
} from '../services/auth.service';
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
      Alert.alert(res.success ? '✓ Server Reached' : '✗ Connection Failed', res.message);
    } catch (err: any) {
      const msg = err.message || 'Unknown network error.';
      setTestResult({ success: false, message: msg });
      Alert.alert('✗ Connection Error', msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleActivate = async () => {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      Alert.alert('Required Fields', 'Please enter your shop username and password.');
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
        Alert.alert('✓ Authorized', result.message, [
          {
            text: 'Open Shop',
            onPress: () => {
              onActivated(result.license!);
            },
          },
        ]);
      } else {
        Alert.alert('Activation Failed', result.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Activation failed.');
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
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
          <Text style={styles.headerTitle}>TailorBook</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo / Branding Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>✂</Text>
            </View>
            <Text style={styles.brandTitle}>Shop Authorization</Text>
            <Text style={styles.brandSubtitle}>
              Enter credentials assigned by your administrator to activate this device. Once authorized, TailorBook functions seamlessly both online and offline.
            </Text>
          </View>

          {currentLicense && (
            <View style={styles.activeBanner}>
              <Text style={styles.activeBannerTitle}>✓ Currently Active</Text>
              <Text style={styles.activeBannerText}>Shop: {currentLicense.tenant_name}</Text>
              <Text style={styles.activeBannerSub}>Device: {currentLicense.device_id}</Text>
            </View>
          )}

          {/* Login Card */}
          <View style={styles.formCard}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Username *</Text>
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

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9AA6B2"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Server URL */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Backend Server URL</Text>
                <TouchableOpacity
                  onPress={() => setServerUrl(DEFAULT_SERVER_URL)}
                  style={styles.resetBtn}
                >
                  <Text style={styles.resetBtnText}>Reset Default</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="https://your-domain.com/api"
                placeholderTextColor="#9AA6B2"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Network Tip */}
              <View style={styles.networkNote}>
                <Text style={styles.networkNoteText}>
                  🌐 <Text style={{ fontWeight: '700' }}>Mobile Data vs Wi-Fi:</Text> For Mobile Data (4G/5G), use your public HTTPS server URL. For local Wi-Fi testing, use http://192.168.1.24:3000/api.
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
                  <Text style={styles.testBtnText}>⚡ Test Connection</Text>
                )}
              </TouchableOpacity>

              {testResult && (
                <View
                  style={[
                    styles.testStatusBox,
                    testResult.success ? styles.testSuccessBox : styles.testErrorBox,
                  ]}
                >
                  <Text
                    style={[
                      styles.testStatusText,
                      testResult.success ? styles.testSuccessText : styles.testErrorText,
                    ]}
                  >
                    {testResult.success ? '● Server is online and reachable!' : '● Server unreachable. Tap Test Connection for details.'}
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
                <Text style={styles.activateBtnText}>Authorize & Unlock App</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.securityBox}>
            <Text style={styles.securityTitle}>🔒 Security & Offline Protection</Text>
            <Text style={styles.securityText}>
              • Only authorized shops registered in the admin portal can access TailorBook.
            </Text>
            <Text style={styles.securityText}>
              • After initial online authorization, all bills, photos, and searches remain 100% on your device and work completely offline without needing internet.
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
    padding: 8,
  },
  backBtnText: {
    color: '#E0EEF9',
    fontSize: 15,
    fontWeight: '600',
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoIcon: {
    fontSize: 28,
    color: ACCENT,
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
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 2,
  },
  activeBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1B5E20',
  },
  activeBannerSub: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
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
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  resetBtnText: {
    fontSize: 11,
    color: BRAND_MID,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  networkNote: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  networkNoteText: {
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
  },
  testBtn: {
    marginTop: 8,
    backgroundColor: '#E0EEF9',
    borderWidth: 1,
    borderColor: '#B8D5E5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#1A3C5E',
    fontSize: 13,
    fontWeight: '700',
  },
  testStatusBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
  },
  testSuccessBox: {
    backgroundColor: '#E8F5E9',
  },
  testErrorBox: {
    backgroundColor: '#FFEBEE',
  },
  testStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testSuccessText: {
    color: '#2E7D32',
  },
  testErrorText: {
    color: '#C62828',
  },
  activateBtn: {
    backgroundColor: BRAND_DARK,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  activateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  securityBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 4,
  },
});
