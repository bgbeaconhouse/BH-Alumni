import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const OrderDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to view order');
        router.push('/login');
        return;
      }

      const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/orders/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setOrder(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to load order');
      }

    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading order...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Order not found</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Order Details</Text>
      
      {/* Order Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Order ID:</Text>
          <Text style={styles.infoValue}>#{order.id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Order Date:</Text>
          <Text style={styles.infoValue}>
            {new Date(order.orderDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Status:</Text>
          <Text style={[styles.paymentStatus, { color: getPaymentStatusColor(order.paymentStatus) }]}>
            {order.paymentStatus.toUpperCase()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>${order.totalAmount}</Text>
        </View>
      </View>

      {/* Shipping Address */}
      {order.shippingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <Text style={styles.addressText}>
            {order.shippingAddress.street}{'\n'}
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}{'\n'}
            {order.shippingAddress.country}
          </Text>
        </View>
      )}

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.orderItems.map((item, index) => (
          <View key={index} style={styles.orderItem}>
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
              <Text style={styles.itemPrice}>Price: ${item.price}</Text>
              <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
              <Text style={styles.itemTotal}>
                Subtotal: ${(item.quantity * item.price).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/shop')}
        >
          <Text style={styles.actionButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
        
        {order.paymentStatus === 'paid' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => Alert.alert('Download Receipt', 'Receipt download feature coming soon!')}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Download Receipt</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

export default OrderDetails;

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
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addressText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#333',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});