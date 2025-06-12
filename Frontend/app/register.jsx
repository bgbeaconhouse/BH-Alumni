import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Link, router } from 'expo-router';
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
    // Basic validation
    const requiredFields = ['username', 'password', 'email', 'firstName', 'lastName', 'phoneNumber', 'yearGraduated'];
    const emptyFields = requiredFields.filter(field => !formData[field].trim());
    
    if (emptyFields.length > 0) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        yearGraduated: parseInt(formData.yearGraduated, 10),
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
      Alert.alert('Registration Successful', result.message, [
        {
          text: 'OK',
          onPress: () => {
            router.push('/');
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
      Alert.alert('Registration Failed', error.message);
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Link href="/" style={styles.backLink}>
              ← Back
            </Link>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Brand Section */}
          <View style={styles.brandSection}>
            <Text style={styles.logo}>BH</Text>
            <Text style={styles.title}>Join Our Community</Text>
            <Text style={styles.subtitle}>Connect with fellow alumni</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="#bdc3c7"
                  value={formData.firstName}
                  onChangeText={(text) => handleChange('firstName', text)}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="#bdc3c7"
                  value={formData.lastName}
                  onChangeText={(text) => handleChange('lastName', text)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#bdc3c7"
              value={formData.username}
              onChangeText={(text) => handleChange('username', text)}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#bdc3c7"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Sobriety Date"
              placeholderTextColor="#bdc3c7"
              value={formData.phoneNumber}
              onChangeText={(text) => handleChange('phoneNumber', text)}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Year Graduated"
              placeholderTextColor="#bdc3c7"
              value={formData.yearGraduated}
              onChangeText={(text) => handleChange('yearGraduated', text)}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#bdc3c7"
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
              onPress={handleSubmit} 
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginPrompt}>
              <Text style={styles.promptText}>Already have an account? </Text>
              <TouchableOpacity>
                <Link href="/login" style={styles.loginLink}>
                  Sign In
                </Link>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Beacon House • Connected in recovery</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backLink: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 48,
    fontWeight: '100',
    color: '#2c3e50',
    letterSpacing: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#2c3e50',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  formSection: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfInput: {
    width: '48%',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingVertical: 16,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '300',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 18,
    borderRadius: 8,
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  registerButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  promptText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  loginLink: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
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
});