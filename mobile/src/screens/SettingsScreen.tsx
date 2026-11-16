import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ShopLicense } from '../types';
import { createBackupArchive, restoreBackupArchive } from '../services/backup.service';
import { clearLicense } from '../services/auth.service';
import { showToast } from '../services/toast.service';

interface SettingsScreenProps {
  license: ShopLicense | null;
  totalBills: number;
  onBack: () => void;
  onNavigateActivate: () => void;
  onDataChanged: () => void;
}

export function SettingsScreen({
  license,
  totalBills,
  onBack,
  onNavigateActivate,
  onDataChanged,
}: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 12;
  const bottomPadding = Math.max(insets.bottom, 16);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    if (!license) {
      showToast.error('Activation Needed', 'Please activate your shop before creating backups.');
      return;
    }

    setIsBackingUp(true);
    try {
      const result = await createBackupArchive(license.tenant_id, license.tenant_name);
      if (result.success) {
        showToast.success('Backup Complete', 'Backup archive created and ready to save or share.');
      } else {
        showToast.error('Backup Failed', result.error || 'Could not create backup.');
      }
    } catch (err: any) {
      showToast.error('Backup Error', err.message || 'Backup error occurred.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = () => {
    if (!license) {
      showToast.error('Activation Needed', 'Please activate your shop before restoring backups.');
      return;
    }

    Alert.alert(
      'Restore Backup Archive',
      'Restoring will import customer bills and photographs from your selected backup file. Existing records with matching bill numbers will be updated safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select Backup File',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const res = await restoreBackupArchive(license.tenant_id);
              if (res.success) {
                showToast.success('Restore Complete', res.message || 'Bills successfully restored.');
                onDataChanged();
              } else {
                showToast.info('Restore Info', res.message);
              }
            } catch (err: any) {
              showToast.error('Restore Error', err.message || 'Could not restore backup.');
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Shop License',
      'Are you sure you want to deactivate this device? Your customer bill records will remain safe in local offline storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            await clearLicense();
            showToast.info('Shop Deactivated', 'License removed from this device.');
            onDataChanged();
            onNavigateActivate();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Safe Area Notch Inset */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shop Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 24 }]}>
          {/* Shop Account Section */}
          <Text style={styles.sectionHeader}>Shop & Authorization</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="storefront-outline" size={18} color="#2B5C8A" />
                <Text style={styles.infoLabel}>Shop Name</Text>
              </View>
              <Text style={styles.infoValue}>{license ? license.tenant_name : 'Not Activated'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="shield-checkmark-outline" size={18} color={license ? '#2E7D32' : '#C62828'} />
                <Text style={styles.infoLabel}>Device Status</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: license ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[styles.statusText, { color: license ? '#2E7D32' : '#C62828' }]}>
                  {license ? 'Authorized' : 'Unregistered'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="receipt-outline" size={18} color="#2B5C8A" />
                <Text style={styles.infoLabel}>Customer Bills Stored</Text>
              </View>
              <Text style={styles.infoValue}>{totalBills}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.activationActionBtn,
                license ? styles.deactivateBtn : styles.activateBtn,
              ]}
              onPress={license ? handleDeactivate : onNavigateActivate}
              activeOpacity={0.8}
            >
              <Ionicons
                name={license ? 'log-out-outline' : 'key-outline'}
                size={16}
                color={license ? '#D32F2F' : '#2B5C8A'}
              />
              <Text style={[styles.activationActionText, { color: license ? '#D32F2F' : '#2B5C8A' }]}>
                {license ? 'Deactivate Shop on Device' : 'Activate Shop License'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Backup & Restore Section */}
          <Text style={styles.sectionHeader}>Offline Data Backup</Text>
          <View style={styles.card}>
            <Text style={styles.backupDescription}>
              TailorBook works 100% offline. Create regular ZIP backups to safeguard customer bills and measurement photographs.
            </Text>

            <TouchableOpacity
              style={[styles.actionBtn, styles.backupBtn]}
              onPress={handleBackup}
              disabled={isBackingUp}
              activeOpacity={0.8}
            >
              {isBackingUp ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Export Shop Backup (ZIP)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.restoreBtn]}
              onPress={handleRestore}
              disabled={isRestoring}
              activeOpacity={0.8}
            >
              {isRestoring ? (
                <ActivityIndicator color="#1A3C5E" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={20} color="#1A3C5E" />
                  <Text style={[styles.actionBtnText, { color: '#1A3C5E' }]}>
                    Restore Shop Backup
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <Text style={styles.sectionHeader}>Application Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="shirt-outline" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Application</Text>
              </View>
              <Text style={styles.infoValue}>TailorBook</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="pricetag-outline" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Build Version</Text>
              </View>
              <Text style={styles.infoValue}>1.0.0 (Release)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="hardware-chip-outline" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Storage Engine</Text>
              </View>
              <Text style={styles.infoValue}>Private SQLite (Offline)</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const BRAND_DARK = '#1A3C5E';
const BRAND_MID = '#2B5C8A';

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
    paddingBottom: 16,
    minHeight: 56,
  },
  backBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 4,
  },
  activationActionBtn: {
    marginTop: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 6,
  },
  activateBtn: {
    backgroundColor: '#E8F1F8',
  },
  deactivateBtn: {
    backgroundColor: '#FFEBEE',
  },
  activationActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  backupDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  backupBtn: {
    backgroundColor: BRAND_MID,
  },
  restoreBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

