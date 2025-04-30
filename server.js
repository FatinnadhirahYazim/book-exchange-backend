import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';

// Create Express app
const app = express();

// Enhanced CORS configuration
app.use(cors());
app.use(express.json());

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running',
    time: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// MongoDB Connection with enhanced error handling
const connectDB = async () => {
  try {
    // Log available environment variables (without values)
    console.log('Available environment variables:', Object.keys(process.env));
    
    // Check MongoDB URI
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not defined');
      return false;
    }

    console.log('Attempting MongoDB connection...');
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 2000,
    });

    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    return false;
  }
};

// Routes
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

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    console.log('Starting server...');
    console.log('PORT:', PORT);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Try to connect to MongoDB but don't exit if it fails
    const isConnected = await connectDB();
    if (!isConnected) {
      console.log('Warning: MongoDB connection failed, but server will continue to run');
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    // Don't exit the process, let Railway handle restarts if needed
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  // Don't exit the process
});

// Start the server
startServer(); 