import { Response, Request } from 'express';
import prisma from "../config/db"; 
import { v2 as cloudinary } from 'cloudinary';

// Ensure Cloudinary is configured (usually done in a separate config file, 
// but it uses your process.env variables automatically)

export const createItem = async (req: any, res: Response) => {
  try {
    const { 
      stockName, price, currency, description, category, 
      city, country, area, contactLink, canBargain 
    } = req.body;

    let imagePaths: string[] = [];

    // ✅ CLOUDINARY UPLOAD LOGIC
    if (req.files && (req.files as any[]).length > 0) {
      const uploadPromises = (req.files as any[]).map(file => 
        cloudinary.uploader.upload(file.path, {
          folder: 'tradara_marketplace', // Optional: organizes your images in Cloudinary
        })
      );

      const uploadResults = await Promise.all(uploadPromises);
      // We grab the 'secure_url' which starts with https://res.cloudinary.com
      imagePaths = uploadResults.map(result => result.secure_url);
    }

    const newItem = await prisma.item.create({
      data: {
        stockName,
        price: parseFloat(price) || 0,
        currency: currency || "NGN", 
        description: description || "",
        category: category || "General",
        city: city || "",
        country: country || "Nigeria",
        area: area || "",
        contactLink: contactLink || "",
        images: imagePaths, // This now saves the permanent Cloudinary links
        canBargain: canBargain === 'true' || canBargain === true, 
        userId: req.user.id 
      }
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({ error: "Failed to post item to cloud." });
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

export const getItems = async (req: any, res: Response) => {
  try {
    const { search, category, minPrice, maxPrice, city, area } = req.query;

    const items = await prisma.item.findMany({
      where: {
        AND: [
          category && category !== 'All' ? { category: String(category) } : {},
          search ? { stockName: { contains: String(search), mode: 'insensitive' } } : {},
          city ? { city: { contains: String(city), mode: 'insensitive' } } : {},
          area ? { area: { contains: String(area), mode: 'insensitive' } } : {},
          {
            price: {
              gte: minPrice ? parseFloat(String(minPrice)) : 0,
              lte: maxPrice ? parseFloat(String(maxPrice)) : 99999999,
            }
          }
        ]
      },
      include: { seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items || []);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Search engine failure" });
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