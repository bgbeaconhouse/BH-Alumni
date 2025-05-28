import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SeeMessages = () => {
    const { conversationId } = useLocalSearchParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const flatListRef = useRef(null);
    const router = useRouter();
    const [currentUserId, setCurrentUserId] = useState(null);
    const websocket = useRef(null); // Ref to hold the WebSocket instance

    const getToken = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            return token;
        } catch (e) {
            console.error("Failed to load token from storage", e);
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
                return payload.id; // Return the user ID
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

            const response = await fetch(`http://192.168.0.34:3000/api/conversations/${conversationId}/messages?sort=createdAt`, {
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
            if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
                const messagePayload = {
                    conversationId: parseInt(conversationId),
                    content: newMessage.trim(),
                };
                websocket.current.send(JSON.stringify(messagePayload));
                setNewMessage('');
                // Messages sent via WebSocket will be handled by the 'message' listener
            } else {
                Alert.alert("Error", "WebSocket is not connected. Please try again.");
            }
        }
    };

    useEffect(() => {
        let isMounted = true;

        const connectWebSocket = async () => {
            const token = await getToken();
            const userId = await getUserId();
            if (token && userId) {
                try {
                    websocket.current = new WebSocket(`ws://192.168.0.34:3000/?token=${token}`);

                    websocket.current.onopen = () => {
                        console.log("WebSocket connected");
                    };

                    websocket.current.onmessage = (event) => {
                        try {
                            const parsedMessage = JSON.parse(event.data);
                            if (parsedMessage.type === 'newMessage' && parsedMessage.message.conversationId === parseInt(conversationId)) {
                                if (isMounted) {
                                    setMessages(prevMessages => [...prevMessages, parsedMessage.message]);
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing WebSocket message:", e);
                        }
                    };

                    websocket.current.onclose = () => {
                        console.log("WebSocket disconnected");
                        // Optionally attempt to reconnect after a delay
                        setTimeout(connectWebSocket, 3000);
                    };

                    websocket.current.onerror = (error) => {
                        console.error("WebSocket error:", error);
                    };
                } catch (error) {
                    console.error("Error connecting to WebSocket:", error);
                }
            }
        };

        getUserId().then(() => {
            if (conversationId) {
                fetchMessages();
                connectWebSocket();
            }
        });

        return () => {
            isMounted = false;
            if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
                websocket.current.close();
            }
        };
    }, [getUserId, conversationId]);

    useEffect(() => {
        if (messages.length > 0 && !loading) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
        }
    }, [messages, loading]);

    const renderMessageItem = ({ item }) => {
        const isCurrentUserSender = item.senderId === currentUserId;

        return (
            <View style={[styles.messageBubble, isCurrentUserSender ? styles.sentMessage : styles.receivedMessage]}>
                <Text style={styles.senderName}>{isCurrentUserSender ? 'You' : item.sender?.firstName}</Text>
                <Text style={styles.messageText}>{item.content}</Text>
                {(item.imageAttachments && item.imageAttachments.length > 0) && (
                    item.imageAttachments.map(attachment => (
                        <Text key={attachment.id} style={styles.attachmentText}>Image: {attachment.url.split('/').pop()}</Text>
                    ))
                )}
                {(item.videoAttachments && item.videoAttachments.length > 0) && (
                    item.videoAttachments.map(attachment => (
                        <Text key={attachment.id} style={styles.attachmentText}>Video: {attachment.url.split('/').pop()}</Text>
                    ))
                )}
            </View>
        );
    };

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
                />
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Send a message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        onSubmitEditing={sendMessage} // Send message on pressing Enter
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>
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
        backgroundColor: '#DCF8C6', // Light green for sent messages
        alignSelf: 'flex-end',
    },
    receivedMessage: {
        backgroundColor: '#FFFFFF', // White for received messages
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
});

export default SeeMessages;