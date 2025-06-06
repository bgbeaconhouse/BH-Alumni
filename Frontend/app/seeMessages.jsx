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
            <Text style={styles.senderName}>{isCurrentUserSender ? 'You' : item.sender?.firstName}</Text>
            <Text style={styles.messageText}>{item.content}</Text>
            {(item.imageAttachments && item.imageAttachments.length > 0) && (
                item.imageAttachments.map(attachment => (
                    <TouchableOpacity
                        key={attachment.id}
                        onPress={() => onImagePress(`https://bh-alumni-social-media-app.onrender.com${attachment.url}`)}
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
    // Remove isLooping
    shouldPlay={false} // Don't auto-play
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
                    websocket.current = new WebSocket(`ws://192.168.0.34:3000/?token=${token}`);

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
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Loading messages...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.backButtonStyled} onPress={() => router.push('/messaging')}>
                    <Text style={styles.backButtonTextStyled}>Back</Text>
                </TouchableOpacity>
                {/* You might want to display the conversation name centered here */}
            </View>
            <View style={styles.container}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessageItem}
                    contentContainerStyle={styles.messagesContainer}
                    // Add these props for better performance with large lists
                    initialNumToRender={10} // Render 10 items initially
                    maxToRenderPerBatch={5} // Render 5 items per batch
                    windowSize={21} // Keep 21 items in memory (10 above, 10 below, 1 current)
                    removeClippedSubviews={true} // Unmount components that go off-screen
           
                />
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={pickMedia} style={styles.mediaButton}>
                        <Text style={styles.mediaButtonText}>+</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Send a message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => {
                        setModalVisible(false);
                        setSelectedImage(null);
                    }}
                >
                    <View style={styles.modalContainer}>
                        <ScrollView
                            style={styles.modalScrollView}
                            maximumZoomScale={3}
                            minimumZoomScale={1}
                            centerContent={true}
                        >
                            {selectedImage && (
                                <Image
                                    source={{ uri: selectedImage }}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                            )}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeButton} onPress={() => {
                            setModalVisible(false);
                            setSelectedImage(null);
                        }}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 10,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingRight: 15,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007bff',
        marginLeft: 5,
    },
    backButtonStyled: {
        backgroundColor: '#007bff',
        borderRadius: 5,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonTextStyled: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        backgroundColor: '#e8e8e8',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesContainer: {
        padding: 10,
        paddingBottom: 70,
    },
    messageBubble: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        maxWidth: '80%',
    },
    sentMessage: {
        backgroundColor: '#DCF8C6',
        alignSelf: 'flex-end',
    },
    receivedMessage: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
    },
    senderName: {
        fontSize: 12,
        color: '#555',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
    },
    attachmentText: {
        fontSize: 14,
        color: '#007bff',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    input: {
        flex: 1,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#007bff',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
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
    mediaButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    mediaButtonText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    imageAttachment: {
        width: 200,
        height: 200,
        borderRadius: 5,
        marginTop: 5,
    },
    videoAttachment: {
        width: 200,
        height: 200,
        borderRadius: 5,
        marginTop: 5,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    modalScrollView: {
        flex: 1, // Make ScrollView take available modal space
        width: '100%',
        height: '80%',
    },
    modalImage: {
        width: '100%',
        height: undefined, // Set height to undefined to allow aspect ratio to govern
        aspectRatio: 1, // Maintain aspect ratio
    },
    closeButton: {
        position: 'absolute',
        bottom: 20,
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 5,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
    },
});

export default SeeMessages;