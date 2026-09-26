import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// Placeholder project list — will be fetched from API
const DEMO_PROJECTS = [
  { id: '1', name: 'Reforestation Site Alpha', sector: 'forestry', asset_count: 0 },
  { id: '2', name: 'Water Conservation Beta', sector: 'water', asset_count: 0 },
];

export default function ProjectListScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Projects</Text>
        <Text style={styles.subtitle}>Select a project to start capturing</Text>
      </View>

      <FlatList
        data={DEMO_PROJECTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/project/capture?projectId=${item.id}&projectName=${item.name}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={[styles.badge, item.sector === 'forestry' ? styles.badgeGreen : styles.badgeBlue]}>
                <Text style={styles.badgeText}>{item.sector}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>{item.asset_count} assets captured</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  header: { padding: 20, paddingTop: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9' },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeBlue: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#34d399', textTransform: 'uppercase' },
});
