import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ShopLicense } from '../types';
import { createBackupArchive, restoreBackupArchive } from '../services/backup.service';
import { clearLicense } from '../services/auth.service';

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
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    if (!license) {
      Alert.alert('Activation Needed', 'Please activate your shop before creating backups.');
      return;
    }

    setIsBackingUp(true);
    try {
      const result = await createBackupArchive(license.tenant_id, license.tenant_name);
      if (result.success) {
        Alert.alert('Backup Complete', 'Backup archive created and ready to save/share safely.');
      } else {
        Alert.alert('Backup Failed', result.error || 'Could not create backup.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Backup error occurred.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = () => {
    if (!license) {
      Alert.alert('Activation Needed', 'Please activate your shop before restoring backups.');
      return;
    }

    Alert.alert(
      'Restore Backup',
      'Restoring will import all bills and photographs from your selected backup file. Existing records with matching bill numbers will be updated safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select Backup File',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const res = await restoreBackupArchive(license.tenant_id);
              if (res.success) {
                Alert.alert('Restore Successful', res.message, [
                  {
                    text: 'OK',
                    onPress: onDataChanged,
                  },
                ]);
              } else {
                Alert.alert('Restore Info', res.message);
              }
            } catch (err: any) {
              Alert.alert('Restore Error', err.message || 'Could not restore backup.');
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
      'Deactivate Shop',
      'Are you sure you want to deactivate this device? Your local bill data will remain safe on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            await clearLicense();
            onDataChanged();
            onNavigateActivate();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Shop Account Section */}
          <Text style={styles.sectionHeader}>Shop & Account</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Shop Name</Text>
              <Text style={styles.infoValue}>{license ? license.tenant_name : 'Not Activated'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device Status</Text>
              <Text style={[styles.infoValue, { color: license ? '#2E7D32' : '#C62828' }]}>
                {license ? '● Authorized' : '○ Unregistered'}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer Bills Stored</Text>
              <Text style={styles.infoValue}>{totalBills}</Text>
            </View>

            <TouchableOpacity
              style={styles.activationActionBtn}
              onPress={license ? handleDeactivate : onNavigateActivate}
            >
              <Text style={styles.activationActionText}>
                {license ? 'Deactivate Shop on Device' : 'Activate Shop License'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Backup & Restore Section */}
          <Text style={styles.sectionHeader}>Data Backup & Restore</Text>
          <View style={styles.card}>
            <Text style={styles.backupDescription}>
              TailorBook works 100% offline. Create regular backups to protect your customer bills and
              photographs.
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
                  <Text style={styles.actionBtnIcon}>📦</Text>
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
                  <Text style={styles.actionBtnIcon}>📂</Text>
                  <Text style={[styles.actionBtnText, { color: '#1A3C5E' }]}>
                    Restore Shop Backup
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <Text style={styles.sectionHeader}>Application</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Name</Text>
              <Text style={styles.infoValue}>TailorBook</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0 (Release)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Storage</Text>
              <Text style={styles.infoValue}>Private App Storage (Offline-First)</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
    padding: 18,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 14,
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
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 4,
  },
  activationActionBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  activationActionText: {
    color: BRAND_MID,
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
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

