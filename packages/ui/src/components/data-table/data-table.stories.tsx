import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Text, CalendarIcon, DollarSign } from 'lucide-react';
import * as React from 'react';
import { DataTable } from './data-table';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableToolbar } from './data-table-toolbar';
import { useDataTable } from '@workspace/ui/hooks/use-data-table';

const meta = {
  title: 'Data/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  // Note: NuqsStorybookAdapter is automatically applied via .storybook/preview.ts
  // No need to add it here - it works seamlessly!
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data type
interface Project {
  id: string;
  title: string;
  status: 'active' | 'inactive' | 'pending';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  budget: number;
}

// Sample data
const sampleData: Project[] = [
  {
    id: '1',
    title: 'Project Alpha',
    status: 'active',
    priority: 'high',
    createdAt: '2024-01-15',
    budget: 50000,
  },
  {
    id: '2',
    title: 'Project Beta',
    status: 'inactive',
    priority: 'medium',
    createdAt: '2024-02-20',
    budget: 30000,
  },
  {
    id: '3',
    title: 'Project Gamma',
    status: 'pending',
    priority: 'low',
    createdAt: '2024-03-10',
    budget: 20000,
  },
  {
    id: '4',
    title: 'Project Delta',
    status: 'active',
    priority: 'high',
    createdAt: '2024-01-05',
    budget: 75000,
  },
  {
    id: '5',
    title: 'Project Epsilon',
    status: 'active',
    priority: 'medium',
    createdAt: '2024-02-28',
    budget: 40000,
  },
];

/**
 * The DataTable component provides a powerful, feature-rich table with filtering, sorting, pagination, and more.
 * It uses TanStack Table under the hood and supports URL state management via nuqs.
 */
export const Default: Story = {
  render: () => {
    const columns = React.useMemo<ColumnDef<Project>[]>(
      () => [
        {
          id: 'title',
          accessorKey: 'title',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Title" />
          ),
          cell: ({ row }) => (
            <div className="font-medium">{row.getValue('title')}</div>
          ),
          meta: {
            label: 'Title',
            placeholder: 'Search titles...',
            variant: 'text',
            icon: Text,
          },
          enableColumnFilter: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Status" />
          ),
          cell: ({ row }) => {
            const status = row.getValue('status') as string;
            return (
              <div className="capitalize">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : status === 'inactive'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}
                >
                  {status}
                </span>
              </div>
            );
          },
          meta: {
            label: 'Status',
            variant: 'select',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Pending', value: 'pending' },
            ],
          },
          enableColumnFilter: true,
        },
        {
          id: 'priority',
          accessorKey: 'priority',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Priority" />
          ),
          cell: ({ row }) => (
            <div className="capitalize">{row.getValue('priority')}</div>
          ),
          meta: {
            label: 'Priority',
            variant: 'select',
            options: [
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ],
          },
          enableColumnFilter: true,
        },
        {
          id: 'createdAt',
          accessorKey: 'createdAt',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Created" />
          ),
          cell: ({ row }) => {
            const date = new Date(row.getValue('createdAt'));
            return <div>{date.toLocaleDateString()}</div>;
          },
          meta: {
            label: 'Created At',
            variant: 'date',
            icon: CalendarIcon,
          },
          enableColumnFilter: true,
        },
        {
          id: 'budget',
          accessorKey: 'budget',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Budget" />
          ),
          cell: ({ row }) => {
            const budget = row.getValue('budget') as number;
            return (
              <div className="font-medium">
                ${budget.toLocaleString('en-US')}
              </div>
            );
          },
          meta: {
            label: 'Budget',
            variant: 'number',
            unit: '$',
            icon: DollarSign,
          },
          enableColumnFilter: true,
        },
      ],
      [],
    );

    const { table } = useDataTable({
      data: sampleData,
      columns,
      pageCount: Math.ceil(sampleData.length / 10),
      initialState: {
        pagination: { pageSize: 10 },
      },
      getRowId: (row) => row.id,
    });

    return (
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    );
  },
};

/**
 * A simple data table with basic columns and no filtering.
 */
export const Simple: Story = {
  render: () => {
    const columns = React.useMemo<ColumnDef<Project>[]>(
      () => [
        {
          id: 'title',
          accessorKey: 'title',
          header: 'Title',
          cell: ({ row }) => <div>{row.getValue('title')}</div>,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => (
            <div className="capitalize">{row.getValue('status')}</div>
          ),
        },
        {
          id: 'budget',
          accessorKey: 'budget',
          header: 'Budget',
          cell: ({ row }) => {
            const budget = row.getValue('budget') as number;
            return <div>${budget.toLocaleString('en-US')}</div>;
          },
        },
      ],
      [],
    );

    const { table } = useDataTable({
      data: sampleData,
      columns,
      pageCount: Math.ceil(sampleData.length / 10),
      getRowId: (row) => row.id,
    });

    return <DataTable table={table} />;
  },
};

