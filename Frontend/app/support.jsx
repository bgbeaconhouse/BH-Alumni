import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { Link, useRouter } from 'expo-router';
import React from 'react'

const Support = () => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton}>
        <Link href="/post" asChild>
          <Text style={styles.backButtonText}>Back</Text>
        </Link>
      </TouchableOpacity>
      <Text style={styles.supportText}>
        For any issues on this app, please email:
      </Text>
      <Text style={styles.emailText}>bgbeaconhouse@gmail.com</Text>
    </View>
  )
}

export default Support

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'flex-start',
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
})