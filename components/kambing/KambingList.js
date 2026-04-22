import KambingCard from './KambingCard'

export default function KambingList({ data }) {
  return (
    <section>
      {data.map((kambing) => (
        <KambingCard key={kambing.id} kambing={kambing} />
      ))}
    </section>
  )
}
