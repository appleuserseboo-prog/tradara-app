import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/index';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins for CORS configuration
const allowedOrigins = [
  'https://tradara-app.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Permissive CORS configuration to prevent Render cold-start pre-flight network rejections
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server calls)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true); // Allow all cross-origin requests for deployment flexibility
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Explicitly handle browser CORS preflight requests globally
app.options('*', cors());

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'TRADARA API Engine Active',
    status: 'healthy',
  });
});

// Mount consolidated API routes under /api
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[TRADARA API Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;