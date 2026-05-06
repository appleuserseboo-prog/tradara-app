import { Router } from 'express';
// ✅ ADDED: Included 'updateItem' in the import list
import { getMyDashboardItems, createItem, deleteItem, updateItem } from '../controller/item';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import prisma from '../config/db'; 

const upload = multer({ dest: 'uploads/' }); 
const router = Router();

// 1. DASHBOARD ITEMS (Private)
router.get('/me', authMiddleware, getMyDashboardItems); 

// 2. SEARCH & PUBLIC ITEMS (Public)
router.get('/', async (req, res) => {
  try {
    const { search, city, area, category } = req.query;

    const items = await prisma.item.findMany({
      where: {
        AND: [
          // Strict Category Filter
          category && category !== 'All' ? { category: String(category) } : {},
          
          // Search Text
          search ? {
            OR: [
              { stockName: { contains: String(search), mode: 'insensitive' } },
              { description: { contains: String(search), mode: 'insensitive' } }
            ]
          } : {},

          // Location
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

// 3. GET SINGLE ITEM BY ID (Public - Fixed "Product Not Found" Issue)
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { 
        seller: { select: { name: true, isVerified: true } } 
      }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("❌ FETCH SINGLE ITEM ERROR:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 4. PROTECTED ROUTES (Requires Login)
router.post('/', authMiddleware, upload.array('images', 5), createItem);
router.delete('/:id', authMiddleware, deleteItem);
router.put('/:id', authMiddleware, updateItem); 

export default router;