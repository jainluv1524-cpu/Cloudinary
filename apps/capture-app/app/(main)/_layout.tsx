import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#f1f5f9',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Projects' }} />
      <Stack.Screen name="project/capture" options={{ title: 'Capture', presentation: 'fullScreenModal' }} />
      <Stack.Screen name="project/gallery" options={{ title: 'Gallery' }} />
    </Stack>
  );
}
