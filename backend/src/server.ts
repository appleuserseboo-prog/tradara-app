import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as dotenv from 'dotenv';
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit'; 
import apiRoutes from './routes/index'; 
import prisma from './lib/prisma'; // ✅ Now using the singleton client

dotenv.config();

const app = express();
app.set('trust proxy', 1); 
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const allowedOrigins = [
    "http://localhost:5173", 
    "https://tradara-app.vercel.app" 
];

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

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins, 
        methods: ["GET", "POST"],
        credentials: true
    }
});

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

// ✅ LIGHTWEIGHT HEALTH CHECK: Point your Cron-job URL here
app.get('/api/health', (req, res) => {
  res.status(200).send('Server is alive and legendary!');
});

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

app.use('/api', apiRoutes); 

app.use((err: any, req: any, res: any, next: any) => {
  console.error("SERVER ERROR:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "An internal server error occurred",
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

httpServer.listen(PORT, () => {
    console.log(`\n🚀 [BACKEND] Tradara Server running.`);
    console.log(`📂 [PRISMA] Singleton Client recognized.`);
});