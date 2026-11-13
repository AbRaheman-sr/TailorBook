import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDatabase } from './src/database/database';
import { getTotalBillsCount } from './src/database/bill.service';
import { getActiveLicense, clearLicense } from './src/services/auth.service';
import { Bill, ShopLicense } from './src/types';

import { HomeScreen } from './src/screens/HomeScreen';
import { CreateBillScreen } from './src/screens/CreateBillScreen';
import { SearchBillsScreen } from './src/screens/SearchBillsScreen';
import { BillDetailScreen } from './src/screens/BillDetailScreen';
import { ActivationScreen } from './src/screens/ActivationScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Screen = 'home' | 'create-bill' | 'search' | 'bill-detail' | 'activate' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('activate');
  const [license, setLicense] = useState<ShopLicense | null>(null);
  const [totalBills, setTotalBills] = useState<number>(0);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize DB and load active shop license
  const initApp = useCallback(async () => {
    try {
      await getDatabase();
      const activeLic = await getActiveLicense();

      if (activeLic) {
        setLicense(activeLic);
        setCurrentScreen('home');
        const count = await getTotalBillsCount(activeLic.tenant_id);
        setTotalBills(count);
      } else {
        // Strict Gatekeeping: Unregistered devices MUST activate before accessing any app feature
        setLicense(null);
        setCurrentScreen('activate');
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setLicense(null);
      setCurrentScreen('activate');
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

  const handleDeactivate = async () => {
    await clearLicense();
    setLicense(null);
    setCurrentScreen('activate');
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Strict Gatekeeping: If no valid signed license exists, only show the Activation/Login screen
  if (!license || currentScreen === 'activate') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.container}>
          <ActivationScreen
            currentLicense={license}
            onBack={license ? () => setCurrentScreen('home') : undefined}
            onActivated={(newLic) => {
              setLicense(newLic);
              setCurrentScreen('home');
              refreshTotalBills();
            }}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  const tenantId = license.tenant_id;

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
