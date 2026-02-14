import React, { useState, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, Image, ActivityIndicator, Keyboard 
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function App() {
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
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
      alert("Backend Offline: Check Termux server.");
    } finally {
      setLoading(false);
    }
  };

  const startVideo = async (videoId) => {
    setLoading(true);
    try {
      const response = await fetch(`${TERMUX_URL}/video/${videoId}`);
      const data = await response.json();
      if (data.formats && data.formats.length > 0) {
        const streamUrl = data.formats[0].url;
        
        // 1. Load the video into the hidden player
        await videoPlayer.current.loadAsync({ uri: streamUrl }, {}, false);
        
        // 2. Trigger the native full-screen interface
        await videoPlayer.current.presentFullscreenPlayer();
        
        // 3. Play the video
        await videoPlayer.current.playAsync();
      }
    } catch (err) {
      alert("Failed to resolve stream.");
    } finally {
      setLoading(false);
    }
  };

  // Handles auto-rotation for Android when full-screen is opened
  const onFullscreenUpdate = async ({ fullscreenUpdate }) => {
    if (fullscreenUpdate === Video.FULLSCREEN_UPDATE_PLAYER_DID_PRESENT) {
      await ScreenOrientation.unlockAsync(); // Allow rotation to landscape
    } else if (fullscreenUpdate === Video.FULLSCREEN_UPDATE_PLAYER_DID_DISMISS) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Private<Text style={{color: '#f00'}}>Tube</Text></Text>
        <TextInput 
          style={styles.input}
          placeholder="Search..."
          placeholderTextColor="#777"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
        />
      </View>

      {/* Hidden Video Component to trigger full-screen */}
      <Video
        ref={videoPlayer}
        style={{ width: 0, height: 0 }} // Keep it hidden from UI
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onFullscreenUpdate={onFullscreenUpdate}
      />

      {loading ? <ActivityIndicator size="large" color="#f00" style={{marginTop: 50}} /> : (
        <FlatList 
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => startVideo(item.id)}>
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.playText}>▶ Play Full Screen</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  header: { padding: 15, backgroundColor: '#111' },
  logo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  card: { marginBottom: 15, backgroundColor: '#111', flexDirection: 'row', height: 100 },
  thumb: { width: 150, height: '100%' },
  info: { flex: 1, padding: 10, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 14, fontWeight: '600' },
  playText: { color: '#f00', fontSize: 12, marginTop: 5, fontWeight: 'bold' }
});
