import { StyleSheet, Text, View, TouchableOpacity, TextInput, Button, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const CreatePosts = () => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [authToken, setAuthToken] = useState(null);
  const [media, setMedia] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false); // New state

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

  const pickMedia = async () => {
    setIsUploadingMedia(true); // Start of upload
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      setMedia(prevMedia => [...prevMedia, ...result.assets]);
      console.log('Selected media:', result.assets);
    }
    setIsUploadingMedia(false); // End of upload
  };

  // Custom alert function to replace native alert
  const showAlert = (message) => {
    // In a real React Native app, you'd use a custom modal or a library
    // like 'react-native-modal' or 'react-native-popup-dialog' for alerts.
    // For this example, we'll log to console and assume a visual component
    // would display this message.
    console.warn("App Alert:", message);
    // You might set a state variable here to control a custom modal's visibility and message
  };

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) {
      showAlert('Post content or media must be provided.');
      return;
    }

    if (!authToken) {
      showAlert('Authentication token not available. Please log in.');
      router.replace('/login');
      return;
    }

    setIsSubmitting(true); // Set submitting state to true

    try {
      const apiUrl = 'http://192.168.0.34:3000/api/posts'; // Ensure this is the correct endpoint
      const formData = new FormData();

      formData.append('content', content);

      media.forEach((item) => {
        const uriParts = item.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('media', {
          uri: item.uri,
          name: `media-${Date.now()}.${fileType}`,
          type: item.type === 'image' ? `image/${fileType}` : `video/${fileType}`,
        });
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          // 'Content-Type': 'multipart/form-data', // FormData sets this automatically with correct boundary
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('Post created successfully:', responseData);
        setContent('');
        setMedia([]);
        router.push('/post');
      } else {
        console.error('Failed to create post:', responseData);
        showAlert(`Failed to create post: ${responseData.error || 'Something went wrong'}`);
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      showAlert('Error submitting post.');
    } finally {
      setIsSubmitting(false); // Set submitting state back to false
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
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

        <TouchableOpacity style={styles.uploadButton} onPress={pickMedia} disabled={isUploadingMedia}>
          <Text style={styles.uploadButtonText}>
            {isUploadingMedia ? 'Uploading Media...' : 'Upload Media'}
          </Text>
          {isUploadingMedia && <ActivityIndicator style={{ marginLeft: 10 }} color="white" />}
        </TouchableOpacity>

        {media.length > 0 && (
          <View style={styles.mediaPreview}>
            <Text style={styles.label}>Selected Media:</Text>
            {media.map((item, index) => (
              <Text key={index} style={styles.mediaItemText}>{item.uri.substring(item.uri.lastIndexOf('/') + 1)}</Text>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.createButtonText}>
            {isSubmitting ? 'Creating Post...' : 'Create Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default CreatePosts;

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1, // Allows content to grow and enable scrolling
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8', // Added a light background for better contrast
  },
  backButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    width: 80,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000', // Added shadow for a subtle lift
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 28, // Increased font size for title
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  multilineInput: {
    minHeight: 120, // Increased minHeight for better input area
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#FF9800', // Orange color
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row', // To align text and activity indicator
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  mediaPreview: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e9e9e9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mediaItemText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  createButton: {
    backgroundColor: '#2196F3', // Blue color
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});