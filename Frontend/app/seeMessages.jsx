import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Keep for migration
import * as ImagePicker from 'expo-image-picker';

import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';

// SecureStore keys constants
const SECURE_STORE_KEYS = {
    AUTH_TOKEN: 'authToken',
    USER_ID: 'userId',
    MIGRATION_COMPLETED: 'migrationCompleted',
};

// SecureStore helper functions
const storeSecureData = async (key, value) => {
    try {
        await SecureStore.setItemAsync(key, value);
    } catch (error) {
        console.error(`Failed to store ${key} in SecureStore:`, error);
        throw error;
    }
};

const getSecureData = async (key) => {
    try {
        const value = await SecureStore.getItemAsync(key);
        return value;
    } catch (error) {
        console.error(`Failed to retrieve ${key} from SecureStore:`, error);
        return null;
    }
};

const deleteSecureData = async (key) => {
    try {
        await SecureStore.deleteItemAsync(key);
    } catch (error) {
        console.error(`Failed to delete ${key} from SecureStore:`, error);
        throw error;
    }
};

// Migration function to move data from AsyncStorage to SecureStore
const migrateToSecureStore = async () => {
    try {
        // Check if migration has already been done
        const migrationFlag = await getSecureData(SECURE_STORE_KEYS.MIGRATION_COMPLETED);
        if (migrationFlag === 'true') {
            return; // Migration already completed
        }

        console.log('Starting migration from AsyncStorage to SecureStore...');

        // Migrate auth token
        const oldToken = await AsyncStorage.getItem('authToken');
        if (oldToken) {
            await storeSecureData(SECURE_STORE_KEYS.AUTH_TOKEN, oldToken);
            await AsyncStorage.removeItem('authToken'); // Clean up old storage
            console.log('Auth token migrated successfully');
        }

        // Mark migration as completed
        await storeSecureData(SECURE_STORE_KEYS.MIGRATION_COMPLETED, 'true');
        console.log('Migration to SecureStore completed successfully');
    } catch (error) {
        console.error('Migration to SecureStore failed:', error);
    }
};

// Memoized Message Item Component to prevent unnecessary re-renders
const MessageItem = memo(({ item, currentUserId, onImagePress }) => {
    const isCurrentUserSender = item.senderId === currentUserId;

    return (
        <View style={[styles.messageBubble, isCurrentUserSender ? styles.sentMessage : styles.receivedMessage]}>
            <Text style={[styles.senderName, isCurrentUserSender ? styles.sentSenderName : styles.receivedSenderName]}>
                {isCurrentUserSender ? 'You' : item.sender?.firstName}
            </Text>
            <Text style={[styles.messageText, isCurrentUserSender ? styles.sentMessageText : styles.receivedMessageText]}>{item.content}</Text>
            {(item.imageAttachments && item.imageAttachments.length > 0) && (
                item.imageAttachments.map(attachment => (
                    <TouchableOpacity
                        key={attachment.id}
                        onPress={() => onImagePress(`https://bh-alumni-social-media-app.onrender.com${attachment.url}`)}
                        style={styles.attachmentContainer}
                    >
                        <Image
                            source={{ uri: `https://bh-alumni-social-media-app.onrender.com${attachment.url}` }}
                            style={styles.imageAttachment}
                            resizeMode="cover"
                            onError={(error) => console.error("Image loading error:", error)}
                        />
                    </TouchableOpacity>
                ))
            )}
            {(item.videoAttachments && item.videoAttachments.length > 0) && (
                item.videoAttachments.map(attachment => (
                    <Video
                        key={attachment.id}
                        source={{ uri: `https://bh-alumni-social-media-app.onrender.com${attachment.url}` }}
                        style={styles.videoAttachment}
                        useNativeControls
                        resizeMode="cover"
                        shouldPlay={false}
                    />
                ))
            )}
        </View>
    );
});

