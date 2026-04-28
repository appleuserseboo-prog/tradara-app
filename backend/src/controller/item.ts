import { Response, Request } from 'express';
import prisma from "../config/db"; 
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createItem = async (req: any, res: Response) => {
  try {
    const { stockName, price, currency, description, category, city, country, area, contactLink, canBargain } = req.body;
    let imagePaths: string[] = [];

    if (req.files && (req.files as any[]).length > 0) {
      const uploadPromises = (req.files as any[]).map(file => 
        cloudinary.uploader.upload(file.path, { folder: 'tradara_marketplace', resource_type: 'auto' })
      );
      const uploadResults = await Promise.all(uploadPromises);
      imagePaths = uploadResults.map(result => result.secure_url);
    }

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
        contactLink: contactLink || "",
        images: imagePaths, 
        canBargain: canBargain === 'true' || canBargain === true, 
        userId: req.user.id 
      }
    });
    res.status(201).json(newItem);
  } catch (error: any) {
    res.status(500).json({ error: "Post failed", details: error.message });
  }
};

export const getItems = async (req: any, res: Response) => {
  try {
    const { search, category, city, area } = req.query;

    const items = await prisma.item.findMany({
      where: {
        AND: [
          category && category !== 'All' ? { category: String(category) } : {},
          // ✅ CASE-INSENSITIVE FUZZY SEARCH FOR ALL FIELDS
          search ? { stockName: { contains: String(search), mode: 'insensitive' } } : {},
          city ? { city: { contains: String(city), mode: 'insensitive' } } : {},
          area ? { area: { contains: String(area), mode: 'insensitive' } } : {},
        ]
      },
      include: { seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50 
    });

    res.json(items || []);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
};

export const updateItem = async (req: any, res: Response) => {
  try {
    const { stockName, price, currency, city, area, country, category, description, canBargain } = req.body;
    const { id } = req.params;

    const updated = await prisma.item.update({
      where: { id, userId: req.user.id },
      data: { 
        stockName, city, area, country, category, description, currency,
        canBargain: canBargain !== undefined ? (canBargain === 'true' || canBargain === true) : undefined,
        price: price ? parseFloat(String(price)) : undefined 
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

export const getMyDashboardItems = async (req: any, res: Response) => {
  try {
    const items = await prisma.item.findMany({ 
      where: { userId: req.user.id }, 
      orderBy: { createdAt: 'desc' } 
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
};

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