import React, { useEffect, useRef, useState } from "react";
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
  Platform,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";

export default function App() {
  const videoPlayer = useRef(null);

  const TERMUX_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:8080"
      : "http://localhost:8080";

  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [page, setPage] = useState("home");
  const [region, setRegion] = useState("US");

  /* =========================
     🔥 LOAD TRENDING
  ========================== */
  const loadTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${TERMUX_URL}/trending?region=${region}`);
      const data = await res.json();
      setVideos(data);
    } catch {
      alert("Trending failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrending();
  }, [region]);

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
      setPage("home");
    } catch {
      alert("Search failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ▶️ PLAY VIDEO
  ========================== */
  const startVideo = async (videoId) => {
    setSelectedVideo(videoId);
    setComments([]);

    try {
      const res = await fetch(`${TERMUX_URL}/video/${videoId}`);
      const data = await res.json();
      const streamUrl = data.formats[0].url;

      fetch(`${TERMUX_URL}/comments/${videoId}`)
        .then(r => r.json())
        .then(setComments)
        .catch(() => {});

      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      await NavigationBar.setVisibilityAsync("hidden");

      await videoPlayer.current.loadAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        false
      );

      await videoPlayer.current.presentFullscreenPlayer();
    } catch {
      alert("Playback failed");
    }
  };

  const onFullscreenUpdate = async ({ fullscreenUpdate }) => {
    if (fullscreenUpdate === Video.FULLSCREEN_UPDATE_PLAYER_DID_DISMISS) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      await NavigationBar.setVisibilityAsync("visible");
    }
  };

  /* =========================
     🧭 NAVIGATION
  ========================== */
  const NavBar = () => (
    <View style={styles.nav}>
      <TouchableOpacity onPress={() => setPage("home")}>
        <Text style={styles.navText}>🏠 Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setPage("settings")}>
        <Text style={styles.navText}>⚙️ Settings</Text>
      </TouchableOpacity>
    </View>
  );

  /* =========================
     ⚙️ SETTINGS PAGE
  ========================== */
  const Settings = () => (
    <View style={styles.settings}>
      <Text style={styles.settingsTitle}>Region</Text>
      {["US", "GB", "CA", "DE", "JP"].map(r => (
        <TouchableOpacity key={r} onPress={() => setRegion(r)}>
          <Text
            style={[
              styles.region,
              region === r && { color: "#f00", fontWeight: "bold" },
            ]}
          >
            {r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  /* =========================
     🎨 UI
  ========================== */
  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          Private<Text style={{ color: "#f00" }}>Tube</Text>
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

      <Video
        ref={videoPlayer}
        style={{ width: 0, height: 0 }}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        onFullscreenUpdate={onFullscreenUpdate}
      />

      {page === "settings" ? (
        <Settings />
      ) : loading ? (
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
                <Text style={styles.channel}>{item.channel}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <NavBar />

      {/* COMMENTS */}
      {selectedVideo && comments.length > 0 && (
        <View style={styles.comments}>
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
  container: { flex: 1, backgroundColor: "#000", paddingTop: 40 },
  header: { padding: 15, backgroundColor: "#111" },
  logo: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  input: { backgroundColor: "#222", color: "#fff", borderRadius: 20, paddingHorizontal: 15, height: 40 },

  card: { marginBottom: 15, backgroundColor: "#111", flexDirection: "row", height: 100 },
  thumb: { width: 150, height: "100%" },
  info: { flex: 1, padding: 10, justifyContent: "center" },
  title: { color: "#fff", fontSize: 14, fontWeight: "600" },
  channel: { color: "#aaa", fontSize: 12 },

  nav: { flexDirection: "row", justifyContent: "space-around", padding: 10, backgroundColor: "#111" },
  navText: { color: "#fff", fontSize: 16 },

  settings: { padding: 20 },
  settingsTitle: { color: "#fff", fontSize: 18, marginBottom: 10 },
  region: { color: "#ccc", fontSize: 16, marginBottom: 5 },

  comments: { padding: 15, backgroundColor: "#000", maxHeight: 200 },
  commentsHeader: { color: "#fff", fontSize: 16, marginBottom: 8 },
  comment: { marginBottom: 8 },
  commentAuthor: { color: "#f00", fontWeight: "bold" },
  commentText: { color: "#fff" },
  commentLikes: { color: "#888", fontSize: 12 },
});
