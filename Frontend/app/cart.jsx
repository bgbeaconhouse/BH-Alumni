import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'

const Cart = () => {
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchCart = async () => {
    try {
      setLoading(true);
      
      const token = await SecureStore.getItemAsync('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to view cart');
        return;
      }

      const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/cart', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setCartData(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to load cart');
      }

    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      {item.product.images && item.product.images.length > 0 ? (
        <Image 
          source={{ uri: `https://bh-alumni-social-media-app.onrender.com${item.product.images[0].url}` }} 
          style={styles.itemImage}
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text>No Image</Text>
        </View>
      )}
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemDescription}>{item.product.description}</Text>
        <Text style={styles.itemPrice}>${item.product.price}</Text>
        <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
        <Text style={styles.itemTotal}>
          Total: ${(item.quantity * item.product.price).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading cart...</Text>
        </View>
      </View>
    );
  }

  if (!cartData || cartData.items.length === 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.emptyCart}>
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/shop')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>My Cart</Text>
      
      <FlatList
        data={cartData.items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.cartList}
      />
      
      <View style={styles.cartSummary}>
        <Text style={styles.summaryText}>
          Total Items: {cartData.totalItems}
        </Text>
        <Text style={styles.summaryTotal}>
          Total Amount: ${cartData.totalAmount}
        </Text>
        
        <TouchableOpacity 
          style={styles.checkoutButton}
          onPress={() => router.push('/checkout')}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default Cart

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cartSummary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 8,
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})