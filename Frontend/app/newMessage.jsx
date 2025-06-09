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
  StatusBar,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

const NewMessage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const router = useRouter();

  /**
   * Retrieves the authentication token from Expo SecureStore.
   * @returns {Promise<string|null>} The authentication token or null if not found.
   */
  const getToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      return token;
    } catch (e) {
      console.error("Failed to load token from secure storage", e);
      return null;
    }
  };

  /**
   * Stores the authentication token in Expo SecureStore.
   * @param {string} token - The authentication token to store.
   */
  const setToken = async (token) => {
    try {
      await SecureStore.setItemAsync('authToken', token);
    } catch (e) {
      console.error("Failed to save token to secure storage", e);
    }
  };

  /**
   * Removes the authentication token from Expo SecureStore.
   */
  const removeToken = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
    } catch (e) {
      console.error("Failed to remove token from secure storage", e);
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
        setCurrentUserId(payload.id);
      } catch (e) {
        console.error("Error decoding token:", e);
        setCurrentUserId(null);
        Alert.alert("Error", "Could not decode user information from token.");
        // Consider removing invalid token
        await removeToken();
      }
    } else {
      setCurrentUserId(null);
    }
  }, []);

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

      const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/profiles?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Handle token expiration or unauthorized access
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please log in again.");
          await removeToken();
          // You might want to navigate to login screen here
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data = await response.json();
      if (currentUserId) {
        setUsers(data.filter(user => user.id !== currentUserId));
      } else {
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

  useEffect(() => {
    getUserId();
  }, [getUserId]);

  useEffect(() => {
    if (currentUserId !== undefined) {
      fetchUsers();
    }
  }, [searchTerm, currentUserId]);

  /**
   * Handles the selection/deselection of a user.
   * Prevents the current user from being selected.
   * @param {object} user - The user object to select/deselect.
   */
  const handleUserSelect = (user) => {
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

      const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/conversations', {
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
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please log in again.");
          await removeToken();
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation');
      }

      const data = await response.json();
      setLoading(false);
      router.push(`/seeMessages?conversationId=${data.id}`);

    } catch (err) {
      console.error("Error creating conversation:", err);
      setError(err.message || "Failed to create conversation.");
      Alert.alert("Error", err.message || "Could not create conversation.");
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color="#2c3e50" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/messaging')}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Search Container */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search community members..."
          placeholderTextColor="#bdc3c7"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>To: {selectedUsers.map(u => u.firstName).join(', ')}</Text>
        </View>
      )}

      {/* Users List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load users</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : users.length === 0 && searchTerm ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>Try searching with different keywords</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, isUserSelected(item) && styles.selectedUserItem]}
              onPress={() => handleUserSelect(item)}
            >
              <View style={styles.userContent}>
                <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
                {isUserSelected(item) && (
                  <Text style={styles.selectedIndicator}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Initial Message Input */}
      {selectedUsers.length > 0 && (
        <View style={styles.messageContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Write your first message..."
            placeholderTextColor="#bdc3c7"
            value={initialMessage}
            onChangeText={setInitialMessage}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Create Button */}
      <TouchableOpacity
        style={[
          styles.createButton,
          (loading || selectedUsers.length === 0) && styles.createButtonDisabled
        ]}
        onPress={handleCreateConversation}
        disabled={loading || selectedUsers.length === 0}
      >
        <Text style={[
          styles.createButtonText,
          (loading || selectedUsers.length === 0) && styles.createButtonTextDisabled
        ]}>
          {loading ? 'Creating...' : 'Start Conversation'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

export default NewMessage
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '100',
    color: '#2c3e50',
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#ecf0f1',
    letterSpacing: 0.5,
  },
  selectedContainer: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  selectedLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 0.5,
  },
  retryButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#7f8c8d',
    fontWeight: '300',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 30,
    paddingTop: 10,
    paddingBottom: 20,
  },
  userItem: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  selectedUserItem: {
    backgroundColor: '#f8f9fa',
  },
  userContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  selectedIndicator: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '300',
  },
  messageContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  messageInput: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#ecf0f1',
    letterSpacing: 0.5,
    minHeight: 80,
  },
  createButton: {
    backgroundColor: '#2c3e50',
    marginHorizontal: 30,
    marginVertical: 20,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ecf0f1',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  createButtonTextDisabled: {
    color: '#bdc3c7',
  },
});