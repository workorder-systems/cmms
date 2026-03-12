import { createFileRoute } from '@tanstack/react-router'
import { BentoGrid, BentoGridItem } from '@workspace/ui/components/BentoGrid'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <BentoGrid
        cols={{ base: 2, md: 3, lg: 4 }}
        rowHeight={{ base: '60px', md: '80px', lg: '120px' }}
      >
        <BentoGridItem colSpan={2} rowSpan={2}>
          Hero Card
        </BentoGridItem>
        <BentoGridItem>Stats 1</BentoGridItem>
        <BentoGridItem>Stats 2</BentoGridItem>

        <BentoGridItem rowSpan={2} colSpan={2}>
          Wide Card
        </BentoGridItem>

        <BentoGridItem>Small</BentoGridItem>
        <BentoGridItem>Small</BentoGridItem>

        <BentoGridItem colSpan={2} rowSpan={2}>
          Secondary Hero
        </BentoGridItem>
        <BentoGridItem>Stats 3</BentoGridItem>
        <BentoGridItem>Stats 4</BentoGridItem>

        <BentoGridItem rowSpan={2} colSpan={2}>
          Another Wide Card
        </BentoGridItem>

        <BentoGridItem>Small</BentoGridItem>
        <BentoGridItem>Small</BentoGridItem>
      </BentoGrid>
    </div>
  )
}
