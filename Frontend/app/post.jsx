import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Image, TextInput } from 'react-native';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const router = useRouter();

  const getToken = async () => {
    return await AsyncStorage.getItem('authToken');
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
    let imageSource = null;
    if (item.imageAttachments && item.imageAttachments.length > 0) {
      imageSource = { uri: `http://192.168.0.34:3000/uploads/${item.imageAttachments[0].url}` };
    }
    const postComments = comments[item.id] || [];
    const isCommentsVisible = showComments[item.id];
    const likeCount = likes[item.id] || 0;
    const isLikedByUser = userLikedPosts[item.id] || false;
    const commentInputText = newCommentText[item.id] || '';
    const submitting = isSubmittingComment[item.id] || false;

    return (
      <View style={styles.postItem}>
        <Text style={styles.authorName}>
          {item.author ? `By: ${item.author.name || item.author.username || 'Unknown'}` : 'Unknown Author'}
        </Text>
        {item.content && <Text style={styles.postContent}>{item.content}</Text>}
        {imageSource && (
          <Image source={imageSource} style={styles.postImage} />
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
                    {comment.user ? `${comment.user.username}:` : 'Unknown User:'}
                  </Text>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  {comment.userId === currentUserId && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(item.id, comment.id)}
                      style={styles.deleteButton}
                      disabled={isDeletingComment[comment.id]}
                    >
                      <Text style={styles.deleteButtonText}>
                        {isDeletingComment[comment.id] ? 'Deleting...' : 'Delete'}
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
    getUserId(); // Refresh user ID as well
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
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/profile')}>
          <Text style={styles.headerButtonText}>My Profile</Text>
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
        ListFooterComponentStyle={{ marginBottom: 12 }} // Add some margin below the guidelines
      />
      <TouchableOpacity style={styles.createPostButton} onPress={() => router.push('/createPosts')}>
        <Text style={styles.createPostButtonText}>Create Post</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Post;

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
  authorName: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 4,
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
    backgroundColor: '#ff6347',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
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
});