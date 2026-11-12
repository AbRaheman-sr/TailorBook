import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { searchBills } from '../database/bill.service';
import { getAbsolutePhotoUri } from '../services/storage.service';
import { Bill } from '../types';

interface SearchBillsScreenProps {
  tenantId: string;
  onBack: () => void;
  onSelectBill: (bill: Bill) => void;
}

export function SearchBillsScreen({
  tenantId,
  onBack,
  onSelectBill,
}: SearchBillsScreenProps) {
  const [query, setQuery] = useState('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

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
    fetchResults(query);
  }, [query, fetchResults]);

  // Voice Search Handler
  const handleVoiceSearch = () => {
    Alert.prompt
      ? Alert.prompt(
          '🎤 Voice Search',
          'Speak or type your bill number or customer phone:',
          (text) => {
            if (text && text.trim()) {
              setQuery(text.trim());
            }
          },
          'plain-text',
          query
        )
      : Alert.alert(
          '🎤 Voice Search',
          'To search with voice, tap the search input and use the microphone button on your Android keyboard.\n\nYou can speak numbers in English or Hindi (e.g., "125" or "9876543210").'
        );
  };

  const renderItem = ({ item }: { item: Bill }) => {
    const photoUri = getAbsolutePhotoUri(item.photo_path);
    const dateFormatted = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectBill(item)}
        activeOpacity={0.75}
      >
        <Image source={{ uri: photoUri }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.billNumber}>Bill #{item.bill_number}</Text>
            <Text style={styles.billDate}>{dateFormatted}</Text>
          </View>
          <Text style={styles.customerPhone}>📞 {item.customer_phone}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Search Bills</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Search Bar with Mic Button */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Bill # or Mobile No..."
              placeholderTextColor="#8C9CAE"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={handleVoiceSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.micBtnIcon}>🎤</Text>
          </TouchableOpacity>
        </View>

        {/* Results Info */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {isLoading ? 'Searching...' : `${bills.length} bill${bills.length === 1 ? '' : 's'} found`}
          </Text>
        </View>

        {/* Bills List */}
        {isLoading && bills.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1A3C5E" />
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Bills Found</Text>
            <Text style={styles.emptySubtitle}>
              {query
                ? `No bills match "${query}". Try another bill number or phone number.`
                : 'No bills have been created yet.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={bills}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
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
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    color: '#8C9CAE',
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A3C5E',
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: '#8C9CAE',
    fontSize: 14,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: BRAND_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: '#E53E3E',
  },
  micBtnIcon: {
    fontSize: 20,
  },
  resultsHeader: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
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
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
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
    marginBottom: 4,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A3C5E',
  },
  billDate: {
    fontSize: 12,
    color: '#64748B',
  },
  customerPhone: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A3C5E',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

