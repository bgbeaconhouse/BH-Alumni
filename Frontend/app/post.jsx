import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Image, TextInput, Modal, ScrollView, Dimensions, Alert } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video'; // Updated import
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Keep for migration
import { Feather } from '@expo/vector-icons'; // For the play icon

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PostVideo = ({ videoUrl, thumbnailUrl }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Create video player instance
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Handle play/pause events
  useEffect(() => {
    const subscription = player.addListener('playingChange', (isPlaying) => {
      setIsPlaying(isPlaying);
    });

    return () => {
      subscription?.remove();
    };
  }, [player]);

  const openModal = () => {
    setModalVisible(true);
    player.play();
  };

  const closeModal = () => {
    setModalVisible(false);
    player.pause();
    // Remove the seekTo call since it's not available
    // player.seekTo(0); // This line causes the error
  };

  return (
    <View>
      <TouchableOpacity onPress={openModal} style={styles.videoPlaceholder}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.noThumbnailPlaceholder} />
        )}
        <View style={styles.playIconContainer}>
          <Feather name="play-circle" size={48} color="white" />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <VideoView
            style={styles.modalVideo}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
          />
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const Post = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [likes, setLikes] = useState({});
  const [userLikedPosts, setUserLikedPosts] = useState({});
  const [newCommentText, setNewCommentText] = useState({}); // Track text for new comments
  const [isSubmittingComment, setIsSubmittingComment] = useState({}); // Track if comment is being submitted
  const [currentUserId, setCurrentUserId] = useState(null); // State to hold current user's ID
  const [isDeletingComment, setIsDeletingComment] = useState({}); // Track if a comment is being deleted
  const [isDeletingPost, setIsDeletingPost] = useState({}); // Track if a post is being deleted
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState([]);

  // Migration function to move tokens from AsyncStorage to SecureStore
  const migrateFromAsyncStorage = async () => {
    try {
      // Check if token exists in AsyncStorage
      const existingToken = await AsyncStorage.getItem('authToken');
      
      if (existingToken) {
        // Move to SecureStore
        await SecureStore.setItemAsync('authToken', existingToken);
        
        // Remove from AsyncStorage
        await AsyncStorage.removeItem('authToken');
        
        console.log('Token migrated to SecureStore successfully');
      }
    } catch (error) {
      console.error('Error migrating token:', error);
    }
  };

  const getToken = async () => {
    try {
      // First, try to get from SecureStore
      let token = await SecureStore.getItemAsync('authToken');
      
      if (!token) {
        // If not found, try migration
        await migrateFromAsyncStorage();
        token = await SecureStore.getItemAsync('authToken');
      }
      
      return token;
    } catch (error) {
      console.error('Error retrieving token from SecureStore:', error);
      return null;
    }
  };

  const setToken = async (token) => {
    try {
      await SecureStore.setItemAsync('authToken', token);
    } catch (error) {
      console.error('Error storing token in SecureStore:', error);
    }
  };

  const removeToken = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
    } catch (error) {
      console.error('Error removing token from SecureStore:', error);
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
      } catch (e) {
        console.error("Error decoding token:", e);
        setCurrentUserId(null);
      }
    } else {
      setCurrentUserId(null);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('http://192.168.0.34:3000/api/posts');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data);
      setError(null);
      const token = await getToken();

      data.forEach(async (post) => {
        try {
          // Fetch comments
          const commentsResponse = await fetch(`http://192.168.0.34:3000/api/posts/${post.id}/comments`);
          if (!commentsResponse.ok) {
            console.error(`Failed to fetch comments for post ${post.id}`);
          } else {
            const commentsData = await commentsResponse.json();
            setComments((prevComments) => ({
              ...prevComments,
              [post.id]: commentsData,
            }));
          }

          // Fetch likes count
          const likesResponse = await fetch(`http://192.168.0.34:3000/api/posts/${post.id}/likes`);
          if (!likesResponse.ok) {
            console.error(`Failed to fetch likes for post ${post.id}`);
          } else {
            const likesData = await likesResponse.json();
            setLikes((prevLikes) => ({
              ...prevLikes,
              [post.id]: likesData.length,
            }));
          }

          // Fetch user's like status
          if (token) {
            const userLikeResponse = await fetch(`http://192.168.0.34:3000/api/posts/${post.id}/userLike`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (userLikeResponse.ok) {
              const userLikeData = await userLikeResponse.json();
              setUserLikedPosts((prevUserLiked) => ({
                ...prevUserLiked,
                [post.id]: userLikeData.liked,
              }));
            } else {
              console.error(`Failed to fetch user like status for post ${post.id}`);
            }
          }
        } catch (err) {
          console.error(`Could not fetch data for post ${post.id}:`, err);
        }
      });
    } catch (e) {
      setError(e);
      console.error("Could not fetch posts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    getUserId();
  }, [fetchPosts, getUserId]);

  const handleLike = async (postId) => {
    const token = await getToken();
    if (!token) {
      console.warn("User not authenticated, cannot like.");
      return;
    }

    try {
      const response = await fetch(`http://192.168.0.34:3000/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLikes((prevLikes) => ({
          ...prevLikes,
          [postId]: data.likes.length,
        }));
        setUserLikedPosts((prevLiked) => ({
          ...prevLiked,
          [postId]: data.liked,
        }));
      } else {
        console.error("Failed to like/unlike post");
        const errorData = await response.json();
        console.error(errorData);
      }
    } catch (error) {
      console.error("Error liking/unliking post:", error);
    }
  };

  const handlePostComment = async (postId) => {
    const token = await getToken();
    if (!token) {
      console.warn("User not authenticated, cannot comment.");
      return;
    }

    const commentContent = newCommentText[postId];
    if (!commentContent || commentContent.trim() === '') {
      alert('Comment cannot be empty.');
      return;
    }

    setIsSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    try {
      const response = await fetch(`http://192.168.0.34:3000/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentContent }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments((prevComments) => ({
          ...prevComments,
          [postId]: [newComment, ...(prevComments[postId] || [])],
        }));
        setNewCommentText((prevText) => ({ ...prevText, [postId]: '' })); // Clear input
      } else {
        console.error("Failed to post comment");
        const errorData = await response.json();
        console.error(errorData);
        alert('Failed to post comment.');
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      alert('Error posting comment.');
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getToken();
            if (!token) {
              console.warn("User not authenticated, cannot delete comment.");
              return;
            }

            setIsDeletingComment((prev) => ({ ...prev, [commentId]: true }));

            try {
              const response = await fetch(`http://192.168.0.34:3000/api/posts/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                // Update the comments state to remove the deleted comment
                setComments((prevComments) => {
                  const updatedComments = { ...prevComments };
                  if (updatedComments[postId]) {
                    updatedComments[postId] = updatedComments[postId].filter((comment) => comment.id !== commentId);
                  }
                  return updatedComments;
                });
              } else {
                console.error("Failed to delete comment");
                const errorData = await response.json();
                console.error(errorData);
                alert('Failed to delete comment.');
              }
            } catch (error) {
              console.error("Error deleting comment:", error);
              alert('Error deleting comment.');
            } finally {
              setIsDeletingComment((prev) => ({ ...prev, [commentId]: false }));
            }
          },
        },
      ]
    );
  };

  const handleDeletePost = async (postId) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getToken();
            if (!token) {
              console.warn("User not authenticated, cannot delete post.");
              return;
            }

            setIsDeletingPost((prev) => ({ ...prev, [postId]: true }));

            try {
              const response = await fetch(`http://192.168.0.34:3000/api/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                // Update the posts state to remove the deleted post
                setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
                // Optionally, you might want to refetch all posts to ensure consistency
                // fetchPosts();
              } else {
                console.error("Failed to delete post");
                const errorData = await response.json();
                console.error(errorData);
                alert('Failed to delete post.');
              }
            } catch (error) {
              console.error("Error deleting post:", error);
              alert('Error deleting post.');
            } finally {
              setIsDeletingPost((prev) => ({ ...prev, [postId]: false }));
            }
          },
        },
      ]
    );
  };

  const openImageModal = (images) => {
    setModalImages(images.map(img => ({ uri: `http://192.168.0.34:3000/uploads/${img.url}` })));
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setModalImages([]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading posts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>Error loading posts: {error.message}</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const imageAttachments = item.imageAttachments || [];
    const videoAttachments = item.videoAttachments || [];
    const postComments = comments[item.id] || [];
    const isCommentsVisible = showComments[item.id];
    const likeCount = likes[item.id] || 0;
    const isLikedByUser = userLikedPosts[item.id] || false;
    const commentInputText = newCommentText[item.id] || '';
    const submitting = isSubmittingComment[item.id] || false;
    const deletingPost = isDeletingPost[item.id] || false;
    const isOwnPost = currentUserId === item.authorId;

    return (
      <View style={styles.postItem}>
        <View style={styles.postHeader}>
          <Text style={styles.authorName}>
            {item.author ? `${item.author.firstName} ${item.author.lastName || ''}` : 'Unknown Author'}
          </Text>
          {isOwnPost && (
            <TouchableOpacity
              onPress={() => handleDeletePost(item.id)}
              style={styles.deletePostButton}
              disabled={deletingPost}
            >
              {deletingPost ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteIcon}>-</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        {item.content && <Text style={styles.postContent}>{item.content}</Text>}
        {imageAttachments.length > 0 && (
          <TouchableOpacity onPress={() => openImageModal(imageAttachments)}>
            <Image
              source={{ uri: `http://192.168.0.34:3000/uploads/${imageAttachments[0].url}` }}
              style={styles.postImage}
              resizeMode="cover"
            />
            {imageAttachments.length > 1 && (
              <View style={styles.multipleImagesOverlay}>
                <Text style={styles.multipleImagesText}>{`+${imageAttachments.length - 1}`}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {videoAttachments.length > 0 && (
          <PostVideo
            videoUrl={`http://192.168.0.34:3000/uploads/${videoAttachments[0].url}`}
            thumbnailUrl={videoAttachments[0].thumbnailUrl ? `http://192.168.0.34:3000/uploads/${videoAttachments[0].thumbnailUrl}` : null}
          />
        )}
        <View style={styles.interactions}>
          <TouchableOpacity
            style={[styles.likeButton, isLikedByUser && styles.likedButton]}
            onPress={() => handleLike(item.id)}
          >
            <Text style={[styles.likeButtonText, isLikedByUser && styles.likedButtonText]}>
              ❤️ {likeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.commentsButton}
            onPress={() =>
              setShowComments((prevShowComments) => ({
                ...prevShowComments,
                [item.id]: !prevShowComments[item.id],
              }))
            }
            activeOpacity={1}
          >
            <Text style={styles.commentsButtonText}>
              💬 {postComments.length}
            </Text>
          </TouchableOpacity>
        </View>

        {isCommentsVisible && (
          <View style={styles.commentsSection}>
            {postComments.length > 0 ? (
              postComments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>
                    {comment.user ? `${comment.user.firstName} ${comment.user.lastName || ''}:` : 'Unknown User:'}</Text>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  {comment.userId === currentUserId && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(item.id, comment.id)}
                      style={styles.deleteButton}
                      disabled={isDeletingComment[comment.id]}
                    >
                      <Text style={styles.deleteButtonText}>
                        {isDeletingComment[comment.id] ? 'Deleting...' : '-'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text>No comments yet.</Text>
            )}

            {/* Add new comment input */}
            <View style={styles.newCommentContainer}>
              <TextInput
                style={styles.newCommentInput}
                placeholder="Add a comment..."
                value={commentInputText}
                onChangeText={(text) =>
                  setNewCommentText((prevText) => ({ ...prevText, [item.id]: text }))
                }
              />
              <TouchableOpacity
                style={styles.postCommentButton}
                onPress={() => handlePostComment(item.id)}
                disabled={submitting}
              >
                <Text style={styles.postCommentButtonText}>
                  {submitting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const onRefresh = () => {
    fetchPosts();
    getUserId();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerButton}>
          <Link href="/home" asChild>
            <Text style={styles.headerButtonText}>Home</Text>
          </Link>
        </TouchableOpacity>
        <Text style={styles.header}>Posts</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/support')}>
          <Text style={styles.headerButtonText}>Support</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={() => (
          <View style={styles.guidelinesContainer}>
            <Text style={styles.guidelinesHeader}>Welcome to the Alumni App Posts Section!</Text>
            <Text style={styles.guidelinesText}>Guidelines:</Text>
            <Text style={styles.guidelineItem}>1. You must be a Beacon House Alumni.</Text>
            <Text style={styles.guidelineItem}>2. There are NO rules as to speech: speak freely as you wish. Exceptions being anything illegal or harmful to others.</Text>
            <Text style={styles.guidelineItem}>3. Contact <Text style={styles.emailLink}>bgbeaconhouse@gmail.com</Text> for any direct concerns or inquiries.</Text>
          </View>
        )}
        ListFooterComponentStyle={{ marginBottom: 12 }}
      />
      <TouchableOpacity style={styles.createPostButton} onPress={() => router.push('/createPosts')}>
        <Text style={styles.createPostButtonText}>Create Post</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.modalScrollView}
            horizontal
            pagingEnabled
          >
            {modalImages.map((image, index) => (
              <View key={index} style={styles.modalPage}>
            <Image
    source={{ 
        uri: image.uri,
        cache: 'reload' // Force fresh load
    }}
    style={styles.modalImage}
    resizeMode="contain"
    // Reduce memory usage
    resizeMethod="resize" // Android specific
    fadeDuration={0}
/>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerButton: {
    padding: 10,
  },
  headerButtonText: {
    color: 'blue',
    fontWeight: 'bold',
  },
  postItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 4,
    flexShrink: 1,
  },
  postContent: {
    fontSize: 16,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginTop: 8,
  },
  videoPlaceholder: {
    backgroundColor: '#f0f0f0',
    height: 200,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  noThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent background for better icon visibility
  },
  commentsButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginTop: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsButtonText: {
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  commentsSection: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  commentItem: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    flexShrink: 1,
  },
  commentContent: {
    fontSize: 14,
    flexShrink: 1,
  },
  interactions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  likeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 7,
  },
  likeButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  likedButton: {
    backgroundColor: '#e91e63',
  },
  likedButtonText: {
    color: 'white',
  },
  newCommentContainer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  newCommentInput: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginRight: 8,
  },
  postCommentButton: {
    backgroundColor: 'green',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  postCommentButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff6347', // Red background
    // paddingVertical: 1,       // Adjust vertical padding as needed
    paddingHorizontal: 10,      // Adjust horizontal padding as needed
    borderRadius: 5,          // Optional: Add some rounding
  },
  deleteButtonText: {
    color: 'white',           // White dash
    fontSize: 24,
    fontWeight: 'bold',
  },
  guidelinesContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  guidelinesHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  guidelinesText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  guidelineItem: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 2,
  },
  emailLink: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  createPostButton: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
    marginTop: 16,
    alignSelf: 'center',
  },
  createPostButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  multipleImagesOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  multipleImagesText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalVideo: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.6,
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
  modalScrollView: {
    width: '100%',
    height: '80%',
  },
  modalPage: {
    width: screenWidth, // Each page takes the full screen width
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
   
  },
  deletePostButton: {
    backgroundColor: '#d9534f',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Post;