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
