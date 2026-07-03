import React, { Suspense, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokens } from './src/constants/tokens';
import { initDb } from './src/db/init';
import { TriageScreen } from './src/screens/TriageScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { TrashScreen } from './src/screens/TrashScreen';

type Screen = 'triage' | 'library' | 'trash';

function RootNavigator() {
  const [screen, setScreen] = useState<Screen>('triage');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'trash') {
        setScreen('library');
        return true;
      }
      if (screen === 'library') {
        setScreen('triage');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  if (screen === 'library') {
    return <LibraryScreen onBack={() => setScreen('triage')} onOpenTrash={() => setScreen('trash')} />;
  }
  if (screen === 'trash') {
    return <TrashScreen onBack={() => setScreen('library')} />;
  }
  return <TriageScreen onOpenLibrary={() => setScreen('library')} />;
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
