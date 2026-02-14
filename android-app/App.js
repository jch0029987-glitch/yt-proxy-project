import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator,
  Keyboard
} from 'react-native';

export default function App() {
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Since Termux and this App are on the same phone:
  const TERMUX_URL = 'http://127.0.0.1:3000';
  // Replace with your Roku's IP (Local network)
  const ROKU_IP = '192.168.1.XX'; 

  const handleSearch = async () => {
    if (!search) return;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const response = await fetch(`${TERMUX_URL}/search?q=${encodeURIComponent(search)}`);
      const data = await response.json();
      setVideos(data.results || []);
    } catch (err) {
      alert("Cannot connect to Termux server. Make sure 'node server.js' is running.");
    } finally {
      setLoading(false);
    }
  };

  const launchOnRoku = (videoId) => {
    // This goes directly to the Roku, bypassing the Termux proxy
    fetch(`http://${ROKU_IP}:8060/launch/837?contentId=${videoId}`, {
      method: 'POST',
    }).catch(err => alert("Roku not found on local network"));
  };

  const renderVideo = ({ item }) => (
    <TouchableOpacity style={styles.videoCard} onPress={() => launchOnRoku(item.id)}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.videoMeta}>{item.duration} • Tap to play on Roku</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>YT <Text style={styles.logoProxy}>Proxy</Text></Text>
        <View style={styles.searchContainer}>
          <TextInput 
            style={styles.searchBar}
            placeholder="Search YouTube..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ff0000" style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideo}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>Search for something to watch on Roku</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { paddingTop: 50, paddingHorizontal: 15, backgroundColor: '#0f0f0f', paddingBottom: 10 },
  logo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  logoProxy: { color: '#ff0000' },
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { 
    flex: 1, 
    backgroundColor: '#222', 
    color: '#fff', 
    padding: 10, 
    borderRadius: 20, 
    paddingLeft: 20,
    fontSize: 16 
  },
  searchButton: { marginLeft: 10, padding: 5 },
  searchButtonText: { fontSize: 20 },
  listContainer: { padding: 10 },
  videoCard: { marginBottom: 20, backgroundColor: '#1a1a1a', borderRadius: 10, overflow: 'hidden' },
  thumbnail: { width: '100%', height: 210 },
  videoInfo: { padding: 12 },
  videoTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  videoMeta: { color: '#aaa', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 100, fontSize: 16 }
});
