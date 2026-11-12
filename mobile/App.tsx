import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDatabase } from './src/database/database';
import { getTotalBillsCount } from './src/database/bill.service';
import { getActiveLicense, activateLocalDemo } from './src/services/auth.service';
import { Bill, ShopLicense } from './src/types';

import { HomeScreen } from './src/screens/HomeScreen';
import { CreateBillScreen } from './src/screens/CreateBillScreen';
import { SearchBillsScreen } from './src/screens/SearchBillsScreen';
import { BillDetailScreen } from './src/screens/BillDetailScreen';
import { ActivationScreen } from './src/screens/ActivationScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Screen = 'home' | 'create-bill' | 'search' | 'bill-detail' | 'activate' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [license, setLicense] = useState<ShopLicense | null>(null);
  const [totalBills, setTotalBills] = useState<number>(0);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize DB and load active shop license
  const initApp = useCallback(async () => {
    try {
      await getDatabase();
      let activeLic = await getActiveLicense();
      
      // If first launch without activation, initialize local pilot mode for seamless offline testing
      if (!activeLic) {
        activeLic = await activateLocalDemo('My Tailoring Shop');
      }

      setLicense(activeLic);

      if (activeLic) {
        const count = await getTotalBillsCount(activeLic.tenant_id);
        setTotalBills(count);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const refreshTotalBills = async () => {
    if (license) {
      const count = await getTotalBillsCount(license.tenant_id);
      setTotalBills(count);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A3C5E" />
      </View>
    );
  }

  const tenantId = license?.tenant_id || 'default_tenant';

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.container}>
        {currentScreen === 'home' && (
          <HomeScreen
            license={license}
            totalBills={totalBills}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {currentScreen === 'create-bill' && (
          <CreateBillScreen
            tenantId={tenantId}
            onBack={() => setCurrentScreen('home')}
            onBillCreated={refreshTotalBills}
          />
        )}

        {currentScreen === 'search' && (
          <SearchBillsScreen
            tenantId={tenantId}
            onBack={() => setCurrentScreen('home')}
            onSelectBill={(bill) => {
              setSelectedBill(bill);
              setCurrentScreen('bill-detail');
            }}
          />
        )}

        {currentScreen === 'bill-detail' && selectedBill && (
          <BillDetailScreen
            bill={selectedBill}
            onBack={() => setCurrentScreen('search')}
            onBillDeleted={refreshTotalBills}
          />
        )}

        {currentScreen === 'activate' && (
          <ActivationScreen
            currentLicense={license}
            onBack={() => setCurrentScreen('home')}
            onActivated={(newLic) => {
              setLicense(newLic);
              refreshTotalBills();
            }}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            license={license}
            totalBills={totalBills}
            onBack={() => setCurrentScreen('home')}
            onNavigateActivate={() => setCurrentScreen('activate')}
            onDataChanged={() => {
              initApp();
            }}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A3C5E',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A3C5E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
