import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, StatusBar, KeyboardAvoidingView } from 'react-native'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { StripeProvider, useStripe } from '@stripe/stripe-react-native'

// Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RWLpqPwg6x6MnkqjagsC7IWiIL7UxZU3Xw5eEAZxIPggb2qLKyETdALqxj9xq63bu0b0FuXd03SZfuRPu3pj5sZ00WmEL7KPZ';

// Inner component that uses Stripe hooks
const CheckoutContent = () => {
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // All your existing functions (fetchCart, validateAddress, createShippingAddress, etc.)
  const fetchCart = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to checkout');
        router.push('/login');
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
        if (!data.items || data.items.length === 0) {
          Alert.alert('Empty Cart', 'Your cart is empty');
          router.push('/shop');
          return;
        }
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

  const validateAddress = () => {
    if (!address.street.trim()) {
      Alert.alert('Validation Error', 'Street address is required');
      return false;
    }
    if (!address.city.trim()) {
      Alert.alert('Validation Error', 'City is required');
      return false;
    }
    if (!address.state.trim()) {
      Alert.alert('Validation Error', 'State is required');
      return false;
    }
    if (!address.zipCode.trim()) {
      Alert.alert('Validation Error', 'ZIP code is required');
      return false;
    }
    return true;
  };

  const createShippingAddress = async (token) => {
    const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/shipping-addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(address)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create shipping address');
    }
    
    return data;
  };

  const initializePaymentSheet = async (shippingAddressId) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      
      const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/orders/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shippingAddressId })
      });

      const { clientSecret, totalAmount, paymentIntentId } = await response.json();

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Your Store Name',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: `${address.street}, ${address.city}, ${address.state}`,
          address: {
            city: address.city,
            country: address.country,
            line1: address.street,
            postalCode: address.zipCode,
            state: address.state,
          }
        },
        allowsDelayedPaymentMethods: false,
        returnURL: 'alumniapp://stripe-redirect',
      });

      if (error) {
        throw new Error(error.message);
      }

      return { paymentIntentId, totalAmount };

    } catch (error) {
      throw error;
    }
  };

  const handlePayment = async (paymentIntentId, shippingAddressId) => {
    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          return false;
        }
        throw new Error(error.message);
      }

      const token = await SecureStore.getItemAsync('authToken');
      
      const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/orders/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          paymentIntentId,
          shippingAddressId 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      return data.order;

    } catch (error) {
      throw error;
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;

    try {
      setOrderLoading(true);
      
      const token = await SecureStore.getItemAsync('authToken');
      const shippingAddress = await createShippingAddress(token);
      
      setPaymentLoading(true);
      const { paymentIntentId } = await initializePaymentSheet(shippingAddress.id);
      setPaymentLoading(false);
      
      const order = await handlePayment(paymentIntentId, shippingAddress.id);
      
      if (order) {
        Alert.alert(
          'Payment Successful!', 
          `Order #${order.id} has been created successfully!`,
          [
            { 
              text: 'View Order', 
              onPress: () => router.push(`/orderDetails?id=${order.id}`)
            },
            { 
              text: 'Continue Shopping', 
              onPress: () => router.push('/shop') 
            }
          ]
        );
      }

    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setOrderLoading(false);
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>← Cart</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c3e50" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>← Cart</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {cartData?.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>${(item.quantity * item.product.price).toFixed(2)}</Text>
              </View>
              <Text style={styles.itemDetails}>
                {item.quantity} × ${item.product.price}
              </Text>
            </View>
          ))}
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Total: ${cartData?.totalAmount}</Text>
          </View>
        </View>

        {/* Shipping Address Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={address.street}
              onChangeText={(text) => setAddress({...address, street: text})}
              placeholder="123 Main Street"
              placeholderTextColor="#bdc3c7"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={address.city}
                onChangeText={(text) => setAddress({...address, city: text})}
                placeholder="New York"
                placeholderTextColor="#bdc3c7"
              />
            </View>
            
            <View style={styles.halfInput}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={address.state}
                onChangeText={(text) => setAddress({...address, state: text})}
                placeholder="NY"
                placeholderTextColor="#bdc3c7"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={address.zipCode}
                onChangeText={(text) => setAddress({...address, zipCode: text})}
                placeholder="10001"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.halfInput}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={address.country}
                onChangeText={(text) => setAddress({...address, country: text})}
                placeholder="United States"
                placeholderTextColor="#bdc3c7"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Payment */}
      <View style={styles.bottomContainer}>
        {paymentLoading && (
          <View style={styles.paymentLoadingContainer}>
            <ActivityIndicator size="small" color="#2c3e50" />
            <Text style={styles.paymentLoadingText}>Setting up secure payment...</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.placeOrderButton, (orderLoading || paymentLoading) && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={orderLoading || paymentLoading}
        >
          <Text style={[styles.placeOrderText, (orderLoading || paymentLoading) && styles.disabledButtonText]}>
            {paymentLoading ? 'Preparing Payment...' : 
             orderLoading ? 'Processing...' : 
             `Pay ${cartData?.totalAmount}`}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// Main component with StripeProvider wrapper
const Checkout = () => {
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      urlScheme="alumniapp"
    >
      <CheckoutContent />
    </StripeProvider>
  );
};

export default Checkout;

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding to ensure content is accessible above keyboard
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
  orderItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 16,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.3,
  },
  itemDetails: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  totalContainer: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  totalText: {
    fontSize: 20,
    fontWeight: '300',
    color: '#2c3e50',
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '300',
    marginBottom: 8,
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '300',
    backgroundColor: '#ffffff',
    color: '#2c3e50',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 6,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    backgroundColor: '#ffffff',
  },
  paymentLoadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
  },
  paymentLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  placeOrderButton: {
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
  placeOrderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  disabledButtonText: {
    color: '#bdc3c7',
  },
});