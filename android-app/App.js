import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, Image, ActivityIndicator, Keyboard 
} from 'react-native';

export default function App() {
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // MATCHING YOUR SERVER.JS PORT
  const TERMUX_URL = 'http://127.0.0.1:8080';
  const ROKU_IP = '192.168.1.XX'; // Set your Roku IP

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const response = await fetch(`${TERMUX_URL}/search?q=${encodeURIComponent(search)}`);
      const data = await response.json();
      // data is an array directly based on your server.js
      setVideos(data);
    } catch (err) {
      alert("Connection Failed: Ensure 'node server.js' is running on port 8080");
    } finally {
      setLoading(false);
    }
  };

  const castToRoku = (videoId) => {
    fetch(`http://${ROKU_IP}:8060/launch/837?contentId=${videoId}`, {
      method: 'POST',
    }).catch(() => alert("Roku unreachable. Check Wi-Fi."));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>YT <Text style={{color: '#f00'}}>Proxy</Text></Text>
        <View style={styles.searchRow}>
          <TextInput 
            style={styles.input}
            placeholder="Search via yt-dlp..."
            placeholderTextColor="#777"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
            <Text style={{fontSize: 20}}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f00" style={{marginTop: 50}} />
      ) : (
        <FlatList 
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => castToRoku(item.id)}>
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{padding: 10}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  header: { padding: 15, backgroundColor: '#111' },
  logo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  searchBtn: { marginLeft: 10 },
  card: { marginBottom: 20, backgroundColor: '#111', borderRadius: 8, overflow: 'hidden' },
  thumb: { width: '100%', height: 200 },
  title: { color: '#fff', padding: 10, fontSize: 15 }
});
