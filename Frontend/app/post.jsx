import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Image, TextInput, Modal, ScrollView, Dimensions, Alert, StatusBar } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Optimized Image Component with Progressive Loading
const OptimizedImage = React.memo(({ imageUrl, style, onPress, showMultipleIndicator, count }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const getImageUrl = () => {
    const baseUrl = 'https://bh-alumni-social-media-app.onrender.com/uploads/';
    
    // Handle both new format (object) and old format (string)
    if (typeof imageUrl === 'object') {
      // Try optimized version first, fallback to original
      if (imageUrl.optimizedUrl) {
        return `${baseUrl}${imageUrl.optimizedUrl}`;
      }
      return `${baseUrl}${imageUrl.url}`;
    }
    // Old format - direct string
    return `${baseUrl}${imageUrl}`;
  };

  const getThumbnailUrl = () => {
    const baseUrl = 'https://bh-alumni-social-media-app.onrender.com/uploads/';
    
    // Handle both new format (object) and old format (string)
    if (typeof imageUrl === 'object' && imageUrl.thumbnailUrl) {
      return `${baseUrl}${imageUrl.thumbnailUrl}`;
    }
    // Fallback to main image
    return getImageUrl();
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.imageContainer}>
      {/* Loading indicator */}
      {!imageLoaded && (
        <View style={styles.imagePlaceholder}>
          <ActivityIndicator size="small" color="#2c3e50" />
        </View>
      )}
      
      {/* Main image */}
      <Image
        source={{ 
          uri: getImageUrl(),
          cache: 'force-cache'
        }}
        style={[styles.postImage, { opacity: imageLoaded ? 1 : 0 }]}
        resizeMode="contain"
        onLoad={() => setImageLoaded(true)}
        onError={(error) => {
          console.log('Image load error:', error);
          setImageLoaded(true); // Show even if error to prevent infinite loading
        }}
        fadeDuration={300}
      />
      
      {/* Multiple images indicator */}
      {showMultipleIndicator && count > 1 && (
        <View style={styles.multipleImagesOverlay}>
          <Text style={styles.multipleImagesText}>{`+${count - 1}`}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const PostVideo = React.memo(({ videoUrl, thumbnailUrl }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    player.muted = false;
  });

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
          <Text style={styles.playIcon}>▶</Text>
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
});

const Post = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [likes, setLikes] = useState({});
  const [userLikedPosts, setUserLikedPosts] = useState({});
  const [newCommentText, setNewCommentText] = useState({});
  const [isSubmittingComment, setIsSubmittingComment] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isDeletingComment, setIsDeletingComment] = useState({});
  const [isDeletingPost, setIsDeletingPost] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const router = useRouter();

  // Migration function to move tokens from AsyncStorage to SecureStore
  const migrateFromAsyncStorage = async () => {
    try {
      const existingToken = await AsyncStorage.getItem('authToken');
      
      if (existingToken) {
        await SecureStore.setItemAsync('authToken', existingToken);
        await AsyncStorage.removeItem('authToken');
        console.log('Token migrated to SecureStore successfully');
      }
    } catch (error) {
      console.error('Error migrating token:', error);
    }
  };

  const getToken = async () => {
    try {
      let token = await SecureStore.getItemAsync('authToken');
      
      if (!token) {
        await migrateFromAsyncStorage();
        token = await SecureStore.getItemAsync('authToken');
      }
      
      return token;
    } catch (error) {
      console.error('Error retrieving token from SecureStore:', error);
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
      } catch (e) {
        console.error("Error decoding token:", e);
        setCurrentUserId(null);
      }
    } else {
      setCurrentUserId(null);
    }
  }, []);

  const fetchPosts = useCallback(async (page = 1, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setCurrentPage(1);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/posts?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const newPosts = data.posts || data; // Handle both new and old API responses
      
      if (isRefresh) {
        setPosts(newPosts);
      } else {
        setPosts(prevPosts => [...prevPosts, ...newPosts]);
      }
      
      // Handle pagination info
      if (data.pagination) {
        setHasMore(data.pagination.hasMore);
      } else {
        setHasMore(newPosts.length === 10); // Fallback logic
      }
      
      setError(null);
      const token = await getToken();

      // Process additional data for each post
      newPosts.forEach(async (post) => {
        try {
          // Set initial likes count from included data
          if (post.likes) {
            setLikes((prevLikes) => ({
              ...prevLikes,
              [post.id]: post.likes.length,
            }));
          }

          // Set initial comments from included data
          if (post.comments) {
            setComments((prevComments) => ({
              ...prevComments,
              [post.id]: post.comments,
            }));
          }

          // Fetch user's like status
          if (token) {
            const userLikeResponse = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/posts/${post.id}/userLike`, {
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
      setLoadingMore(false);
    }
  }, []);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPosts(nextPage, false);
    }
  }, [currentPage, hasMore, loadingMore, fetchPosts]);

  useEffect(() => {
    fetchPosts(1, true);
    getUserId();
  }, [getUserId]);

  const handleLike = async (postId) => {
    const token = await getToken();
    if (!token) {
      console.warn("User not authenticated, cannot like.");
      return;
    }

    try {
      const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/posts/${postId}/like`, {
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
      const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/posts/${postId}/comments`, {
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
        setNewCommentText((prevText) => ({ ...prevText, [postId]: '' }));
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
              const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/posts/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
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
              const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
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
    const modalImageUrls = images.map(img => {
      const baseUrl = 'https://bh-alumni-social-media-app.onrender.com/uploads/';
      // Handle both new format (object) and old format (string)
      let imageUrl;
      if (typeof img === 'object') {
        imageUrl = img.optimizedUrl ? `${baseUrl}${img.optimizedUrl}` : `${baseUrl}${img.url}`;
      } else {
        imageUrl = `${baseUrl}${img}`;
      }
      return { uri: imageUrl };
    });
    setModalImages(modalImageUrls);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setModalImages([]);
  };

  // Memoized render item for better performance
  const renderItem = useCallback(({ item, index }) => {
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
                <ActivityIndicator size="small" color="#7f8c8d" />
              ) : (
                <Text style={styles.deleteIcon}>×</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {item.content && <Text style={styles.postContent}>{item.content}</Text>}
        
        {imageAttachments.length > 0 && (
          <OptimizedImage
            imageUrl={imageAttachments[0].url || imageAttachments[0]}
            style={styles.postImage}
            onPress={() => openImageModal(imageAttachments)}
            showMultipleIndicator={true}
            count={imageAttachments.length}
          />
        )}
        
        {videoAttachments.length > 0 && (
          <PostVideo
            videoUrl={`https://bh-alumni-social-media-app.onrender.com/uploads/${videoAttachments[0].url}`}
            thumbnailUrl={videoAttachments[0].thumbnailUrl ? `https://bh-alumni-social-media-app.onrender.com/uploads/${videoAttachments[0].thumbnailUrl}` : null}
          />
        )}
        
        <View style={styles.interactions}>
          <TouchableOpacity
            style={[styles.interactionButton, isLikedByUser && styles.likedButton]}
            onPress={() => handleLike(item.id)}
          >
            <Text style={[styles.interactionText, isLikedByUser && styles.likedText]}>
              ♡ {likeCount}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() =>
              setShowComments((prevShowComments) => ({
                ...prevShowComments,
                [item.id]: !prevShowComments[item.id],
              }))
            }
          >
            <Text style={styles.interactionText}>
              {postComments.length} {postComments.length === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
        </View>

        {isCommentsVisible && (
          <View style={styles.commentsSection}>
            {postComments.length > 0 ? (
              postComments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>
                      {comment.user ? `${comment.user.firstName} ${comment.user.lastName || ''}` : 'Unknown User'}
                    </Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                  {comment.userId === currentUserId && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(item.id, comment.id)}
                      style={styles.deleteCommentButton}
                      disabled={isDeletingComment[comment.id]}
                    >
                      <Text style={styles.deleteCommentText}>
                        {isDeletingComment[comment.id] ? '...' : '×'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noCommentsText}>No comments yet</Text>
            )}

            <View style={styles.newCommentContainer}>
              <TextInput
                style={styles.newCommentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#bdc3c7"
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
                  {submitting ? '...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }, [comments, likes, userLikedPosts, newCommentText, isSubmittingComment, isDeletingPost, isDeletingComment, showComments, currentUserId, handleDeletePost, handleLike, handlePostComment, handleDeleteComment, openImageModal]);

  // Memoized item layout for better performance
  const getItemLayout = useCallback((data, index) => ({
    length: 400, // Estimated item height
    offset: 400 * index,
    index,
  }), []);

  const onRefresh = () => {
    fetchPosts(1, true);
    getUserId();
  };

  // Render footer for loading more
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#2c3e50" />
        <Text style={styles.loadingMoreText}>Loading more posts...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c3e50" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading posts</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchPosts(1, true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Link href="/home" style={styles.headerButtonText}>
            ← Home
          </Link>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts</Text>
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
        updateCellsBatchingPeriod={100}
        getItemLayout={getItemLayout}
        // Infinite scroll
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          <View>
            {renderFooter()}
            <View style={styles.guidelinesContainer}>
              <Text style={styles.guidelinesHeader}>Community Guidelines</Text>
              <Text style={styles.guidelineItem}>• Alumni community space</Text>
              <Text style={styles.guidelineItem}>• Speak freely with respect</Text>
              <Text style={styles.guidelineItem}>• Contact bgbeaconhouse@gmail.com for concerns</Text>
            </View>
          </View>
        )}
      />

      {/* Create Post Button */}
      <TouchableOpacity style={styles.createPostButton} onPress={() => router.push('/createPosts')}>
        <Text style={styles.createPostButtonText}>+ New Post</Text>
      </TouchableOpacity>

      {/* Image Modal */}
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
            showsHorizontalScrollIndicator={false}
          >
            {modalImages.map((image, index) => (
              <View key={index} style={styles.modalPage}>
                <Image
                  source={{ 
                    uri: image.uri,
                    cache: 'force-cache'
                  }}
                  style={styles.modalImage}
                  resizeMode="contain"
                  resizeMethod="resize"
                  fadeDuration={200}
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

export default Post;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '300',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
  },
  postItem: {
    backgroundColor: '#ffffff',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 20,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorName: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  deletePostButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    color: '#bdc3c7',
    fontSize: 20,
    fontWeight: '300',
  },
  postContent: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
    marginBottom: 16,
    fontWeight: '300',
  },
  // Optimized image styles
  imageContainer: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  
  },
  thumbnailImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    zIndex: 2,
  },
  videoPlaceholder: {
    backgroundColor: '#f8f9fa',
    height: 240,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
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
    backgroundColor: '#ecf0f1',
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
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
  },
  multipleImagesOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 3,
  },
  multipleImagesText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '300',
  },
  interactions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  interactionButton: {
    marginRight: 24,
  },
  interactionText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  likedButton: {
    // Keep same styling, just different text color
  },
  likedText: {
    color: '#e74c3c',
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
  },
  commentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '300',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '300',
    lineHeight: 20,
  },
  deleteCommentButton: {
    marginLeft: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteCommentText: {
    color: '#bdc3c7',
    fontSize: 16,
    fontWeight: '300',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#bdc3c7',
    fontStyle: 'italic',
    marginBottom: 12,
    fontWeight: '300',
  },
  newCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  newCommentInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingVertical: 12,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '300',
    marginRight: 16,
  },
  postCommentButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  postCommentButtonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  guidelinesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  guidelinesHeader: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  guidelineItem: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  createPostButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#2c3e50',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#2c3e50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createPostButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
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
    bottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  modalScrollView: {
    width: '100%',
    height: '80%',
  },
  modalPage: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
});