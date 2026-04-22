export default function KambingDetail({ kambing }) {
  return (
    <article>
      <h1>{kambing.nama}</h1>
      <p>Jenis: {kambing.jenis}</p>
      <p>Harga: {kambing.harga}</p>
      <p>Stok: {kambing.stok}</p>
      {kambing.deskripsi ? <p>Deskripsi: {kambing.deskripsi}</p> : null}
    </article>
  )
}
