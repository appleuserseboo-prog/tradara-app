import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as dotenv from 'dotenv';
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit'; 
import apiRoutes from './routes/index'; 
import prisma from './config/db'; 

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy for rate limiting behind proxies
const httpServer = createServer(app);

// --- 1. CONFIGURATION ---
const PORT = process.env.PORT || 5000;

// ✅ Updated allowedOrigins for Production
const allowedOrigins = [
    "http://localhost:5173", 
    "https://tradara-app.vercel.app" 
];

// --- 2. SECURITY & TRAFFIC CONTROL ---
app.use(helmet({ crossOriginResourcePolicy: false }));

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { message: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 10, 
    message: { message: "Too many login/reset attempts. Try again in an hour." }
});

// --- 3. SOCKET.IO CONFIG ---
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins, 
        methods: ["GET", "POST"],
        credentials: true
    }
});

// --- 4. MIDDLEWARE ---
// ✅ Dynamic CORS logic to handle multiple origins safely
app.use(cors({ 
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy: This origin is not allowed'), false);
        }
    }, 
    credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/uploads', express.static('uploads')); 

app.use((req: any, res, next) => {
    req.io = io;
    next();
});

io.on("connection", (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);
});

// --- 5. ROUTES ---
app.use('/api', apiRoutes); 

// --- 6. STABILITY (GLOBAL ERROR HANDLER) ---
app.use((err: any, req: any, res: any, next: any) => {
  console.error("SERVER ERROR:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "An internal server error occurred",
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// --- 7. START SERVER ---
httpServer.listen(PORT, () => {
    console.log(`\n🚀 [BACKEND] Tradara Server running.`);
    console.log(`📂 [PRISMA] Client recognized and ready.`);
}); 