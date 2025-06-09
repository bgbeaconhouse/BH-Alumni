import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native'
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
      const response = await fetch(`https://bh-alumni-social-media-app.onrender.com/api/products?page=${pageNum}&limit=10`);
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
      <View style={styles.imageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image 
            source={{ uri: `https://bh-alumni-social-media-app.onrender.com${item.images[0].url}` }} 
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={3}>{item.description}</Text>
        <Text style={styles.productPrice}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/home')}>
            <Text style={styles.headerButtonText}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shop</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/cart')}
          >
            <Text style={styles.headerButtonText}>Cart</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c3e50" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  if (products.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/home')}>
            <Text style={styles.headerButtonText}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shop</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/cart')}
          >
            <Text style={styles.headerButtonText}>Cart</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <Text style={styles.logo}>BH</Text>
            <Text style={styles.emptyTitle}>No Products Available</Text>
            <Text style={styles.emptySubtitle}>Check back soon for new items</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => fetchProducts()}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
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
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/home')}>
          <Text style={styles.headerButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.headerButtonText}>Cart</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => 
          loading && products.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#2c3e50" />
            </View>
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
  refreshButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  refreshButtonText: {
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
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  productCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
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
  },
  placeholderText: {
    fontSize: 12,
    color: '#bdc3c7',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 8,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  productDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '300',
    marginBottom: 12,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '300',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
  },
})