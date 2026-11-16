import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { searchBills } from '../database/bill.service';
import { getAbsolutePhotoUri } from '../services/storage.service';
import { Bill } from '../types';

interface SearchBillsScreenProps {
  tenantId: string;
  onBack: () => void;
  onSelectBill: (bill: Bill) => void;
}

// Memoized Bill Card for high performance list rendering
const BillCard = React.memo(function BillCard({
  item,
  onPress,
}: {
  item: Bill;
  onPress: (bill: Bill) => void;
}) {
  const photoUri = useMemo(() => getAbsolutePhotoUri(item.photo_path), [item.photo_path]);
  const dateFormatted = useMemo(() => {
    return new Date(item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [item.created_at]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <Image source={{ uri: photoUri }} style={styles.thumbnail} resizeMode="cover" />
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.billBadge}>
            <Text style={styles.billNumber}>#{item.bill_number}</Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.billDate}>{dateFormatted}</Text>
          </View>
        </View>
        <View style={styles.phoneRow}>
          <Ionicons name="call-outline" size={13} color="#2B5C8A" style={{ marginRight: 6 }} />
          <Text style={styles.customerPhone}>{item.customer_phone}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={styles.chevron} />
    </TouchableOpacity>
  );
});

export function SearchBillsScreen({
  tenantId,
  onBack,
  onSelectBill,
}: SearchBillsScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 12;
  const bottomPadding = Math.max(insets.bottom, 16);

  const [query, setQuery] = useState('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const results = await searchBills(tenantId, searchQuery, 100);
      setBills(results);
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query) {
      fetchResults('');
    } else {
      debounceTimerRef.current = setTimeout(() => {
        fetchResults(query);
      }, 150);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchResults]);

  const renderItem = useCallback(
    ({ item }: { item: Bill }) => <BillCard item={item} onPress={onSelectBill} />,
    [onSelectBill]
  );

  const keyExtractor = useCallback((item: Bill) => item.id, []);

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Safe Area Notch Inset */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#E0EEF9" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Customer Bills</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Bill # or Customer Mobile..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results Info */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {isLoading ? 'Searching...' : `${bills.length} customer bill${bills.length === 1 ? '' : 's'} found`}
          </Text>
        </View>

        {/* Bills List */}
        {isLoading && bills.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1A3C5E" />
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Customer Bills Found</Text>
            <Text style={styles.emptySubtitle}>
              {query
                ? `No customer bills match "${query}". Try searching by another bill # or customer mobile.`
                : 'No customer bills recorded yet. Go to Home and tap "Create Customer Bill" to record your first order.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={bills}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 20 }]}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </View>
    </View>
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
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1A3C5E',
  },
  clearBtn: {
    padding: 6,
  },
  resultsHeader: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  billBadge: {
    backgroundColor: '#E0EEF9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  billNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A3C5E',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  chevron: {
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A3C5E',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
