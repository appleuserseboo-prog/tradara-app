import { Router } from 'express';
// ✅ ADDED: Included 'updateItem' in the import list
import { getMyDashboardItems, createItem, deleteItem, updateItem } from '../controller/item';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import prisma from '../config/db'; 

const upload = multer({ dest: 'uploads/' }); 
const router = Router();

// Dashboard items
router.get('/me', authMiddleware, getMyDashboardItems); 

// Search & Public Items
router.get('/', async (req, res) => {
  try {
    const { search, city, area, category } = req.query;

    const items = await prisma.item.findMany({
      where: {
        AND: [
          // 1. Strict Category Filter (Fixes Issue #3)
          category && category !== 'All' ? { category: String(category) } : {},
          
          // 2. Search Text
          search ? {
            OR: [
              { stockName: { contains: String(search), mode: 'insensitive' } },
              { description: { contains: String(search), mode: 'insensitive' } }
            ]
          } : {},

          // 3. Location
          city ? { city: { equals: String(city), mode: 'insensitive' } } : {},
          area ? { area: { equals: String(area), mode: 'insensitive' } } : {}
        ]
      },
      include: { 
        seller: { select: { name: true, isVerified: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error) {
    console.error("❌ BACKEND FETCH ERROR:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Protected routes
router.post('/', authMiddleware, upload.array('images', 5), createItem);
router.delete('/:id', authMiddleware, deleteItem);
router.put('/:id', authMiddleware, updateItem); // ✅ No longer red!

export default router;