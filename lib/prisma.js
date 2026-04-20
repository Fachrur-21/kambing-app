import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

console.log("ENV:", process.env.DATABASE_URL)

const prisma = new PrismaClient()

export default prisma