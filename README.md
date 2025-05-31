Alumni Social Network Mobile App
A comprehensive cross-platform mobile application for alumni networking, featuring real-time messaging, social media functionality, and secure user management with admin approval system.
🚀 Features
🔐 Authentication & Security

Secure Registration - User registration with admin approval workflow
JWT Authentication - Token-based authentication with secure storage
Admin System - Role-based access control with approval notifications
Email Integration - Automated notifications for registration and approval status

💬 Real-Time Messaging

Live Conversations - WebSocket-powered real-time messaging
Group & Direct Chats - Support for both one-on-one and group conversations
Media Sharing - Image and video attachments with optimized processing
User Search - Find and connect with other alumni

📱 Social Media Features

Post Creation - Share text, images, and videos
Interactive Feed - Like, comment, and engage with posts
Media Gallery - Optimized image viewing with lazy loading
Video Playback - Custom video player with full-screen support

📧 Communication

Email Notifications - Automated updates for account status
Admin Alerts - Instant notifications for new registrations
Message Broadcasting - Real-time message delivery to conversation participants

🛠️ Tech Stack
Mobile Frontend

React Native - Cross-platform mobile framework
Expo - Development platform and tools
Expo Router - File-based navigation system
Expo SecureStore - Secure token storage
Expo Video - Advanced video playback capabilities
AsyncStorage - Local data persistence

Backend

Node.js - JavaScript runtime environment
Express.js - Web application framework
WebSocket (ws) - Real-time bidirectional communication
Prisma ORM - Database toolkit and query builder
PostgreSQL - Relational database
Sharp - High-performance image processing
Multer - File upload middleware
Nodemailer - Email delivery service
JWT - JSON Web Tokens for authentication
bcrypt - Password hashing

📊 Database Schema
Core Models

User - Alumni profiles with authentication and approval status
Conversation - Chat containers for group or direct messaging
Message - Individual messages with media attachments
Post - Social media posts with likes and comments
ConversationMember - Many-to-many relationship for chat participants

Key Features

Cascade Deletions - Automatic cleanup of related data
Media Attachments - Separate models for images and videos
Admin System - Role-based permissions and approval workflow
Timestamps - Automatic tracking of creation and updates

🔧 API Endpoints
Authentication

POST /api/register - User registration (pending approval)
POST /api/login - User authentication
POST /api/admin/approve/:userId - Admin user approval

Messaging

GET /api/conversations - Get user's conversations
POST /api/conversations - Create new conversation
GET /api/conversations/:id/messages - Get conversation messages
POST /api/conversations/:id/messages - Send new message

Social Media

GET /api/posts - Get all posts
POST /api/posts - Create new post
POST /api/posts/:id/like - Like/unlike post
POST /api/posts/:id/comments - Add comment
DELETE /api/posts/:id - Delete post (author only)

WebSocket Events

newMessage - Real-time message broadcasting
Connection authentication via JWT token

📱 Mobile Features
Advanced Functionality

Keyboard Handling - Automatic adjustment for input fields
Image Optimization - Lazy loading and memory management
Video Controls - Custom player with modal viewing
Touch Interactions - Optimized gestures and feedback
Cross-Platform UI - Consistent design across iOS and Android

Performance Optimizations

FlatList Rendering - Efficient scrolling for large datasets
Image Caching - Reduced network requests and faster loading
Token Migration - Automatic upgrade from AsyncStorage to SecureStore
Error Handling - Comprehensive user feedback and recovery
