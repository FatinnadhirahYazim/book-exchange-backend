import express from 'express';
import {
  getBooks,
  getBook,
  addBook,
  updateBook,
  deleteBook
} from '../controllers/bookController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getBooks);
router.get('/:id', getBook);

// Protected routes (Admin only)
router.post('/', protect, admin, addBook);
router.put('/:id', protect, admin, updateBook);
router.delete('/:id', protect, admin, deleteBook);

export default router; 