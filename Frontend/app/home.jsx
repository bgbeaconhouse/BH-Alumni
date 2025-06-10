import { StyleSheet, Text, View, TouchableOpacity, Alert, StatusBar, Platform } from 'react-native';
import React from 'react';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Home = () => {
  const router = useRouter();

  const logout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Remove token from SecureStore
              await SecureStore.deleteItemAsync('authToken');
              
              // Clear any AsyncStorage remnants
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('userId');
              await AsyncStorage.removeItem('token');
              
              // Navigate to login page and prevent going back
              router.replace('/');
              
            } catch (error) {
              console.error('Error during logout:', error);
              // Even if there's an error, still navigate away for security
              router.replace('/');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Brand Section */}
        <View style={styles.brandSection}>
          <Text style={styles.logo}>BH</Text>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitle}>Your recovery community</Text>
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={[styles.menuButton, styles.primaryButton]}>
            <Link href="/post" style={styles.primaryMenuLink}>
              <Text style={styles.primaryMenuText}>Posts</Text>
            </Link>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton}>
            <Link href="/messaging" style={styles.menuLink}>
              <Text style={styles.menuText}>Messages</Text>
            </Link>
          </TouchableOpacity>

          {/* Shop button commented out
          <TouchableOpacity style={styles.menuButton}>
            <Link href="/shop" style={styles.menuLink}>
              <Text style={styles.menuText}>Shop</Text>
            </Link>
          </TouchableOpacity>
          */}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Beacon House • Connected in recovery</Text>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 30,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    fontSize: 48,
    fontWeight: '100',
    color: '#2c3e50',
    letterSpacing: 8,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  menuSection: {
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  menuButton: {
    backgroundColor: 'transparent',
    paddingVertical: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  primaryButton: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  menuLink: {
    width: '100%',
    alignItems: 'center',
  },
  primaryMenuLink: {
    width: '100%',
    alignItems: 'center',
  },
  menuText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  primaryMenuText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#bdc3c7',
    fontWeight: '300',
    letterSpacing: 1,
  },
});