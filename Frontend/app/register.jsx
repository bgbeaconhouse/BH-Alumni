import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router'; // Import the router
import React, { useState } from 'react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    yearGraduated: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Convert yearGraduated to a number before sending
      const dataToSend = {
        ...formData,
        yearGraduated: parseInt(formData.yearGraduated, 10), // Convert to integer
      };

      const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const result = await response.json();
      Alert.alert('Success', result.message, [
        {
          text: 'OK',
          onPress: () => {
            router.push('/'); // Navigate back to the index page
          },
        },
      ]);
      setFormData({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        yearGraduated: '',
      });

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
        <Text style={styles.registerText}>Register</Text>

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
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => handleChange('email', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={formData.firstName}
          onChangeText={(text) => handleChange('firstName', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={formData.lastName}
          onChangeText={(text) => handleChange('lastName', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={formData.phoneNumber}
          onChangeText={(text) => handleChange('phoneNumber', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Year Graduated"
          value={formData.yearGraduated}
          onChangeText={(text) => handleChange('yearGraduated', text)}
        />

        <TouchableOpacity style={styles.registerButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.registerButtonText}>{loading ? 'Registering...' : 'Register'}</Text>
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

export default Register;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  registerText: {
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
  registerButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
    width: '100%',
    alignItems: 'center'
  },
  registerButtonText: {
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