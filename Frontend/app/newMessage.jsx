import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const NewMessage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null); // State to store the current user's ID
  const router = useRouter();

  /**
   * Retrieves the authentication token from AsyncStorage.
   * @returns {Promise<string|null>} The authentication token or null if not found.
   */
  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (e) {
      console.error("Failed to load token from storage", e);
      return null;
    }
  };

  /**
   * Decodes the JWT token to extract the user ID.
   * This function is memoized using useCallback.
   */
  const getUserId = useCallback(async () => {
    const token = await getToken();
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        setCurrentUserId(payload.id); // Assuming the 'id' field is present in the token payload
      } catch (e) {
        console.error("Error decoding token:", e);
        setCurrentUserId(null); // Reset if decoding fails
        Alert.alert("Error", "Could not decode user information from token.");
      }
    } else {
      setCurrentUserId(null); // Reset if no token
    }
  }, []); // No dependencies, as it only depends on getToken which is stable

  /**
   * Fetches users based on the search term, excluding the current user.
   */
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
      // Filter out the current user from the list of selectable recipients
      if (currentUserId) {
        setUsers(data.filter(user => user.id !== currentUserId));
      } else {
        // If currentUserId is not yet loaded, show all users temporarily.
        // The list will be re-filtered once currentUserId is available due to the useEffect dependency.
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message || "Could not load users.");
      Alert.alert("Error", err.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  // Effect to get the current user ID when the component mounts
  useEffect(() => {
    getUserId();
  }, [getUserId]); // getUserId is a useCallback, so it's stable

  // Fetch users when the search term changes or currentUserId becomes available
  useEffect(() => {
    // Only fetch users if currentUserId has been determined (or if it's explicitly null, meaning no user)
    // This prevents fetching before we know who the current user is, ensuring proper filtering.
    if (currentUserId !== undefined) { // Check for undefined to ensure initial fetch after currentUserId is set
      fetchUsers();
    }
  }, [searchTerm, currentUserId]); // Add currentUserId as a dependency

  /**
   * Handles the selection/deselection of a user.
   * Prevents the current user from being selected.
   * @param {object} user - The user object to select/deselect.
   */
  const handleUserSelect = (user) => {
    // Prevent selecting the current user
    if (user.id === currentUserId) {
      Alert.alert("Cannot select yourself", "You cannot send a message to yourself.");
      return;
    }

    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  /**
   * Checks if a user is currently selected.
   * @param {object} user - The user object to check.
   * @returns {boolean} True if the user is selected, false otherwise.
   */
  const isUserSelected = (user) => {
    return selectedUsers.some(u => u.id === user.id);
  };

  /**
   * Handles the creation of a new conversation.
   */
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
      // Navigate to the new conversation using the conversation ID
      router.push(`/seeMessages?conversationId=${data.id}`);

    } catch (err) {
      console.error("Error creating conversation:", err);
      setError(err.message || "Failed to create conversation.");
      Alert.alert("Error", err.message || "Could not create conversation.");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust this offset if needed
    >
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
          // Add flexGrow: 1 to FlatList to ensure it takes available space
          contentContainerStyle={{ flexGrow: 1 }}
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
    </KeyboardAvoidingView>
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