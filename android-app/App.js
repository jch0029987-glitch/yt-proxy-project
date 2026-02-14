import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, Modal, TextInput, SafeAreaView, StatusBar 
} from 'react-native';
import { Video } from 'expo-av';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [videos, setVideos] = useState([]);
  const [serverIp, setServerIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // 1. Initial Load: Check for saved IP
  useEffect(() => {
    const init = async () => {
      const savedIp = await AsyncStorage.getItem('server_ip');
      if (savedIp) {
        setServerIp(savedIp);
        fetchTrending(savedIp);
      } else {
        setShowSettings(true);
      }
    };
    init();
  }, []);

  // 2. Fetch Videos from Termux Server
  const fetchTrending = async (ip) => {
    setLoading(true);
    try {
      const response = await fetch(`http://${ip}/search?q=trending`, { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      setVideos(data);
    } catch (err) {
      console.error("Fetch failed", err);
      alert("Could not connect to Termux Server.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Auto-Discovery Logic
  const startAutoDiscovery = async () => {
    setScanning(true);
    try {
      const deviceIp = await Network.getIpAddressAsync();
      const subnet = deviceIp.substring(0, deviceIp.lastIndexOf('.'));
      
      // Ping all IPs on the subnet at port 8080
      const pings = [];
      for (let i = 1; i < 255; i++) {
        const testIp = `${subnet}.${i}:8080`;
        pings.push(
          fetch(`http://${testIp}/status`, { signal: AbortSignal.timeout(800) })
            .then(res => res.json())
            .then(data => {
              if (data.status === "online") {
                saveIp(testIp);
                return testIp;
              }
            })
            .catch(() => null)
        );
      }

      const results = await Promise.all(pings);
      if (!results.some(r => r)) alert("Server not found. Is Termux running?");
    } catch (e) {
      alert("Discovery Error: " + e.message);
    } finally {
      setScanning(false);
    }
  };

  const saveIp = (ip) => {
    setServerIp(ip);
    AsyncStorage.setItem('server_ip', ip);
    setShowSettings(false);
    fetchTrending(ip);
  };

  // 4. Playback Logic
  const resolveAndPlay = async (videoId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://${serverIp}/video/${videoId}`);
      const data = await res.json();
      if (data.formats && data.formats.length > 0) {
        setActiveVideo(data.formats[0].url);
      }
    } catch (e) {
      alert("Error resolving video stream.");
    } finally {
      setLoading(false);
    }
  };

  // UI Components
  const renderPoster = ({ item }) => (
    <TouchableOpacity style={styles.poster} onPress={() => resolveAndPlay(item.id)}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <Text style={styles.posterTitle} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Side Tray Navigation */}
      <View style={styles.sideTray}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettings(true)}>
          <View style={[styles.circle, { backgroundColor: '#444' }]} />
        </TouchableOpacity>
        <View style={styles.menuItem}>
          <View style={[styles.circle, { backgroundColor: '#662d91' }]} />
        </TouchableOpacity>
      </View>

      {/* Main Content Grid */}
      <View style={styles.content}>
        <Text style={styles.sectionHeader}>Trending</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#662d91" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={videos}
            renderItem={renderPoster}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Fullscreen Video Player */}
      {activeVideo && (
        <View style={styles.videoOverlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setActiveVideo(null)}>
            <Text style={styles.closeText}>BACK</Text>
          </TouchableOpacity>
          <Video
            source={{ uri: activeVideo }}
            style={styles.fullVideo}
            useNativeControls
            resizeMode="contain"
            shouldPlay
          />
        </View>
      )}

      {/* Settings & Discovery Modal */}
      <Modal visible={showSettings} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Server Settings</Text>
            <TextInput 
              style={styles.input} 
              placeholder="IP:8080" 
              placeholderTextColor="#888"
              value={serverIp}
              onChangeText={setServerIp}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveIp(serverIp)}>
              <Text style={styles.btnText}>CONNECT</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: '#444' }]} 
              onPress={startAutoDiscovery}
              disabled={scanning}
            >
              {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>AUTO DISCOVER</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', flexDirection: 'row' },
  sideTray: { width: 70, backgroundColor: '#1a1a1a', alignItems: 'center', paddingTop: 20 },
  menuItem: { marginBottom: 30 },
  circle: { width: 30, height: 30, borderRadius: 15 },
  content: { flex: 1, paddingHorizontal: 15 },
  sectionHeader: { color: 'white', fontSize: 24, fontWeight: 'bold', marginVertical: 20 },
  poster: { flex: 0.5, margin: 8, backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden' },
  thumbnail: { width: '100%', aspectRatio: 16/9, backgroundColor: '#333' },
  posterTitle: { color: 'white', fontSize: 11, padding: 8, height: 45 },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black', zIndex: 999 },
  fullVideo: { width: '100%', height: '100%' },
  closeBtn: { position: 'absolute', top: 40, left: 20, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 5 },
  closeText: { color: 'white', fontWeight: 'bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#222', padding: 30, borderRadius: 10 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#333', color: 'white', padding: 15, borderRadius: 5, marginBottom: 15 },
  saveBtn: { backgroundColor: '#662d91', padding: 15, borderRadius: 5, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#444', marginVertical: 20 }
});
