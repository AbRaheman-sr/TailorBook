import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Bill } from '../types';
import { getAbsolutePhotoUri } from '../services/storage.service';
import { deleteBill } from '../database/bill.service';

interface BillDetailScreenProps {
  bill: Bill;
  onBack: () => void;
  onBillDeleted: () => void;
}

export function BillDetailScreen({ bill, onBack, onBillDeleted }: BillDetailScreenProps) {
  const [isDeleting, setIsDeleting] = useState(false);
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
      'Delete Bill',
      `Are you sure you want to permanently delete Bill #${bill.bill_number}? The photograph and record will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteBill(bill.id, bill.tenant_id);
              Alert.alert('Deleted', `Bill #${bill.bill_number} has been deleted.`, [
                {
                  text: 'OK',
                  onPress: () => {
                    onBillDeleted();
                    onBack();
                  },
                },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete bill.');
            } finally {
              setIsDeleting(false);
            }
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
          <Text style={styles.headerTitle}>Bill Details</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={isDeleting}>
            <Text style={styles.deleteBtnText}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Metadata Card */}
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.metaLabel}>Bill Number</Text>
              <Text style={styles.metaValueHighlight}>#{bill.bill_number}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.metaLabel}>Customer Phone</Text>
              <Text style={styles.metaValue}>{bill.customer_phone}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.metaLabel}>Recorded On</Text>
              <Text style={styles.metaValueMuted}>{formattedDate}</Text>
            </View>
          </View>

          {/* Photograph Viewer */}
          <View style={styles.photoContainer}>
            <Text style={styles.photoTitle}>Original Bill Photograph</Text>
            <View style={styles.photoWrapper}>
              <Image source={{ uri: photoUri }} style={styles.fullImage} resizeMode="contain" />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    color: '#FFA8A8',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  metaValueHighlight: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A3C5E',
  },
  metaValueMuted: {
    fontSize: 13,
    color: '#64748B',
  },
  photoContainer: {
    marginTop: 4,
  },
  photoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3C5E',
    marginBottom: 10,
  },
  photoWrapper: {
    backgroundColor: '#000000',
    borderRadius: 14,
    overflow: 'hidden',
    height: 440,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});

