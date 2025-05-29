import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Link, useRouter } from 'expo-router';

const Messaging = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Function to retrieve the JWT token from SecureStore
  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      return token;
    } catch (e) {
      console.error("Failed to load token from secure storage", e);
      return null;
    }
  };

  // Function to fetch conversations from the backend
  const fetchConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      if (!token) {
        setError("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      const response = await fetch('http://192.168.0.34:3000/api/conversations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(err.message || "An unexpected error occurred while fetching conversations.");
      Alert.alert("Error", err.message || "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewMessagePress = () => {
    router.push('/newMessage');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/home')}>
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newMessageButton} onPress={handleNewMessagePress}>
            <Text style={styles.newMessageButtonText}>New Message</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Loading conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchConversations}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centered}>
          <Text>No conversations found.</Text>
          <Text>Start a new chat to see it here!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Link
              href={{
                pathname: '/seeMessages',
                params: { conversationId: item.id },
              }}
              style={styles.conversationItem}
            >
              <Text style={styles.conversationName}>{item.name ? item.name : item.participants.map(p => p.firstName).join(', ')}</Text>
              {item.lastMessage && (
                <>
                 <View style={{ width: 10 }} />
                <Text style={styles.lastMessage}>
                  {item.lastMessage.sender.firstName}: {item.lastMessage.content ? item.lastMessage.content : 'Attachment'}
                </Text>
                </>
              )}
              {!item.lastMessage && (
                <Text style={styles.noMessage}>No messages yet.</Text>
              )}
            </Link>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

export default Messaging;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  homeButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  newMessageButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  newMessageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  conversationItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  conversationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  noMessage: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});