const SeeMessages = () => {
    const { conversationId } = useLocalSearchParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const flatListRef = useRef(null);
    const router = useRouter();
    const [currentUserId, setCurrentUserId] = useState(null);
    const websocket = useRef(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const getToken = async () => {
        try {
            const token = await getSecureData(SECURE_STORE_KEYS.AUTH_TOKEN);
            return token;
        } catch (e) {
            console.error("Failed to load token from SecureStore", e);
            return null;
        }
    };

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
                return payload.id;
            } catch (e) {
                console.error("Error decoding token:", e);
                setCurrentUserId(null);
                return null;
            }
        } else {
            setCurrentUserId(null);
            return null;
        }
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) {
                setError("Authentication token not found.");
                setLoading(false);
                return;
            }

            const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/conversations/${conversationId}/messages?sort=createdAt`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch messages');
            }

            const data = await response.json();
            setMessages(data);
        } catch (err) {
            console.error("Error fetching messages:", err);
            setError(err.message || "Failed to load messages.");
            Alert.alert("Error", err.message || "Could not load messages.");
        } finally {
            setLoading(false);
        }
    };

   const sendMessage = async () => {
    if (newMessage.trim()) {
        console.log("Sending text message:", newMessage.trim());
        
        const token = await getToken();
        if (!token) {
            Alert.alert("Error", "Authentication token not found.");
            return;
        }

        try {
            const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ content: newMessage.trim() }),
            });

            console.log("Text message response:", response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            const responseData = await response.json();
            console.log("Text message sent successfully:", responseData);

            // Clear input immediately
            setNewMessage('');
            
            // MANUALLY ADD THE MESSAGE TO STATE since WebSocket isn't sending it back
            setMessages(prevMessages => {
                // Check if message already exists (in case WebSocket does work sometimes)
                const messageExists = prevMessages.some(msg => msg.id === responseData.id);
                
                if (!messageExists) {
                    const newMessages = [...prevMessages, responseData];
                    
                    // Scroll to end
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                    
                    return newMessages;
                }
                return prevMessages;
            });
            
        } catch (err) {
            console.error("Error sending message via HTTP:", err);
            Alert.alert("Error", err.message || "Could not send message.");
        }
    }
};

    const pickMedia = async () => {
          if (isUploading) {
        Alert.alert("Please wait", "Another upload is in progress");
        return;
    }
       
       
        let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert('Permission to access camera roll is required!');
            return;
        }

        let pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: Platform.OS === 'ios' ? true : false,
        aspect: [4, 3],
        quality: 0.7, // Reduce quality to 70%
        videoMaxDuration: 30, // Limit videos to 30 seconds
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const selectedMedia = pickerResult.assets[0];
        
        // Check file size before proceeding
     
        
        setIsUploading(true);
        await handleSendMedia(selectedMedia);

        setTimeout(() => {
            setIsUploading(false);
        }, 2000);
    }
};

const handleSendMedia = async (media, retryCount = 0) => {
    const token = await getToken();
    if (!token) {
        Alert.alert("Error", "Authentication token not found.");
        return;
    }

    try {
        console.log("Media URI in handleSendMedia:", media.uri);
        console.log("Media Type:", media.mimeType);

        const formData = new FormData();
        formData.append('media', {
            uri: media.uri,
            name: media.fileName || `media-${Date.now()}.${media.mimeType.split('/')[1]}`,
            type: media.mimeType,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send media');
        }

        const responseData = await response.json();
        console.log("Media sent successfully:", responseData);
        
        // MANUALLY ADD THE MEDIA MESSAGE TO STATE
        setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => msg.id === responseData.id);
            
            if (!messageExists) {
                const newMessages = [...prevMessages, responseData];
                
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
                
                return newMessages;
            }
            return prevMessages;
        });

    } catch (err) {
        console.error("Error sending media:", err);
        
        if (retryCount < 3 && (
            err.name === 'AbortError' || 
            err.message.includes('Network request failed') ||
            err.message.includes('timeout')
        )) {
            console.log(`Retrying upload... Attempt ${retryCount + 1}`);
            setTimeout(() => {
                handleSendMedia(media, retryCount + 1);
            }, 3000 * (retryCount + 1));
            return;
        }
        
        Alert.alert("Error", err.message || "Could not send media.");
    }
};

    const handleImagePress = useCallback((imageUrl) => {
        setSelectedImage(imageUrl);
        setModalVisible(true);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const connectWebSocket = async () => {
            const token = await getToken();
            const userId = await getUserId();
            if (token && userId) {
                try {
                    // Ensure the WebSocket URL is correct for your backend setup
                    websocket.current = new WebSocket(`wss://bh-alumni-social-media-app.onrender.com/?token=${token}`);

                    websocket.current.onopen = () => {
                        console.log("WebSocket connected");
                    };

               websocket.current.onmessage = (event) => {
    try {
        const parsedMessage = JSON.parse(event.data);
        console.log("WebSocket received:", parsedMessage);
        
        if (parsedMessage.type === 'newMessage' && 
            parsedMessage.message.conversationId === parseInt(conversationId)) {
            
            if (isMounted) {
                console.log("Adding message to state:", parsedMessage.message);
                
                setMessages(prevMessages => {
                    // More robust duplicate check
                    const messageExists = prevMessages.some(msg => 
                        msg.id === parsedMessage.message.id || 
                        (msg.content === parsedMessage.message.content && 
                         msg.senderId === parsedMessage.message.senderId &&
                         Math.abs(new Date(msg.createdAt) - new Date(parsedMessage.message.createdAt)) < 1000)
                    );
                    
                    if (!messageExists) {
                        const newMessages = [...prevMessages, parsedMessage.message];
                        
                        // Sort messages by createdAt to ensure proper order
                        newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        
                        // Scroll to end after state update
                        setTimeout(() => {
                            flatListRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                        
                        return newMessages;
                    }
                    return prevMessages;
                });
            }
        }
    } catch (e) {
        console.error("Error parsing WebSocket message:", e);
    }
};

                    websocket.current.onclose = () => {
                        console.log("WebSocket disconnected. Attempting to reconnect...");
                        // Implement a backoff strategy for reconnection attempts if needed
                        setTimeout(connectWebSocket, 3000);
                    };

                    websocket.current.onerror = (error) => {
                        console.error("WebSocket error:", error);
                        // Consider closing and attempting to reconnect on error
                        websocket.current.close();
                    };
                } catch (error) {
                    console.error("Error connecting to WebSocket:", error);
                }
            }
        };

        const initializeComponent = async () => {
            // Run migration first
            await migrateToSecureStore();
            
            // Then proceed with normal initialization
            await getUserId();
            if (conversationId) {
                fetchMessages();
                connectWebSocket();
            }
        };

        initializeComponent();

        return () => {
            isMounted = false;
            if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
                websocket.current.close();
            }
        };
    }, [getUserId, conversationId]); // Dependencies for useEffect

    useEffect(() => {
        // Scroll to end when messages load or new messages arrive
        if (messages.length > 0 && !loading) {
            // Use a small timeout to ensure FlatList has rendered new items
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true }); // Changed to animated: true for smoother scroll
            }, 100);
        }
    }, [messages, loading]);

    // Pass necessary props to the memoized MessageItem
    const renderMessageItem = useCallback(({ item }) => (
        <MessageItem
            item={item}
            currentUserId={currentUserId}
            onImagePress={handleImagePress}
        />
    ), [currentUserId, handleImagePress]); // Dependencies for useCallback

    if (loading && messages.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <ActivityIndicator size="large" color="#2c3e50" />
                <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <Text style={styles.errorText}>Unable to load conversation</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header */}
        <View style={styles.header}>
            <View style={styles.leftButtonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/messaging')}>
                    <Text style={styles.headerButtonText}>← Messages</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.spacer} />
            <View style={styles.rightTitleContainer}>
                <Text style={styles.headerTitle}>Conversation</Text>
            </View>
        </View>

        {/* Messages List */}
        <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesContainer}
            style={styles.messagesList}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={21}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={false}
        />

        {/* Input Container */}
        <View style={styles.inputContainer}>
            <TouchableOpacity 
                onPress={pickMedia} 
                style={[styles.mediaButton, isUploading && styles.mediaButtonDisabled]}
                disabled={isUploading}
            >
                <Text style={[styles.mediaButtonText, isUploading && styles.mediaButtonTextDisabled]}>
                    {isUploading ? '...' : '+'}
                </Text>
            </TouchableOpacity>
            <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#bdc3c7"
                value={newMessage}
                onChangeText={setNewMessage}
                onSubmitEditing={sendMessage}
                multiline
            />
            <TouchableOpacity 
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]} 
                onPress={sendMessage}
                disabled={!newMessage.trim()}
            >
                <Text style={[styles.sendButtonText, !newMessage.trim() && styles.sendButtonTextDisabled]}>
                    Send
                </Text>
            </TouchableOpacity>
        </View>

        {/* Image Modal */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
                setModalVisible(false);
                setSelectedImage(null);
            }}
        >
            <View style={styles.modalContainer}>
                <TouchableOpacity 
                    style={styles.modalBackdrop}
                    onPress={() => {
                        setModalVisible(false);
                        setSelectedImage(null);
                    }}
                >
                    <ScrollView
                        style={styles.modalScrollView}
                        maximumZoomScale={3}
                        minimumZoomScale={1}
                        centerContent={true}
                        contentContainerStyle={styles.modalScrollContent}
                    >
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                        )}
                    </ScrollView>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => {
                        setModalVisible(false);
                        setSelectedImage(null);
                    }}
                >
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    </KeyboardAvoidingView>
    );
};

