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
  ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoPlayer = useRef(null);

  // 🔥 Termux local server
  const TERMUX_URL = "http://127.0.0.1:8080";

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
      alert('Backend offline — check Termux server.');
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
    setSelectedVideo(videoId);
    setComments([]);

    try {
      // Fetch video formats
      const res = await fetch(`${TERMUX_URL}/video/${videoId}`);
      const data = await res.json();
      if (!data.formats?.length) throw new Error('No formats');

      const format = data.formats[0];
      const streamUrl = format.url;

      // 🔥 Fetch comments
      fetch(`${TERMUX_URL}/comments/${videoId}`)
        .then(res => res.json())
        .then(setComments)
        .catch(() => {});

      // 🔥 Lock landscape & hide navigation bar
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      await NavigationBar.setVisibilityAsync('hidden');

      await videoPlayer.current.loadAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        false
      );
      await videoPlayer.current.presentFullscreenPlayer();
    } catch (err) {
      console.error(err);
      alert('Playback failed.');
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     🔄 FULLSCREEN EVENTS
  ========================== */
  const onFullscreenUpdate = async ({ fullscreenUpdate }) => {
    if (fullscreenUpdate === Video.FULLSCREEN_UPDATE_PLAYER_DID_DISMISS) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      await NavigationBar.setVisibilityAsync('visible');
    }
  };

  /* =========================
     🎨 RENDER
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

      {/* Hidden video player */}
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
                <Text style={styles.playText}>▶ Fullscreen Playback</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* COMMENTS */}
      {selectedVideo && comments.length > 0 && (
        <View style={styles.commentsContainer}>
          <Text style={styles.commentsHeader}>Comments</Text>
          <ScrollView>
            {comments.map((c, i) => (
              <View key={i} style={styles.comment}>
                <Text style={styles.commentAuthor}>{c.author}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
                <Text style={styles.commentLikes}>👍 {c.likes}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* =========================
   🎨 STYLES
========================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 40 },
  header: { padding: 15, backgroundColor: '#111' },
  logo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  card: { marginBottom: 15, backgroundColor: '#111', flexDirection: 'row', height: 100 },
  thumb: { width: 150, height: '100%' },
  info: { flex: 1, padding: 10, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 14, fontWeight: '600' },
  playText: { color: '#f00', fontSize: 12, marginTop: 5, fontWeight: 'bold' },
  commentsContainer: { padding: 15, backgroundColor: '#000', flex: 1 },
  commentsHeader: { color: '#fff', fontSize: 18, marginBottom: 10, fontWeight: 'bold' },
  comment: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 8 },
  commentAuthor: { color: '#f00', fontWeight: 'bold' },
  commentText: { color: '#fff' },
  commentLikes: { color: '#888', fontSize: 12 },
});
