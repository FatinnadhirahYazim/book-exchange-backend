import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.log('Available environment variables:', Object.keys(process.env));
  // Continue anyway, but log the warning
}

// Import routes
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Debug route to check environment
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    mongodb: {
      state: mongoose.connection.readyState,
      connected: mongoose.connection.readyState === 1
    },
    envVars: {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      port: process.env.PORT
    }
  });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Add detailed logging
    console.log('=== MongoDB Connection Debug ===');
    console.log('Attempting connection with following details:');
    console.log('- URI exists:', !!uri);
    console.log('- URI starts with:', uri.substring(0, 10) + '...');
    console.log('- Current environment:', process.env.NODE_ENV);
    
    // Set up connection options with debug logging
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true
    };

    console.log('Connection options:', JSON.stringify(options, null, 2));
    console.log('Initiating MongoDB connection...');

    // Connect to MongoDB
    await mongoose.connect(uri, options);

    // Get the default connection
    const db = mongoose.connection;

    // Enhanced connection event handlers
    db.on('connected', () => {
      console.log('=== MongoDB Connection Success ===');
      console.log('- Connection established');
      console.log('- Database name:', db.name);
      console.log('- Host:', db.host);
      console.log('- Port:', db.port);
    });

    db.on('error', (err) => {
      console.error('=== MongoDB Connection Error ===');
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        codeName: err.codeName,
        stack: err.stack
      });
    });

    db.on('disconnected', () => {
      console.log('=== MongoDB Disconnected ===');
      console.log('- Time:', new Date().toISOString());
      console.log('- Will attempt to reconnect automatically');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await db.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    console.log('MongoDB Connected Successfully');
    return true;
  } catch (error) {
    console.error('=== MongoDB Connection Fatal Error ===');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName,
      stack: error.stack
    });
    console.error('Environment check:');
    console.error('- NODE_ENV:', process.env.NODE_ENV);
    console.error('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
    return false;
  }
};

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    // Log startup information
    console.log('Starting server...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Port:', PORT);
    console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);

    // Try to connect to MongoDB
    const isConnected = await connectDB();
    if (!isConnected) {
      console.log('Warning: MongoDB connection failed, but server will continue to run');
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Server startup complete');
    });
  } catch (error) {
    console.error('Server startup error:', error);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Start the server
startServer(); 