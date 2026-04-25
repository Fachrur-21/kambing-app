import { query } from '@/lib/db'

export async function GET() {
  const users = await query('SELECT * FROM users')

  return Response.json(users)
}