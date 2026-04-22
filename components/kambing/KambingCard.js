import Link from 'next/link'

export default function KambingCard({ kambing }) {
  return (
    <Link href={`/kambing/${kambing.id}`}>
      <article>
        <h2>{kambing.nama}</h2>
        <p>Jenis: {kambing.jenis}</p>
        <p>Harga: {kambing.harga}</p>
        <p>Stok: {kambing.stok}</p>
      </article>
    </Link>
  )
}
