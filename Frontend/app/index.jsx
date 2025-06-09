import { StyleSheet, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import React from 'react';
import { Link } from 'expo-router';

const Home = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Main Content - Centered */}
      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Text style={styles.logo}>BH</Text>
          <Text style={styles.title}>Alumni Connect</Text>
          <Text style={styles.tagline}>Connected for life</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.loginButton}>
            <Link href="/login" style={styles.loginText}>
              Sign In
            </Link>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.registerButton}>
            <Link href="/register" style={styles.registerText}>
              Join Network
            </Link>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Simple Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Beacon House • Est. 1974</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: '100',
    color: '#2c3e50',
    letterSpacing: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  actionButtons: {
    width: '100%',
    maxWidth: 280,
  },
  loginButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 18,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  loginText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  registerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c3e50',
    alignItems: 'center',
  },
  registerText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
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