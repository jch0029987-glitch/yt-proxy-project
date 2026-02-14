import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const videoPlayer = useRef(null);

  const TERMUX_URL = 'http://localhost:8080';

  /* =========================
     🔍 SEARCH
  ========================== */
  const handleSearch = async () => {
    if (!search.trim()) return;

    setLoading(true);
    Keyboard.dismiss();

    try {
      const res = await fetch(
        `${TERMUX_URL}/search?q=${encodeURIComponent(search)}`
      );
      const data = await res.json();
      setVideos(data);
    } catch {
      alert('Backend Offline: Check Termux server.');
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ▶️ PLAY VIDEO
  ========================== */
  const startVideo = async (videoId) => {
    if (!videoPlayer.current) return;

    setLoading(true);

    try {
      const res = await fetch(`${TERMUX_URL}/video/${videoId}`);
      const data = await res.json();

      if (!data.formats?.length) {
        throw new Error('No formats');
      }

      const format =
        data.formats.find(f => f.hasAudio && f.hasVideo) ||
        data.formats[0];

      const streamUrl = format.url;

      // 🔥 FORCE LANDSCAPE BEFORE FULLSCREEN
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );

      await videoPlayer.current.loadAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        false
      );

      await videoPlayer.current.presentFullscreenPlayer();
    } catch (err) {
      alert('Failed to play video.');
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     🔄 FULLSCREEN EVENTS
  ========================== */
  const onFullscreenUpdate = async (event) => {
    const { fullscreenUpdate } = event;

    if (
      fullscreenUpdate === Video.FULLSCREEN_UPDATE_PLAYER_DID_DISMISS
    ) {
      // 🔄 Restore portrait when exiting
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    }
  };

  /* =========================
     🎨 UI
  ========================== */
  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          Private<Text style={{ color: '#f00' }}>Tube</Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Search..."
          placeholderTextColor="#777"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
        />
      </View>

      {/* Hidden Video Player */}
      <Video
        ref={videoPlayer}
        style={{ width: 0, height: 0 }}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        onFullscreenUpdate={onFullscreenUpdate}
      />

      {/* Loading */}
      {loading ? (
        <ActivityIndicator size="large" color="#f00" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => startVideo(item.id)}
            >
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.playText}>
                  ▶ Play Full Screen
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

/* =========================
   🎨 STYLES
========================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  header: {
    padding: 15,
    backgroundColor: '#111',
  },
  logo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  card: {
    marginBottom: 15,
    backgroundColor: '#111',
    flexDirection: 'row',
    height: 100,
  },
  thumb: {
    width: 150,
    height: '100%',
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playText: {
    color: '#f00',
    fontSize: 12,
    marginTop: 5,
    fontWeight: 'bold',
  },
});
