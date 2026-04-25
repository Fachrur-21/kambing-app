function buildXenditAuthorizationHeader(secretKey) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

export function getXenditConfig() {
  const secretKey = process.env.XENDIT_SECRET_KEY || ''
  const callbackVerificationToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || ''

  return {
    secretKey,
    callbackVerificationToken,
    baseUrl: 'https://api.xendit.co'
  }
}

export function buildXenditExternalId(orderId) {
  return `KMB-XND-${orderId}-${Date.now()}`
}

export function normalizeXenditInvoiceStatus(value) {
  return String(value || '').trim().toUpperCase()
}

export function mapXenditStatusToOrderStatus(invoiceStatus) {
  const normalizedStatus = normalizeXenditInvoiceStatus(invoiceStatus)

  if (normalizedStatus === 'PAID' || normalizedStatus === 'SETTLED') {
    return { paymentStatus: 'paid', orderStatus: 'diproses' }
  }

  if (normalizedStatus === 'PENDING') {
    return { paymentStatus: 'pending', orderStatus: 'pending_payment' }
  }

  if (normalizedStatus === 'EXPIRED') {
    return { paymentStatus: 'expired', orderStatus: 'expired' }
  }

  if (normalizedStatus === 'FAILED' || normalizedStatus === 'VOIDED') {
    return { paymentStatus: 'failed', orderStatus: 'failed' }
  }

  return {
    paymentStatus: normalizedStatus ? normalizedStatus.toLowerCase() : 'pending',
    orderStatus: normalizedStatus ? normalizedStatus.toLowerCase() : 'pending_payment'
  }
}

async function xenditRequest(path, options = {}) {
  const config = getXenditConfig()

  if (!config.secretKey) {
    throw new Error('XENDIT_SECRET_KEY belum diset')
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: buildXenditAuthorizationHeader(config.secretKey),
      ...(options.headers || {})
    }
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const firstError = Array.isArray(result?.errors) && result.errors.length > 0 ? result.errors[0] : null
    const errorMessage = firstError?.message || result?.message || 'Gagal mengakses API Xendit'
    throw new Error(errorMessage)
  }

  return result
}

export async function createXenditInvoice(payload) {
  return xenditRequest('/v2/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}

export async function getXenditInvoiceByExternalId(externalId) {
  const normalizedExternalId = String(externalId || '').trim()

  if (!normalizedExternalId) {
    throw new Error('External ID invoice wajib diisi')
  }

  const result = await xenditRequest(`/v2/invoices?external_id=${encodeURIComponent(normalizedExternalId)}`)
  const invoices = Array.isArray(result) ? result : []
  return invoices[0] || null
}