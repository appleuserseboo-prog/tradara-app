export interface Item {
    id: string;
    stockName: string;
    quantity: number;
    price: number;
    description?: string;
    city: string;
    isSold: boolean;
    sellerId?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    city?: string;
    user? : {userId: string ;email : string}; // For socket.io user identification
    io?: any; // Socket.IO client instance (optional)
}
export interface userPayload {
    userId: string;
    email: string;
}