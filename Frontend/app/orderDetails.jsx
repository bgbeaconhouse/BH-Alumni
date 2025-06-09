import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';
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
      case 'paid': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'failed': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c3e50" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <Text style={styles.logo}>BH</Text>
            <Text style={styles.emptyTitle}>Order Not Found</Text>
            <Text style={styles.emptySubtitle}>The order you're looking for doesn't exist</Text>
            <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/shop')}>
              <Text style={styles.shopButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Beacon House • Supporting recovery</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/shop')}
        >
          <Text style={styles.headerButtonText}>Shop</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>#{order.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>
              {new Date(order.orderDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(order.paymentStatus) }]}>
              <Text style={styles.statusText}>
                {getPaymentStatusText(order.paymentStatus)}
              </Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
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
              <View style={styles.imageContainer}>
                {item.product.images && item.product.images.length > 0 ? (
                  <Image 
                    source={{ uri: `https://bh-alumni-social-media-app.onrender.com${item.product.images[0].url}` }} 
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.itemDescription} numberOfLines={2}>{item.product.description}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.itemPrice}>${item.price}</Text>
                  <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                </View>
                <Text style={styles.itemTotal}>
                  ${(item.quantity * item.price).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/shop')}
        >
          <Text style={styles.primaryButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
        
        {order.paymentStatus === 'paid' && (
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Download Receipt', 'Receipt download feature coming soon!')}
          >
            <Text style={styles.secondaryButtonText}>Download Receipt</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default OrderDetails;

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: '100',
    color: '#2c3e50',
    letterSpacing: 8,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  shopButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#bdc3c7',
    fontWeight: '300',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginHorizontal: 30,
    marginTop: 30,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '300',
    marginBottom: 20,
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2c3e50',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  orderItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#bdc3c7',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 4,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  itemDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '300',
    marginBottom: 8,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2c3e50',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});