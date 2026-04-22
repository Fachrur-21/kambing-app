'use client'

import { useState } from 'react'
import { createOrder } from '@/lib/order'

export default function KambingCheckout({ kambingId, stok }) {
  const [qty, setQty] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleCheckout(event) {
    event.preventDefault()

    const parsedQty = Number(qty)

    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setError('Qty harus lebih dari 0')
      setSuccess('')
      return
    }

    if (parsedQty > Number(stok)) {
      setError('Qty melebihi stok')
      setSuccess('')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await createOrder([{ kambingId, qty: parsedQty }])
      setSuccess('Order berhasil dibuat')
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Gagal membuat order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>Checkout</h2>
      <form onSubmit={handleCheckout}>
        <label htmlFor="qty">Qty</label>
        <input
          id="qty"
          type="number"
          min="1"
          max={String(stok)}
          value={qty}
          onChange={(event) => setQty(event.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Memproses...' : 'Beli'}
        </button>
      </form>
      {error ? <p>{error}</p> : null}
      {success ? <p>{success}</p> : null}
    </section>
  )
}
