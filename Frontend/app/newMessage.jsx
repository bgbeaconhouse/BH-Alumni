import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const NewMessage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialMessage, setInitialMessage] = useState('');
  const router = useRouter();

  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (e) {
      console.error("Failed to load token from storage", e);
      return null;
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }

      const response = await fetch(`http://192.168.0.34:3000/api/profiles?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message || "Could not load users.");
      Alert.alert("Error", err.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch users when the component mounts or the search term changes
    fetchUsers();
  }, [searchTerm]);

  const handleUserSelect = (user) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const isUserSelected = (user) => {
    return selectedUsers.some(u => u.id === user.id);
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Warning", "Please select at least one recipient.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }

      const recipientIds = selectedUsers.map(user => user.id);

      const response = await fetch('http://192.168.0.34:3000/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientIds: recipientIds,
          initialMessage: initialMessage.trim() ? { content: initialMessage } : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation');
      }

      const data = await response.json();
      setLoading(false);
      // Navigate to the new conversation
      router.push(`/seeMessages?conversationId=${data.id}`);

    } catch (err) {
      console.error("Error creating conversation:", err);
      setError(err.message || "Failed to create conversation.");
      Alert.alert("Error", err.message || "Could not create conversation.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/messaging')}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>New Message</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <Text style={styles.sectionTitle}>Select Recipients</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, isUserSelected(item) && styles.selectedUserItem]}
              onPress={() => handleUserSelect(item)}
            >
              <Text>{item.firstName} {item.lastName}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {selectedUsers.length > 0 && (
        <View style={styles.initialMessageContainer}>
          <Text style={styles.sectionTitle}>Initial Message (Optional)</Text>
          <TextInput
            style={styles.initialMessageInput}
            placeholder="Type your first message..."
            value={initialMessage}
            onChangeText={setInitialMessage}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateConversation}
        disabled={loading || selectedUsers.length === 0}
      >
        <Text style={styles.createButtonText}>{loading ? 'Creating...' : 'Create Conversation'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 10,
    backgroundColor: '#f4f4f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  userItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedUserItem: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  initialMessageContainer: {
    marginTop: 20,
  },
  initialMessageInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default NewMessage;