/**
 * Data table with row selection enabled. Select rows to see the selection state.
 */
export const WithRowSelection: Story = {
  render: () => {
    const columns = React.useMemo<ColumnDef<Project>[]>(
      () => [
        {
          id: 'title',
          accessorKey: 'title',
          header: 'Title',
          cell: ({ row }) => <div>{row.getValue('title')}</div>,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => (
            <div className="capitalize">{row.getValue('status')}</div>
          ),
        },
        {
          id: 'budget',
          accessorKey: 'budget',
          header: 'Budget',
          cell: ({ row }) => {
            const budget = row.getValue('budget') as number;
            return <div>${budget.toLocaleString('en-US')}</div>;
          },
        },
      ],
      [],
    );

    const { table } = useDataTable({
      data: sampleData,
      columns,
      pageCount: Math.ceil(sampleData.length / 10),
      enableRowSelection: true,
      getRowId: (row) => row.id,
    });

    return <DataTable table={table} />;
  },
};

/**
 * Data table with custom initial sorting. The table is sorted by createdAt in descending order.
 */
export const WithInitialSorting: Story = {
  render: () => {
    const columns = React.useMemo<ColumnDef<Project>[]>(
      () => [
        {
          id: 'title',
          accessorKey: 'title',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Title" />
          ),
          cell: ({ row }) => <div>{row.getValue('title')}</div>,
          enableSorting: true,
        },
        {
          id: 'createdAt',
          accessorKey: 'createdAt',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Created" />
          ),
          cell: ({ row }) => {
            const date = new Date(row.getValue('createdAt'));
            return <div>{date.toLocaleDateString()}</div>;
          },
          enableSorting: true,
        },
        {
          id: 'budget',
          accessorKey: 'budget',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Budget" />
          ),
          cell: ({ row }) => {
            const budget = row.getValue('budget') as number;
            return <div>${budget.toLocaleString('en-US')}</div>;
          },
          enableSorting: true,
        },
      ],
      [],
    );

    const { table } = useDataTable({
      data: sampleData,
      columns,
      pageCount: Math.ceil(sampleData.length / 10),
      initialState: {
        sorting: [{ id: 'createdAt', desc: true }],
      },
      getRowId: (row) => row.id,
    });

    return <DataTable table={table} />;
  },
};

/**
 * Data table with different filter types: text, select, number, and date filters.
 */
export const WithFilters: Story = {
  render: () => {
    const columns = React.useMemo<ColumnDef<Project>[]>(
      () => [
        {
          id: 'title',
          accessorKey: 'title',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Title" />
          ),
          cell: ({ row }) => <div>{row.getValue('title')}</div>,
          meta: {
            label: 'Title',
            placeholder: 'Search titles...',
            variant: 'text',
            icon: Text,
          },
          enableColumnFilter: true,
        },
        {
          id: 'status',
          accessorKey: 'status',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Status" />
          ),
          cell: ({ row }) => (
            <div className="capitalize">{row.getValue('status')}</div>
          ),
          meta: {
            label: 'Status',
            variant: 'select',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Pending', value: 'pending' },
            ],
          },
          enableColumnFilter: true,
        },
        {
          id: 'budget',
          accessorKey: 'budget',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Budget" />
          ),
          cell: ({ row }) => {
            const budget = row.getValue('budget') as number;
            return <div>${budget.toLocaleString('en-US')}</div>;
          },
          meta: {
            label: 'Budget',
            variant: 'number',
            unit: '$',
            icon: DollarSign,
          },
          enableColumnFilter: true,
        },
        {
          id: 'createdAt',
          accessorKey: 'createdAt',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} label="Created" />
          ),
          cell: ({ row }) => {
            const date = new Date(row.getValue('createdAt'));
            return <div>{date.toLocaleDateString()}</div>;
          },
          meta: {
            label: 'Created At',
            variant: 'date',
            icon: CalendarIcon,
          },
          enableColumnFilter: true,
        },
      ],
      [],
    );

    const { table } = useDataTable({
      data: sampleData,
      columns,
      pageCount: Math.ceil(sampleData.length / 10),
      getRowId: (row) => row.id,
    });

    return (
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    );
  },
};
