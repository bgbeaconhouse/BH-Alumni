import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const fetchProducts = async (pageNum = 1) => {
    try {
      const response = await fetch(`http://192.168.0.34:3000/api/products?page=${pageNum}&limit=10`);
      const data = await response.json();
      
      if (pageNum === 1) {
        setProducts(data.products);
      } else {
        setProducts(prev => [...prev, ...data.products]);
      }
      
      setHasMore(data.pagination.hasNextPage);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
      fetchProducts(page + 1);
    }
  };

  const renderProduct = ({ item }) => (
     <TouchableOpacity 
    style={styles.productCard}
    onPress={() => router.push({
      pathname: '/seeProduct',
      params: { 
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        images: JSON.stringify(item.images)
      }
    })}
  >
      {item.images && item.images.length > 0 ? (
       <Image 
   source={{ uri: `http://192.168.0.34:3000${item.images[0].url}` }} 
   style={styles.productImage}
/>
      ) : (
        <View style={styles.placeholderImage}>
          <Text>No Image</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription}>{item.description}</Text>
        <Text style={styles.productPrice}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Link href="/home">Back</Link>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
          >
            <Text style={styles.cartButtonText}>View Cart</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Loading products...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Link href="/home">Back</Link>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.cartButtonText}>View Cart</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.title}>Shop</Text>
      
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => 
          loading && products.length > 0 ? (
            <ActivityIndicator size="small" color="#0000ff" style={styles.footerLoader} />
          ) : null
        }
      />
    </View>
  )
}

export default Shop

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  cartButton: {
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  cartButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productInfo: {
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  footerLoader: {
    marginVertical: 16,
  },
})