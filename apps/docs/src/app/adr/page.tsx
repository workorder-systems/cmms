import Link from 'next/link'

import { Prose } from '@/components/Prose'
import { getAcceptedAdrs } from '@/lib/adr'

export const metadata = {
  title: 'Architecture Decision Records',
  description:
    'Architecture decision records (ADRs) for the Work Order Systems platform. Durable decisions and reasoning for consistency and maintainability.',
}

export default async function AdrIndexPage() {
  const adrs = await getAcceptedAdrs()

  return (
    <Prose className="mt-10">
      <h1>Architecture Decision Records</h1>
      <p className="lead">
        Architecture decision records (ADRs) document durable decisions and the
        reasoning behind them for the Work Order Systems platform. They help
        keep the system consistent and maintainable over time.
      </p>
      <p>
        When a decision changes, a new ADR is created and the old one is marked
        as <strong>Superseded</strong>.
      </p>
      <h2>ADR index</h2>
      <table>
        <thead>
          <tr>
            <th>ADR</th>
            <th>Title</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {adrs.map((adr) => (
            <tr key={adr.slug}>
              <td>
                <Link href={`/adr/${adr.slug}`}>{adr.num}</Link>
              </td>
              <td>
                <Link href={`/adr/${adr.slug}`}>{adr.title}</Link>
              </td>
              <td>{adr.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Prose>
  )
}
