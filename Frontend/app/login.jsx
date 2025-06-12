import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Keyboard } from 'react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const passwordInputRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    // Dismiss keyboard first to prevent UI issues
    Keyboard.dismiss();
    
    // Add small delay to ensure keyboard is dismissed
    setTimeout(async () => {
      // Basic validation
      if (!formData.username.trim() || !formData.password.trim()) {
        Alert.alert('Validation Error', 'Please fill in all fields');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('https://bh-alumni-social-media-app.onrender.com/api/login', {
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

        console.log("Full server response:", result);
        const tokenToStore = result.token;

        if (tokenToStore) {
          try {
            await SecureStore.setItemAsync('authToken', tokenToStore);
            console.log('Token stored securely:', tokenToStore);
          } catch (secureStoreError) {
            console.error('Error storing token in SecureStore:', secureStoreError);
            Alert.alert(
              'Storage Error',
              'Failed to securely store authentication token. Please try again.'
            );
            setLoading(false);
            return;
          }
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

        Alert.alert('Login Successful', result.message || 'Welcome back!', [
          {
            text: 'OK',
            onPress: () => {
              router.push('/home');
            },
          },
        ]);

        setFormData({ username: '', password: '' });

      } catch (error) {
        Alert.alert('Login Failed', error.message);
      } finally {
        setLoading(false);
      }
    }, 100); // Small delay to ensure keyboard dismissal
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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
            <Text style={styles.title}>Welcome Back</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#bdc3c7"
                value={formData.username}
                onChangeText={(text) => handleChange('username', text)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => {
                  // Focus password field when "next" is pressed
                  passwordInputRef.current?.focus();
                }}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#bdc3c7"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleSubmit} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => {
                Alert.alert(
                  'Forgot Password',
                  'To reset your password, please email us at:\n\nbgbeaconhouse@gmail.com\n\nInclude your username and we\'ll help you reset your password.',
                  [
                    { text: 'OK', style: 'default' }
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Beacon House • Est. 1974</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;

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
    marginBottom: 60,
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
    letterSpacing: 1,
  },
  formSection: {
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingVertical: 16,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  eyeButton: {
    paddingVertical: 16,
    paddingLeft: 10,
  },
  eyeText: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  loginButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 18,
    borderRadius: 8,
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  forgotPasswordButton: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#7f8c8d',
    fontSize: 14,
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
});