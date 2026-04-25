import { verifyAuthToken } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req) {
  try {
    // Check auth
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return Response.json(
        { error: 'No authorization token' },
        { status: 401 }
      )
    }

    const auth = await verifyAuthToken(token)
    if (!auth || (auth.role !== 'admin' && auth.role !== 'owner')) {
      return Response.json(
        { error: 'Unauthorized - admin/owner only' },
        { status: 403 }
      )
    }

    // Test 1: Check users data
    const users = await query(
      `SELECT id, nama, email FROM users LIMIT 5`
    )

    // Test 2: Check orders with user data
    const orders = await query(
      `SELECT 
         o.id, 
         o.user_id, 
         o.payment_status, 
         o.status,
         u.id AS user_table_id,
         u.nama AS user_nama,
         u.email
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LIMIT 10`
    )

    // Test 3: Check what the transaction query returns
    const transaksiDebug = await query(
      `SELECT
         o.id AS transaksi_id,
         o.user_id,
         o.created_at AS tanggal_transaksi,
         u.id AS u_id,
         u.nama AS u_nama,
         COALESCE(u.nama, '-') AS nama_pembeli,
         oi.kambing_id AS produk_id,
         k.nama AS k_nama,
         oi.qty
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN kambing k ON k.id = oi.kambing_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.payment_status = 'paid'
       LIMIT 5`
    )

    return Response.json({
      users_sample: users,
      orders_with_users: orders,
      transaksi_debug: transaksiDebug
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
