import React, { useState, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, Image, ActivityIndicator, Keyboard, Dimensions 
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

export default function App() {
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null); // Stores the stream URL
  const videoPlayer = useRef(null);

  const TERMUX_URL = 'http://127.0.0.1:8080';

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    Keyboard.dismiss();
    try {
      const response = await fetch(`${TERMUX_URL}/search?q=${encodeURIComponent(search)}`);
      const data = await response.json();
      setVideos(data);
    } catch (err) {
      alert("Backend Offline: Is 'node server.js' running?");
    } finally {
      setLoading(false);
    }
  };

  const loadVideo = async (videoId) => {
    setLoading(true);
    try {
      const response = await fetch(`${TERMUX_URL}/video/${videoId}`);
      const data = await response.json();
      if (data.formats && data.formats.length > 0) {
        setActiveVideo(data.formats[0].url); // Pick the highest quality MP4
      }
    } catch (err) {
      alert("Could not load video stream.");
    } finally {
      setLoading(false);
    }
  };

  if (activeVideo) {
    return (
      <View style={styles.playerContainer}>
        <Video
          ref={videoPlayer}
          style={styles.fullVideo}
          source={{ uri: activeVideo }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
        />
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => setActiveVideo(null)}
        >
          <Text style={styles.closeText}>✕ Close Player</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Private<Text style={{color: '#f00'}}>Tube</Text></Text>
        <View style={styles.searchRow}>
          <TextInput 
            style={styles.input}
            placeholder="Search..."
            placeholderTextColor="#777"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#f00" style={{marginTop: 50}} /> : (
        <FlatList 
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => loadVideo(item.id)}>
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  playerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fullVideo: { width: '100%', height: 300 },
  closeButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 5 },
  closeText: { color: '#fff', fontWeight: 'bold' },
  header: { padding: 15, backgroundColor: '#111' },
  logo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  card: { marginBottom: 20, backgroundColor: '#111' },
  thumb: { width: '100%', height: 210 },
  title: { color: '#fff', padding: 10, fontSize: 15 }
});
