import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveBillPhoto } from '../services/storage.service';
import { createBill, DuplicateBillError } from '../database/bill.service';

interface CreateBillScreenProps {
  tenantId: string;
  onBack: () => void;
  onBillCreated: () => void;
}

export function CreateBillScreen({ tenantId, onBack, onBillCreated }: CreateBillScreenProps) {
  const [billNumber, setBillNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Take photo using device camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to photograph bills.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Unable to open camera.');
    }
  };

  // Select photo from gallery
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Unable to open gallery.');
    }
  };

  // Validate and save
  const handleSaveBill = async () => {
    const cleanBillNo = billNumber.trim();
    const cleanPhone = customerPhone.trim();

    if (!cleanBillNo) {
      Alert.alert('Validation Error', 'Please enter a valid bill number.');
      return;
    }

    if (!cleanPhone) {
      Alert.alert('Validation Error', 'Please enter the customer mobile number.');
      return;
    }

    // Sensible mobile validation (allowing 10 digits or with +91)
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!photoUri) {
      Alert.alert('Missing Photo', 'Please capture or select a photo of the physical bill.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Copy image to private app storage
      const relativePhotoPath = await saveBillPhoto(photoUri);

      // 2. Insert bill into local SQLite
      await createBill({
        tenant_id: tenantId,
        bill_number: cleanBillNo,
        customer_phone: cleanPhone,
        photo_path: relativePhotoPath,
      });

      Alert.alert('Success', `Bill #${cleanBillNo} recorded in shop database!`, [
        {
          text: 'OK',
          onPress: () => {
            onBillCreated();
            onBack();
          },
        },
      ]);
    } catch (err: any) {
      if (err instanceof DuplicateBillError) {
        Alert.alert('Duplicate Bill', err.message);
      } else {
        Alert.alert('Save Failed', err.message || 'Could not save bill. Please try again.');
      }
    } finally {
      setIsSaving(false);
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
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Customer Bill</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Bill Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Bill / Receipt # *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 101 or B-45"
              placeholderTextColor="#9AA6B2"
              value={billNumber}
              onChangeText={setBillNumber}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.hint}>Enter the order or receipt number from your physical tailor book.</Text>
          </View>

          {/* Customer Mobile */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#9AA6B2"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          {/* Bill Photograph */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Physical Bill / Order Receipt Photo *</Text>

            {photoUri ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto}>
                    <Text style={styles.retakeBtnText}>📷 Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.retakeBtn} onPress={handlePickPhoto}>
                    <Text style={styles.retakeBtnText}>🖼️ Choose Another</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoCaptureBox}>
                <Text style={styles.captureInstructions}>
                  Capture a clear photo of the customer's physical bill receipt.
                </Text>
                <View style={styles.captureButtonsRow}>
                  <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}>
                    <Text style={styles.captureBtnIcon}>📷</Text>
                    <Text style={styles.captureBtnText}>Open Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.captureBtn, styles.galleryBtn]} onPress={handlePickPhoto}>
                    <Text style={styles.captureBtnIcon}>🖼️</Text>
                    <Text style={styles.galleryBtnText}>From Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSaveBill}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Bill to Shop Records</Text>
            )}
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3C5E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D0DBE5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212529',
  },
  hint: {
    fontSize: 12,
    color: '#7B8FA1',
    marginTop: 4,
  },
  photoPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D0DBE5',
  },
  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#EAEAEA',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  retakeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A3C5E',
  },
  photoCaptureBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#B8C7D6',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  captureInstructions: {
    fontSize: 13,
    color: '#557291',
    textAlign: 'center',
    marginBottom: 16,
  },
  captureButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_MID,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  captureBtnIcon: {
    fontSize: 18,
  },
  captureBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  galleryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BRAND_MID,
  },
  galleryBtnText: {
    color: BRAND_MID,
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

