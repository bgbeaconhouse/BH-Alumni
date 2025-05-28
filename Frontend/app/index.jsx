import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import React from 'react';
import { Link } from 'expo-router';

const Home = () => {
  return (
    <View style={styles.container}>
      
      <Text style={styles.title}>Alumni Connect</Text>
      <Text style={styles.description}>
        Where you can connect with past alumni and shop latest alumni gear!
      </Text>
      <TouchableOpacity style={styles.button}>
        <Link href="/login" style={styles.buttonText}>
          Login
        </Link>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Link href="/register" style={styles.buttonText}>
          Register
        </Link>
      </TouchableOpacity>
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
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginVertical: 10,
     width: 200, // Added a fixed width
    alignItems: 'center', // Added to center text within the button
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    marginBottom: 30, // Changed from marginTop to marginBottom
    color: '#555',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
});