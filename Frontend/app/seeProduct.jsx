import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, Platform, StatusBar } from 'react-native'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import * as SecureStore from 'expo-secure-store'

const SeeProduct = () => {
  const { id, name, description, price, images } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const productImages = images ? JSON.parse(images) : [];

  const addToCart = async () => {
    try {
      setLoading(true);
      
      // Get the auth token from SecureStore
      const token = await SecureStore.getItemAsync('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to add items to cart');
        return;
      }

      const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: parseInt(id),
          quantity: 1
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success!', 
          'Item added to cart successfully',
          [
            { text: 'Continue Shopping', style: 'cancel' },
            { text: 'View Cart', onPress: () => router.push('/cart') }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to add item to cart');
      }

    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.headerButtonText}>Cart</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {productImages.length > 0 ? (
            <Image 
              source={{ uri: `https://bh-alumni-social-media-app.onrender.com${productImages[0].url}` }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No Image Available</Text>
            </View>
          )}
        </View>
        
        {/* Product Information */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{name}</Text>
          <Text style={styles.productPrice}>${price}</Text>
          <Text style={styles.productDescription}>{description}</Text>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.addToCartButton, loading && styles.disabledButton]} 
          onPress={addToCart}
          disabled={loading}
        >
          <Text style={[styles.buttonText, loading && styles.disabledButtonText]}>
            {loading ? 'Adding to Cart...' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default SeeProduct

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
    backgroundColor: '#ffffff',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  placeholderText: {
    fontSize: 16,
    color: '#bdc3c7',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  productInfo: {
    padding: 30,
  },
  productName: {
    fontSize: 28,
    fontWeight: '100',
    color: '#2c3e50',
    marginBottom: 16,
    letterSpacing: 1,
    lineHeight: 36,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  productDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    backgroundColor: '#ffffff',
  },
  addToCartButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#ecf0f1',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  disabledButtonText: {
    color: '#bdc3c7',
  },
})