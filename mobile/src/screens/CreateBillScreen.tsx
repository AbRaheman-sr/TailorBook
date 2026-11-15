import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { saveBillPhoto } from '../services/storage.service';
import { createBill, DuplicateBillError } from '../database/bill.service';
import { showToast } from '../services/toast.service';

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
        showToast.error('Permission Denied', 'Camera permission is required to photograph customer bills.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
        showToast.info('Photo Captured', 'Receipt photo attached to bill.');
      }
    } catch (err: any) {
      showToast.error('Camera Error', err.message || 'Unable to open camera.');
    }
  };

  // Select photo from gallery
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast.error('Permission Denied', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
        showToast.info('Photo Selected', 'Receipt photo attached from gallery.');
      }
    } catch (err: any) {
      showToast.error('Gallery Error', err.message || 'Unable to open gallery.');
    }
  };

  // Validate and save
  const handleSaveBill = async () => {
    const cleanBillNo = billNumber.trim();
    const cleanPhone = customerPhone.trim();

    if (!cleanBillNo) {
      showToast.error('Validation Error', 'Please enter a valid customer bill number.');
      return;
    }

    if (!cleanPhone) {
      showToast.error('Validation Error', 'Please enter the customer mobile number.');
      return;
    }

    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      showToast.error('Invalid Mobile', 'Please enter a valid 10-digit customer mobile number.');
      return;
    }

    if (!photoUri) {
      showToast.error('Missing Photo', 'Please take or choose a photo of the physical receipt.');
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

      showToast.success('Bill Recorded', `Bill #${cleanBillNo} saved to shop records!`);
      onBillCreated();
      onBack();
    } catch (err: any) {
      if (err instanceof DuplicateBillError) {
        showToast.error('Duplicate Bill', err.message);
      } else {
        showToast.error('Save Failed', err.message || 'Could not save bill.');
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
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#E0EEF9" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Customer Bill</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            {/* Bill Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer Bill / Receipt # *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="receipt-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 101 or B-45"
                  placeholderTextColor="#9AA6B2"
                  value={billNumber}
                  onChangeText={setBillNumber}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.hint}>Enter the order or receipt number from your physical tailor book.</Text>
            </View>

            {/* Customer Mobile */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer Mobile Number *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
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
            </View>

            {/* Bill Photograph */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Physical Bill / Order Receipt Photo *</Text>

              {photoUri ? (
                <View style={styles.photoPreviewCard}>
                  <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                  <View style={styles.photoActions}>
                    <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                      <Ionicons name="camera-reverse-outline" size={16} color="#1A3C5E" style={{ marginRight: 6 }} />
                      <Text style={styles.retakeBtnText}>Retake Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.retakeBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
                      <Ionicons name="images-outline" size={16} color="#1A3C5E" style={{ marginRight: 6 }} />
                      <Text style={styles.retakeBtnText}>Choose Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoCaptureBox}>
                  <View style={styles.cameraIconCircle}>
                    <Ionicons name="camera-outline" size={28} color="#1A3C5E" />
                  </View>
                  <Text style={styles.captureInstructions}>
                    Capture a clear photo of the customer's physical bill receipt.
                  </Text>
                  <View style={styles.captureButtonsRow}>
                    <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto} activeOpacity={0.85}>
                      <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.captureBtnText}>Open Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.captureBtn, styles.galleryBtn]}
                      onPress={handlePickPhoto}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="images-outline" size={18} color="#1A3C5E" style={{ marginRight: 6 }} />
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
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save Bill to Shop Records</Text>
                </>
              )}
            </TouchableOpacity>
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
    fontWeight: '700',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
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
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A3C5E',
    marginBottom: 8,
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
  hint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
    paddingHorizontal: 2,
  },
  photoPreviewCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  photoActions: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 10,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
  },
  retakeBtnText: {
    color: '#1A3C5E',
    fontWeight: '600',
    fontSize: 13,
  },
  photoCaptureBox: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  cameraIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0EEF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  captureInstructions: {
    fontSize: 12,
    color: '#64748B',
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
    paddingVertical: 12,
    borderRadius: 10,
  },
  galleryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BRAND_MID,
  },
  captureBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  galleryBtnText: {
    color: BRAND_MID,
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: BRAND_DARK,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
