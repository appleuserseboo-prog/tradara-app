import { Response, Request } from 'express';
import prisma from "../config/db"; 

export const createItem = async (req: any, res: Response) => {
  try {
    const { 
      title, stockName, price, currency, description, category, 
      city, country, area, contactLink, canBargain 
    } = req.body;

    const imagePaths = req.files ? (req.files as any[]).map(file => file.path || file.location) : [];

    const newItem = await prisma.item.create({
      data: {
        title: title || stockName, // ✅ Added Title (defaults to stockName if empty)
        stockName,
        price: parseFloat(price) || 0,
        currency: currency || "NGN", 
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
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({ error: "Failed to post." });
  }
};

export const updateItem = async (req: any, res: Response) => {
  try {
    const { title, stockName, price, currency, city, area, country, category, description, canBargain } = req.body;
    const { id } = req.params;

    const updated = await prisma.item.update({
      where: { id, userId: req.user.id },
      data: { 
        title, // ✅ Added Title to update
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

// ... keep getItems, getMyDashboardItems, and deleteItem the same as before
export const getItems = async (req: any, res: Response) => {
  try {
    const { search, category, minPrice, maxPrice, city, area } = req.query;

    const items = await prisma.item.findMany({
      where: {
        AND: [
          // If a category is selected and it's not "All", filter strictly by it
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

    if (items.length === 0) return res.status(200).json([]); // Return empty array instead of 404 to avoid frontend errors
    res.json(items);
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