export default SeeMessages

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
        paddingHorizontal: Platform.OS === 'ios' ? 30 : 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
        backgroundColor: '#ffffff',
    },
    leftButtonContainer: {
        alignItems: 'flex-start',
    },
    backButton: {
        paddingVertical: 8,
    },
    spacer: {
        flex: 1,
    },
    rightTitleContainer: {
        alignItems: 'flex-end',
        paddingRight: Platform.OS === 'ios' ? 0 : 10,
    },
    headerButton: {
        minWidth: Platform.OS === 'ios' ? 60 : 50,
        maxWidth: Platform.OS === 'ios' ? 80 : 60,
        alignItems: Platform.OS === 'ios' ? 'flex-start' : 'center',
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
        paddingRight: 10,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
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
    messagesList: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    messagesContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 30,
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 12,
        maxWidth: '75%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    sentMessage: {
        backgroundColor: '#2c3e50',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    receivedMessage: {
        backgroundColor: '#ffffff',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#ecf0f1',
    },
    senderName: {
        fontSize: 11,
        marginBottom: 4,
        fontWeight: '300',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    messageText: {
        fontSize: 16,
        fontWeight: '300',
        letterSpacing: 0.3,
        lineHeight: 22,
        color: '#ffffff',
    },
    attachmentContainer: {
        marginTop: 8,
    },
    imageAttachment: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginTop: 8,
    },
    videoAttachment: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
    },
    mediaButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2c3e50',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginBottom: 2,
    },
    mediaButtonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    mediaButtonText: {
        fontSize: 20,
        fontWeight: '300',
        color: '#ffffff',
        lineHeight: 20,
    },
    mediaButtonTextDisabled: {
        color: '#ecf0f1',
    },
    input: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '300',
        color: '#2c3e50',
        letterSpacing: 0.3,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#ecf0f1',
    },
    sendButton: {
        backgroundColor: '#2c3e50',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginLeft: 12,
        marginBottom: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#ecf0f1',
    },
    sendButtonText: {
        color: '#ffffff',
        fontWeight: '300',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    sendButtonTextDisabled: {
        color: '#bdc3c7',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScrollView: {
        flex: 1,
        width: '100%',
    },
    modalScrollContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
        borderRadius: 8,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 30,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '300',
    },
    sentSenderName: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    receivedSenderName: {
        color: '#7f8c8d',
    },
    sentMessageText: {
        color: '#ffffff',
    },
    receivedMessageText: {
        color: '#2c3e50',
    },
});