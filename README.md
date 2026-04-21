This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin Bootstrap Seed

This project includes an admin bootstrap script to ensure at least one admin account exists.

1. Set environment variables:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAMA=Administrator
```

2. Run seed:

```bash
npm run seed:admin
```

If an admin already exists, the script exits safely without creating duplicates.

## Postman Test Scenarios

Use these scenarios to validate API behavior.

### Kambing list and detail

- GET /api/kambing -> 200 success
- GET /api/kambing/:id -> 200 success for valid id
- GET /api/kambing/abc -> 400 invalid id

### Kambing create

- POST /api/kambing with admin token + valid payload -> 201
- POST /api/kambing without token -> 401
- POST /api/kambing with user token -> 403
- POST /api/kambing with invalid payload -> 400

Payload rules:

- nama: required, non-empty string
- jenis: required, non-empty string
- berat: required, number > 0
- harga: required, number >= 0
- stok: required, integer >= 0
- imageUrl: optional string
- deskripsi: optional string

### Kambing update and delete

- PUT /api/kambing/:id with admin token + valid payload -> 200
- PUT /api/kambing/:id without token -> 401
- PUT /api/kambing/:id with user token -> 403
- PUT /api/kambing/:id invalid payload -> 400
- DELETE /api/kambing/:id with admin token -> 200
- DELETE /api/kambing/:id without token -> 401
- DELETE /api/kambing/:id with user token -> 403
- DELETE /api/kambing/:id invalid id -> 400
