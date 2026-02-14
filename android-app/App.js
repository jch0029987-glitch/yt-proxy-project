import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Roku Remote Proxy</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.circle, { backgroundColor: '#662d91' }]} />
            <Text style={styles.itemText}>YouTube</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.circle, { backgroundColor: '#ff0000' }]} />
            <Text style={styles.itemText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { padding: 50, backgroundColor: '#662d91', alignItems: 'center' },
  headerText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  scrollContainer: { padding: 20 },
  menuGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  menuItem: { alignItems: 'center' },
  circle: { width: 60, height: 60, borderRadius: 30, marginBottom: 10 },
  itemText: { color: 'white' }
});
