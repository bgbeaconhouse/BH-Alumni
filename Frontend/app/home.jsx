import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
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
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.centerContainer}>
        <TouchableOpacity style={styles.postButton}>
          <Link href="/post" style={styles.buttonText}>
            Posts
          </Link>
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageButton}>
          <Link href="/messaging" style={styles.buttonText}>
            Messages
          </Link>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shopButton}>
          <Link href="/shop" style={styles.buttonText}>
            Shop
          </Link>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  logoutText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: 200,
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: 200,
    alignItems: 'center',
  },
  postButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});