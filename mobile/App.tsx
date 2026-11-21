import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, BackHandler, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { toastConfig } from './src/components/CustomToast';

// Prevent native splash screen from auto-hiding before resources and authentication are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

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
        setTotalBills(0);
        setCurrentScreen('activate');
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setLicense(null);
      setTotalBills(0);
      setCurrentScreen('activate');
    } finally {
      setIsInitializing(false);
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Synchronize customer bill count strictly to the active shop tenant
  useEffect(() => {
    if (license?.tenant_id) {
      getTotalBillsCount(license.tenant_id).then((count) => setTotalBills(count));
    } else {
      setTotalBills(0);
    }
  }, [license?.tenant_id]);

  const refreshTotalBills = useCallback(async (targetTenantId?: string) => {
    const id = targetTenantId || license?.tenant_id;
    if (id) {
      const count = await getTotalBillsCount(id);
      setTotalBills(count);
    } else {
      setTotalBills(0);
    }
  }, [license?.tenant_id]);

  // Industry-standard hardware & swipe gesture back navigation
  const navigateBack = useCallback(() => {
    if (currentScreen === 'bill-detail') {
      setCurrentScreen('search');
      return true;
    }
    if (currentScreen === 'create-bill' || currentScreen === 'search' || currentScreen === 'settings') {
      setCurrentScreen('home');
      return true;
    }
    if (currentScreen === 'activate' && license) {
      setCurrentScreen('home');
      return true;
    }
    // At root 'home', allow default Android behavior (exit app)
    return false;
  }, [currentScreen, license]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return navigateBack();
    });
    return () => subscription.remove();
  }, [navigateBack]);

  const handleDeactivate = async () => {
    await clearLicense();
    setLicense(null);
    setTotalBills(0);
    setCurrentScreen('activate');
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('./assets/android-icon-background.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 24 }} />
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
            onActivated={async (newLic) => {
              setLicense(newLic);
              const count = await getTotalBillsCount(newLic.tenant_id);
              setTotalBills(count);
              setCurrentScreen('home');
            }}
          />
        </View>
        <Toast config={toastConfig} />
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
      <Toast config={toastConfig} />
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
  splashImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
});
