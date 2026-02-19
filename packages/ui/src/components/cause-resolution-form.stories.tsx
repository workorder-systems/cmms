import type { Meta, StoryObj } from "@storybook/react"
import { CauseResolutionForm } from "./cause-resolution-form"

const meta = {
  title: "CMMS/CauseResolutionForm",
  component: CauseResolutionForm,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CauseResolutionForm>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {},
}

export const Prefilled: Story = {
  args: {
    cause: "Seal wear due to age and particulate in fluid.",
    resolution: "Replaced seal and flushed system. Verified no leaks.",
  },
}

export const WithSubmitHandler: Story = {
  args: {
    onSubmit: (payload) => {
      console.log("Submit", payload)
    },
    submitLabel: "Complete work order",
  },
}

export const Disabled: Story = {
  args: {
    cause: "Seal wear.",
    resolution: "Replaced seal.",
    disabled: true,
    onSubmit: (payload) => console.log(payload),
  },
}

export const CustomSubmitLabel: Story = {
  args: {
    submitLabel: "Mark complete",
    onSubmit: () => {},
  },
}

export const RequiredResolution: Story = {
  args: {
    requireResolution: true,
    submitLabel: "Complete work order",
    onSubmit: (payload) => console.log("Submit", payload),
  },
}

export const Submitting: Story = {
  args: {
    cause: "Seal wear.",
    resolution: "Replaced seal and flushed system.",
    isSubmitting: true,
    submitLabel: "Complete",
    onSubmit: () => {},
  },
}

export const WithDescriptions: Story = {
  args: {
    causeDescription: "What was the root cause of the issue?",
    resolutionDescription: "Describe the steps taken to fix it (required for completion).",
    submitLabel: "Complete",
    onSubmit: (payload) => console.log(payload),
  },
}

export const WithLegend: Story = {
  args: {
    legend: "Completion details",
    cause: "Worn seal.",
    resolution: "Replaced seal.",
    onSubmit: () => {},
  },
}
