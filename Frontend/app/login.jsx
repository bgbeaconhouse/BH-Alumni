import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://192.168.0.34:3000/api/login', { // Use your actual API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = "Login Failed";
        if (response.headers.get('content-type')?.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } else {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // ----------------------------------------------------------------------
      // Enhanced Debugging of the Response
      // ----------------------------------------------------------------------
      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.error("Error parsing JSON:", error);
        const text = await response.text();
        console.error("Raw response text:", text);
        Alert.alert(
          "Login Error",
          "Error parsing server response. Please check the server logs."
        );
        setLoading(false);
        return;
      }

      console.log("Full server response:", result); // Log the entire response
      const tokenToStore = result.token; // Attempt to get the token

      if (tokenToStore) {
        await AsyncStorage.setItem('authToken', tokenToStore);
        console.log('Token stored successfully:', tokenToStore);
      } else {
        console.warn('Received undefined token from server:', result);
        Alert.alert(
          'Login Warning',
          'Login was successful, but no token was received. Please check your backend API.',
          [
            {
              text: 'OK',
              onPress: () => {
                //  router.push('/home');
              },
            },
          ]
        );
        setLoading(false);
        return;
      }
      // ----------------------------------------------------------------------

      Alert.alert('Login Successful', result.message || 'Login successful!', [
        {
          text: 'OK',
          onPress: () => {
            router.push('/home');
          },
        },
      ]);

      setFormData({ username: '', password: '' });

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.loginText}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={formData.username}
          onChangeText={(text) => handleChange('username', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={formData.password}
          onChangeText={(text) => handleChange('password', text)}
        />

        <TouchableOpacity style={styles.loginButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.loginButtonText}>
            {loading ? 'Logging In...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton}>
          <Link href="/" style={styles.backLink}>
            Back
          </Link>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loginText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  backLink: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
