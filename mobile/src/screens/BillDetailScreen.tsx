import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Bill } from '../types';
import { getAbsolutePhotoUri } from '../services/storage.service';
import { deleteBill } from '../database/bill.service';
import { showToast } from '../services/toast.service';
import { PhotoViewerModal } from '../components/PhotoViewerModal';

interface BillDetailScreenProps {
  bill: Bill;
  onBack: () => void;
  onBillDeleted: () => void;
}

export function BillDetailScreen({ bill, onBack, onBillDeleted }: BillDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 12;
  const bottomPadding = Math.max(insets.bottom, 16);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const photoUri = getAbsolutePhotoUri(bill.photo_path);

  const formattedDate = new Date(bill.created_at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer Bill',
      `Are you sure you want to permanently delete Bill #${bill.bill_number}? The photograph and record will be removed from your device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteBill(bill.id, bill.tenant_id);
              showToast.success('Bill Deleted', `Bill #${bill.bill_number} removed.`);
              onBillDeleted();
              onBack();
            } catch (err: any) {
              showToast.error('Delete Failed', err.message || 'Could not delete bill.');
            } finally {
              setIsDeleting(false);
            }
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
            <Ionicons name="arrow-back" size={24} color="#E0EEF9" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bill Details</Text>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 24 }]}>
          {/* Metadata Card */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.labelCol}>
                <Ionicons name="receipt-outline" size={18} color="#1A3C5E" style={{ marginRight: 8 }} />
                <Text style={styles.metaLabel}>Bill / Order #</Text>
              </View>
              <View style={styles.billBadge}>
                <Text style={styles.metaValueHighlight}>#{bill.bill_number}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.labelCol}>
                <Ionicons name="call-outline" size={18} color="#1A3C5E" style={{ marginRight: 8 }} />
                <Text style={styles.metaLabel}>Customer Phone</Text>
              </View>
              <Text style={styles.metaValue}>{bill.customer_phone}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.labelCol}>
                <Ionicons name="calendar-outline" size={18} color="#1A3C5E" style={{ marginRight: 8 }} />
                <Text style={styles.metaLabel}>Recorded On</Text>
              </View>
              <Text style={styles.metaValueMuted}>{formattedDate}</Text>
            </View>
          </View>

          {/* Photograph Viewer */}
          <View style={styles.photoContainer}>
            <View style={styles.photoHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="image-outline" size={18} color="#1A3C5E" style={{ marginRight: 8 }} />
                <Text style={styles.photoTitle}>Original Bill Photograph</Text>
              </View>
              <TouchableOpacity
                style={styles.viewFullIconBtn}
                onPress={() => setShowPhotoModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="expand-outline" size={16} color="#1A3C5E" style={{ marginRight: 4 }} />
                <Text style={styles.viewFullIconText}>Full Screen</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.photoWrapper}
              onPress={() => setShowPhotoModal(true)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: photoUri }} style={styles.fullImage} resizeMode="contain" />
              <View style={styles.fullscreenBadge}>
                <Ionicons name="expand-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.fullscreenBadgeText}>Tap photo to view full screen</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Full-Screen Photo Viewer Modal */}
      <PhotoViewerModal
        visible={showPhotoModal}
        photoUri={photoUri}
        title={`Bill #${bill.bill_number}`}
        subtitle={bill.customer_phone ? `Customer: ${bill.customer_phone}` : undefined}
        onClose={() => setShowPhotoModal(false)}
      />
    </View>
  );
}

const BRAND_DARK = '#1A3C5E';

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 44,
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  billBadge: {
    backgroundColor: '#E0EEF9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaValueHighlight: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A3C5E',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  metaValueMuted: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  photoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3C5E',
  },
  viewFullIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0EEF9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewFullIconText: {
    color: '#1A3C5E',
    fontSize: 12,
    fontWeight: '700',
  },
  photoWrapper: {
    position: 'relative',
    width: '100%',
    height: 380,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  fullscreenBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
