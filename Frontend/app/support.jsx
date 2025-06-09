import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { Link, useRouter } from 'expo-router';
import React from 'react';

const Support = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Link href="/post" style={styles.backButtonText}>
            ← Back
          </Link>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Text style={styles.logo}>BH</Text>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.subtitle}>We're here to help</Text>
        </View>

        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            For any questions, concerns, or technical issues with the app, please reach out to us:
          </Text>
          
          <Text style={styles.emailText}>bgbeaconhouse@gmail.com</Text>
          
          <Text style={styles.responseText}>
            We'll respond as quickly as possible to help resolve any issues you may be experiencing.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Beacon House • Connected in recovery</Text>
      </View>
    </View>
  );
};

export default Support;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
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
  supportSection: {
    alignItems: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
  supportText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  emailText: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '300',
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