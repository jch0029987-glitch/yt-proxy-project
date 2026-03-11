import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Keyboard, ScrollView, Platform, Dimensions } from "react-native";
import { Video, ResizeMode } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";

const { width } = Dimensions.get("window");

export default function App() {
  const videoPlayer = useRef(null);
  const skipSegments = useRef([]); // Stores SponsorBlock data

  // Tip: For Android physical device, use your phone's actual IP (e.g., 192.168.x.x)
  const TERMUX_URL = "http://127.0.0.1:8000"; 

  const [feed, setFeed] = useState([]); // Now stores categorized rows
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState("home");

  /* =========================
     🔥 LOAD SMART FEED
  ========================== */
  const loadHomeFeed = async () => {
    setLoading(true);
    try {
      // We fetch multiple categories to build a "SmartTube" layout
      const categories = ["trending", "music", "gaming", "news"];
      const feedData = await Promise.all(
        categories.map(async (cat) => {
          const res = await fetch(`${TERMUX_URL}/api/feed/${cat}`);
          const data = await res.json();
          return { title: cat.toUpperCase(), data };
        })
      );
      setFeed(feedData);
    } catch (e) {
      console.error("Feed error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHomeFeed(); }, []);

  /* =========================
     ⏩ SPONSORBLOCK LOGIC
  ========================== */
  const checkSponsorBlock = (status) => {
    const currentTime = status.positionMillis / 1000;
    const segment = skipSegments.current.find(
      (s) => currentTime >= s.segment[0] && currentTime < s.segment[1]
    );

    if (segment) {
      console.log("Skipping sponsor segment...");
      videoPlayer.current.setPositionAsync(segment.segment[1] * 1000);
    }
  };

  /* =========================
     ▶️ ENHANCED PLAYBACK
  ========================== */
  const startVideo = async (videoId) => {
    try {
      // 1. Get Stream
      const res = await fetch(`${TERMUX_URL}/api/video/${videoId}`);
      const data = await res.json();

      // 2. Get SponsorBlock Segments
      const sbRes = await fetch(`${TERMUX_URL}/api/skip/${videoId}`);
      skipSegments.current = await sbRes.json();

      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      await NavigationBar.setVisibilityAsync("hidden");

      await videoPlayer.current.loadAsync(
        { uri: data.url },
        { shouldPlay: true },
        false
      );
      await videoPlayer.current.presentFullscreenPlayer();
    } catch (e) {
      alert("Playback failed");
    }
  };

  /* =========================
     🎨 UI COMPONENTS
  ========================== */
  const VideoRow = ({ section }) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {section.data.map((item) => (
          <TouchableOpacity key={item.id} style={styles.miniCard} onPress={() => startVideo(item.id)}>
            <Image source={{ uri: item.thumb }} style={styles.miniThumb} />
            <Text style={styles.miniTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.miniAuthor}>{item.author}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Smart<Text style={{ color: "#f00" }}>Termux</Text></Text>
        <TextInput 
          style={styles.input} 
          placeholder="Search..." 
          placeholderTextColor="#777"
          onChangeText={setSearch}
          onSubmitEditing={() => {/* Add Search Logic */}}
        />
      </View>

      <Video
        ref={videoPlayer}
        style={{ width: 0, height: 0 }}
        onPlaybackStatusUpdate={checkSponsorBlock}
        useNativeControls
      />

      {loading ? (
        <ActivityIndicator size="large" color="#f00" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => <VideoRow section={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 40 },
  header: { padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  input: { backgroundColor: "#222", color: "#fff", borderRadius: 10, paddingHorizontal: 15, width: '60%', height: 35 },
  
  sectionContainer: { marginVertical: 15, paddingLeft: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  
  miniCard: { width: 200, marginRight: 15 },
  miniThumb: { width: 200, height: 112, borderRadius: 8 },
  miniTitle: { color: "#fff", fontSize: 14, marginTop: 5, fontWeight: "500" },
  miniAuthor: { color: "#aaa", fontSize: 12 },
});
