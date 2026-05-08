import { Response, Request } from 'express';
import prisma from "../config/db"; 
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to sanitize strings from the database and prevent "null" strings
const cleanStr = (val: any) => 
  (val && String(val).toLowerCase() !== 'null' && String(val).toLowerCase() !== 'undefined' ? val : null);

// --- CREATE ITEM ---
export const createItem = async (req: any, res: Response) => {
  try {
    const { 
      stockName, price, currency, description, category, 
      city, country, area, whatsapp, facebook, tiktok, instagram 
    } = req.body;

    const newItem = await prisma.item.create({
      data: {
        stockName,
        price: parseFloat(price) || 0,
        currency: currency || "₦", 
        description: description || "",
        category: category || "General",
        city: city || "",
        country: country || "Nigeria",
        area: area || "",
        // FIXED: Using cleanStr to resolve Compilation Error
        whatsapp: cleanStr(whatsapp),
        facebook: cleanStr(facebook),
        tiktok: cleanStr(tiktok),
        instagram: cleanStr(instagram),
        userId: req.user.id 
      }
    });
    res.status(201).json(newItem);
  } catch (error: any) {
    res.status(500).json({ error: "Post failed", details: error.message });
  }
};
// Define a local type if Prisma types aren't inferring correctly
export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      include: { 
        seller: true // Fetch the full seller object
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = items.map((item: any) => ({
      ...item,
      // The logic you wrote is correct, but 'item: any' helps if 
      // the generated types are still refreshing in VS Code
      whatsapp: cleanStr(item.whatsapp) || cleanStr(item.seller?.phone) || null
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
};

// --- GET MY DASHBOARD ITEMS ---
// --- GET MY DASHBOARD ITEMS ---
export const getMyDashboardItems = async (req: any, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.user.id },
      include: { 
        seller: { 
          select: { phone: true } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    // Explicitly define 'item' as 'any' to clear the TS error
    const formatted = items.map((item: any) => ({
      ...item,
      whatsapp: cleanStr(item.whatsapp) || cleanStr(item.seller?.phone) || null
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
};

// --- UPDATE ITEM ---
export const updateItem = async (req: any, res: Response) => {
  try {
    const { 
      stockName, price, currency, city, area, country, 
      category, description, canBargain,
      whatsapp, facebook, tiktok, instagram 
    } = req.body;
    const { id } = req.params;

    const updated = await prisma.item.update({
      where: { id, userId: req.user.id },
      data: { 
        stockName, city, area, country, category, description, currency,
        whatsapp: cleanStr(whatsapp),
        facebook: cleanStr(facebook),
        tiktok: cleanStr(tiktok),
        instagram: cleanStr(instagram),
        canBargain: canBargain !== undefined ? (canBargain === 'true' || canBargain === true) : undefined,
        price: price ? parseFloat(String(price)) : undefined 
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

// --- DELETE ITEM ---
export const deleteItem = async (req: any, res: Response) => {
  try {
    await prisma.item.delete({ 
      where: { 
        id: req.params.id, 
        userId: req.user.id 
      }
    });
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Unauthorized or item not found" });
  }
};