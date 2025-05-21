import { StyleSheet, Text, View, TouchableOpacity, TextInput, Button } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreatePosts = () => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          setAuthToken(token);
        } else {
          console.log('No auth token found. Redirecting to login.');
          router.replace('/login'); // Adjust the route as needed
        }
      } catch (error) {
        console.error('Error fetching auth token:', error);
        router.replace('/login');
      }
    };

    getToken();
  }, [router]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('Post content cannot be empty.');
      return;
    }

    if (!authToken) {
      alert('Authentication token not available. Please log in.');
      router.replace('/login');
      return;
    }

    try {
      const apiUrl = 'http://192.168.0.34:3000/api/posts'; // Ensure this is the correct endpoint

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content }),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('Post created successfully:', responseData);
        setContent('');
        router.push('/post');
      } else {
        console.error('Failed to create post:', responseData);
        alert(`Failed to create post: ${responseData.error || 'Something went wrong'}`);
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      alert('Error submitting post.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/post')}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Create New Post</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Content:</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Enter content"
          multiline
          numberOfLines={4}
          value={content}
          onChangeText={setContent}
        />
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleSubmit}>
        <Text style={styles.createButtonText}>Create Post</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreatePosts;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    backgroundColor: 'lightgray',
    padding: 10,
    borderRadius: 5,
    width: 80,
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: 'lightblue',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});