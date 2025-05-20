import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React from 'react';
import { Link } from 'expo-router';

const Home = () => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutButton}>
        <Link href="/" style={styles.logoutText}>
          Logout
        </Link>
      </TouchableOpacity>

      <View style={styles.centerContainer}>
        <TouchableOpacity style={styles.postButton}>
          <Link href="/post" style={styles.buttonText}>
            Posts
          </Link>
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageButton}>
          <Link href="/message" style={styles.buttonText}>
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
    marginBottom: 20, // Added marginBottom here
    width: 200,
    alignItems: 'center',
  },
  postButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20, // Added marginBottom here
    width: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});