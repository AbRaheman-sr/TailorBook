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
  activateLocalDemo,
  testBackendConnection,
  normalizeServerUrl,
  DEFAULT_SERVER_URL,
} from '../services/auth.service';
import { ShopLicense } from '../types';

interface ActivationScreenProps {
  currentLicense: ShopLicense | null;
  onBack: () => void;
  onActivated: (license: ShopLicense) => void;
}

export function ActivationScreen({
  currentLicense,
  onBack,
  onActivated,
}: ActivationScreenProps) {
  const [username, setUsername] = useState('startailor');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Test backend connectivity before activation
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
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your shop username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const normalized = normalizeServerUrl(serverUrl);
      if (normalized !== serverUrl) {
        setServerUrl(normalized);
      }
      const result = await activateShop(normalized, username, password);
      if (result.success && result.license) {
        Alert.alert('✓ Activated Successfully', result.message, [
          {
            text: 'OK',
            onPress: () => {
              onActivated(result.license!);
              onBack();
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

  const handlePilotMode = () => {
    Alert.alert(
      'Activate Offline Pilot Mode',
      'This activates TailorBook immediately on your phone without connecting to any backend server. All bills, search, and backup features will work locally 100% offline.\n\nChoose an option:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate "Star Tailor"',
          onPress: async () => {
            const license = await activateLocalDemo('Star Tailor');
            Alert.alert('Activated', `Shop "${license.tenant_name}" is activated in offline mode!`, [
              {
                text: 'OK',
                onPress: () => {
                  onActivated(license);
                  onBack();
                },
              },
            ]);
          },
        },
        {
          text: 'Activate "My Shop"',
          onPress: async () => {
            const license = await activateLocalDemo('My Tailoring Shop');
            Alert.alert('Activated', `Shop "${license.tenant_name}" is activated in offline mode!`, [
              {
                text: 'OK',
                onPress: () => {
                  onActivated(license);
                  onBack();
                },
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shop Activation</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {currentLicense && (
            <View style={styles.activeBanner}>
              <Text style={styles.activeBannerTitle}>✓ Currently Activated</Text>
              <Text style={styles.activeBannerText}>Shop: {currentLicense.tenant_name}</Text>
              <Text style={styles.activeBannerSub}>Device ID: {currentLicense.device_id}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Backend Activation</Text>
          <Text style={styles.sectionSubtitle}>
            Enter the shop credentials created in the TailorBook admin dashboard.
          </Text>

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
              placeholder="Enter shop password"
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
              placeholder="http://192.168.1.24:3000/api"
              placeholderTextColor="#9AA6B2"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Hint Box for Connectivity */}
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                ⚠️ <Text style={{ fontWeight: '700' }}>Local Connection Tip:</Text> Your phone MUST be on the same Wi-Fi router (turn Wi-Fi ON, turn off Mobile Data/4G) and URL must start with <Text style={{ fontWeight: '700' }}>http://</Text> (not https://).
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
                  {testResult.success ? '● Server is online and responding!' : '● Server is unreachable. Tap Test Connection for details.'}
                </Text>
              </View>
            )}
          </View>

          {/* Activate Button */}
          <TouchableOpacity
            style={[styles.activateBtn, (isLoading || isTesting) && styles.btnDisabled]}
            onPress={handleActivate}
            disabled={isLoading || isTesting}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.activateBtnText}>Activate Shop</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR TEST OFFLINE IMMEDIATELY</Text>
            <View style={styles.line} />
          </View>

          {/* Offline Pilot Mode */}
          <TouchableOpacity
            style={styles.pilotBtn}
            onPress={handlePilotMode}
            activeOpacity={0.85}
          >
            <Text style={styles.pilotBtnText}>Activate Offline Pilot Mode (No Server)</Text>
            <Text style={styles.pilotBtnSub}>Instant 100% offline activation for local app testing</Text>
          </TouchableOpacity>
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
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  activeBanner: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  activeBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  activeBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
  },
  activeBannerSub: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3C5E',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 18,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3C5E',
  },
  resetBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  resetBtnText: {
    fontSize: 12,
    color: BRAND_MID,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D0DBE5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212529',
  },
  hintBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#92400E',
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
    backgroundColor: BRAND_MID,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  orText: {
    paddingHorizontal: 12,
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 11,
  },
  pilotBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pilotBtnText: {
    color: '#D97706',
    fontSize: 15,
    fontWeight: '700',
  },
  pilotBtnSub: {
    color: '#92400E',
    fontSize: 11,
    marginTop: 2,
  },
});
