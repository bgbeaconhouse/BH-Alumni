import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'

const Checkout = () => {
 const [cartData, setCartData] = useState(null);
 const [loading, setLoading] = useState(true);
 const [orderLoading, setOrderLoading] = useState(false);
 const [address, setAddress] = useState({
   street: '',
   city: '',
   state: '',
   zipCode: '',
   country: 'United States'
 });
 const router = useRouter();

 const fetchCart = async () => {
   try {
     const token = await SecureStore.getItemAsync('authToken');
     
     if (!token) {
       Alert.alert('Error', 'Please log in to checkout');
       router.push('/login');
       return;
     }

     const response = await fetch('http://192.168.0.34:3000/api/cart', {
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
   const response = await fetch('http://192.168.0.34:3000/api/shipping-addresses', {
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

 const createOrder = async (shippingAddressId, token) => {
   const response = await fetch('http://192.168.0.34:3000/api/orders', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({ shippingAddressId })
   });

   const data = await response.json();
   
   if (!response.ok) {
     throw new Error(data.error || 'Failed to create order');
   }
   
   return data;
 };

 const handlePlaceOrder = async () => {
   if (!validateAddress()) return;

   try {
     setOrderLoading(true);
     
     const token = await SecureStore.getItemAsync('authToken');
     
     // Step 1: Create shipping address
     const shippingAddress = await createShippingAddress(token);
     
     // Step 2: Create order with shipping address
     const orderData = await createOrder(shippingAddress.id, token);
     
     Alert.alert(
       'Order Placed!', 
       `Order #${orderData.order.id} has been created successfully!`,
       [
         { 
           text: 'View Order', 
           onPress: () => router.push(`/order/${orderData.order.id}`) 
         },
         { 
           text: 'Continue Shopping', 
           onPress: () => router.push('/shop') 
         }
       ]
     );

   } catch (error) {
     console.error('Error placing order:', error);
     Alert.alert('Error', error.message || 'Failed to place order');
   } finally {
     setOrderLoading(false);
   }
 };

 if (loading) {
   return (
     <View style={styles.container}>
       <View style={styles.loadingContainer}>
         <ActivityIndicator size="large" color="#007AFF" />
         <Text>Loading checkout...</Text>
       </View>
     </View>
   );
 }

 return (
   <ScrollView style={styles.container}>
     <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
       <Text style={styles.backText}>← Back to Cart</Text>
     </TouchableOpacity>
     
     <Text style={styles.title}>Checkout</Text>
     
     {/* Order Summary */}
     <View style={styles.section}>
       <Text style={styles.sectionTitle}>Order Summary</Text>
       {cartData?.items.map((item, index) => (
         <View key={index} style={styles.orderItem}>
           <Text style={styles.itemName}>{item.product.name}</Text>
           <Text style={styles.itemDetails}>
             Qty: {item.quantity} × ${item.product.price} = ${(item.quantity * item.product.price).toFixed(2)}
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
         <Text style={styles.label}>Street Address *</Text>
         <TextInput
           style={styles.input}
           value={address.street}
           onChangeText={(text) => setAddress({...address, street: text})}
           placeholder="123 Main Street"
         />
       </View>

       <View style={styles.row}>
         <View style={styles.halfInput}>
           <Text style={styles.label}>City *</Text>
           <TextInput
             style={styles.input}
             value={address.city}
             onChangeText={(text) => setAddress({...address, city: text})}
             placeholder="New York"
           />
         </View>
         
         <View style={styles.halfInput}>
           <Text style={styles.label}>State *</Text>
           <TextInput
             style={styles.input}
             value={address.state}
             onChangeText={(text) => setAddress({...address, state: text})}
             placeholder="NY"
           />
         </View>
       </View>

       <View style={styles.row}>
         <View style={styles.halfInput}>
           <Text style={styles.label}>ZIP Code *</Text>
           <TextInput
             style={styles.input}
             value={address.zipCode}
             onChangeText={(text) => setAddress({...address, zipCode: text})}
             placeholder="10001"
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
           />
         </View>
       </View>
     </View>

     {/* Place Order Button */}
     <TouchableOpacity 
       style={[styles.placeOrderButton, orderLoading && styles.disabledButton]}
       onPress={handlePlaceOrder}
       disabled={orderLoading}
     >
       <Text style={styles.placeOrderText}>
         {orderLoading ? 'Placing Order...' : `Place Order - $${cartData?.totalAmount}`}
       </Text>
     </TouchableOpacity>
   </ScrollView>
 )
}

export default Checkout

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
 orderItem: {
   paddingVertical: 8,
   borderBottomWidth: 1,
   borderBottomColor: '#e0e0e0',
 },
 itemName: {
   fontSize: 16,
   fontWeight: '500',
   marginBottom: 4,
 },
 itemDetails: {
   fontSize: 14,
   color: '#666',
 },
 totalContainer: {
   paddingTop: 12,
   marginTop: 8,
   borderTopWidth: 2,
   borderTopColor: '#007AFF',
 },
 totalText: {
   fontSize: 18,
   fontWeight: 'bold',
   color: '#007AFF',
   textAlign: 'right',
 },
 inputGroup: {
   marginBottom: 16,
 },
 label: {
   fontSize: 14,
   fontWeight: '500',
   marginBottom: 6,
   color: '#333',
 },
 input: {
   borderWidth: 1,
   borderColor: '#ddd',
   borderRadius: 8,
   padding: 12,
   fontSize: 16,
   backgroundColor: '#fff',
 },
 row: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   marginBottom: 16,
 },
 halfInput: {
   flex: 1,
   marginHorizontal: 4,
 },
 placeOrderButton: {
   backgroundColor: '#007AFF',
   margin: 16,
   padding: 16,
   borderRadius: 8,
   alignItems: 'center',
 },
 disabledButton: {
   backgroundColor: '#ccc',
 },
 placeOrderText: {
   color: 'white',
   fontSize: 18,
   fontWeight: 'bold',
 },
})