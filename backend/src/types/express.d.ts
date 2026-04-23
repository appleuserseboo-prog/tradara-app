import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      // Logic: By setting 'user' to the 'User' type from Prisma, 
      // you get full autocomplete for id, email, and any other fields.
      user: User; 
    }
  }
}