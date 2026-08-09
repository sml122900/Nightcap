import React, { Suspense, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useShareIntent } from 'expo-share-intent';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokens } from './src/constants/tokens';
import { initDb } from './src/db/init';
import { ingestShareIntent } from './src/services/shareIntake';
import { getOnboardingCompleted } from './src/services/settings';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { TriageScreen } from './src/screens/TriageScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { TrashScreen } from './src/screens/TrashScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ShareCardScreen } from './src/screens/ShareCardScreen';

type Screen = 'onboarding' | 'home' | 'triage' | 'library' | 'trash' | 'settings' | 'shareCard';

function RootNavigator() {
  const db = useSQLiteContext();
  const [screen, setScreen] = useState<Screen | null>(null);
  /** 공유 카드는 완료 요약과 보관함 두 곳에서 열려서, 닫을 때 온 곳으로 돌아가야 한다. */
  const [shareCardFrom, setShareCardFrom] = useState<Screen>('home');
  const [shareToastNonce, setShareToastNonce] = useState(0);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    getOnboardingCompleted(db).then((completed) => setScreen(completed ? 'home' : 'onboarding'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  useEffect(() => {
    if (!hasShareIntent) return;
    (async () => {
      await ingestShareIntent(db, shareIntent);
      resetShareIntent();
      setScreen('home');
      setShareToastNonce((n) => n + 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, shareIntent]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'shareCard') {
        setScreen(shareCardFrom);
        return true;
      }
      if (screen === 'trash') {
        setScreen('library');
        return true;
      }
      if (screen === 'library' || screen === 'settings' || screen === 'triage') {
        setScreen('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen, shareCardFrom]);

  const openShareCard = (from: Screen) => {
    setShareCardFrom(from);
    setScreen('shareCard');
  };

  if (screen === null) {
    return <View style={styles.root} />;
  }
  if (screen === 'onboarding') {
    return <OnboardingScreen onComplete={() => setScreen('home')} />;
  }
  if (screen === 'shareCard') {
    return <ShareCardScreen onBack={() => setScreen(shareCardFrom)} />;
  }
  if (screen === 'library') {
    return (
      <LibraryScreen
        onBack={() => setScreen('home')}
        onOpenTrash={() => setScreen('trash')}
        onOpenShareCard={() => openShareCard('library')}
      />
    );
  }
  if (screen === 'trash') {
    return <TrashScreen onBack={() => setScreen('library')} />;
  }
  if (screen === 'settings') {
    return <SettingsScreen onBack={() => setScreen('home')} />;
  }
  if (screen === 'triage') {
    return (
      <TriageScreen
        onOpenLibrary={() => setScreen('library')}
        onExit={() => setScreen('home')}
        onOpenShareCard={() => openShareCard('home')}
      />
    );
  }
  return (
    <HomeScreen
      onStartTriage={() => setScreen('triage')}
      onOpenLibrary={() => setScreen('library')}
      onOpenSettings={() => setScreen('settings')}
      shareToastNonce={shareToastNonce}
    />
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <Suspense fallback={<View style={styles.root} />}>
            <SQLiteProvider databaseName="nightcap.db" onInit={initDb} useSuspense>
              <RootNavigator />
            </SQLiteProvider>
          </Suspense>
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
});
