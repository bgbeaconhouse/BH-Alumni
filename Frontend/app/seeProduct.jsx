import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert } from 'react-native'
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

      const response = await fetch('http://192.168.0.34:3000/api/cart', {
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
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      
      {productImages.length > 0 ? (
        <Image 
          source={{ uri: `http://192.168.0.34:3000${productImages[0].url}` }} 
          style={styles.productImage}
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text>No Image</Text>
        </View>
      )}
      
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{name}</Text>
        <Text style={styles.productDescription}>{description}</Text>
        <Text style={styles.productPrice}>${price}</Text>
        
        <TouchableOpacity 
          style={[styles.addToCartButton, loading && styles.disabledButton]} 
          onPress={addToCart}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Adding...' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

export default SeeProduct

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    lineHeight: 24,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 30,
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})