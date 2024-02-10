import { PrismaClient } from "@prisma/client";

/**
 * Creating the connection with prisma
 * Passing a configuration object to show the queries performed on the database 
 */
export const prisma = new PrismaClient({
    log: ['query']
})
