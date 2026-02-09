import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from './data-grid';
import { useDataGrid } from '../../hooks/use-data-grid';

const meta = {
  title: 'Data/DataGrid',
  component: DataGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data types
interface Person {
  id: string;
  name: string;
  email: string;
  age: number;
  status: string;
  role: string;
  active: boolean;
  startDate: string;
  website: string;
  notes: string;
  skills: string[];
}

// Sample data
const initialData: Person[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    age: 32,
    status: 'active',
    role: 'admin',
    active: true,
    startDate: '2023-01-15',
    website: 'https://johndoe.com',
    notes: 'Senior developer with 10+ years of experience',
    skills: ['javascript', 'typescript', 'react'],
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 28,
    status: 'active',
    role: 'user',
    active: true,
    startDate: '2023-03-20',
    website: 'https://janesmith.dev',
    notes: 'Full-stack developer specializing in React and Node.js',
    skills: ['react', 'node', 'python'],
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    age: 45,
    status: 'inactive',
    role: 'user',
    active: false,
    startDate: '2022-11-10',
    website: 'https://bobjohnson.io',
    notes: 'Backend engineer with expertise in distributed systems',
    skills: ['java', 'go', 'kubernetes'],
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice@example.com',
    age: 29,
    status: 'active',
    role: 'admin',
    active: true,
    startDate: '2023-05-01',
    website: 'https://alicewilliams.com',
    notes: 'UI/UX designer and frontend developer',
    skills: ['design', 'css', 'react'],
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    age: 35,
    status: 'pending',
    role: 'user',
    active: false,
    startDate: '2023-07-12',
    website: 'https://charliebrown.net',
    notes: 'DevOps engineer focused on CI/CD and infrastructure',
    skills: ['docker', 'kubernetes', 'terraform'],
  },
];

// Column definitions
const columns: ColumnDef<Person>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    meta: {
      label: 'Name',
      cell: {
        variant: 'short-text',
      },
    },
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    meta: {
      label: 'Email',
      cell: {
        variant: 'short-text',
      },
    },
  },
  {
    id: 'age',
    accessorKey: 'age',
    header: 'Age',
    meta: {
      label: 'Age',
      cell: {
        variant: 'number',
        min: 0,
        max: 120,
      },
    },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    meta: {
      label: 'Status',
      cell: {
        variant: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Pending', value: 'pending' },
        ],
      },
    },
  },
  {
    id: 'role',
    accessorKey: 'role',
    header: 'Role',
    meta: {
      label: 'Role',
      cell: {
        variant: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
          { label: 'Guest', value: 'guest' },
        ],
      },
    },
  },
  {
    id: 'active',
    accessorKey: 'active',
    header: 'Active',
    meta: {
      label: 'Active',
      cell: {
        variant: 'checkbox',
      },
    },
  },
  {
    id: 'startDate',
    accessorKey: 'startDate',
    header: 'Start Date',
    meta: {
      label: 'Start Date',
      cell: {
        variant: 'date',
      },
    },
  },
  {
    id: 'website',
    accessorKey: 'website',
    header: 'Website',
    meta: {
      label: 'Website',
      cell: {
        variant: 'url',
      },
    },
  },
  {
    id: 'notes',
    accessorKey: 'notes',
    header: 'Notes',
    meta: {
      label: 'Notes',
      cell: {
        variant: 'long-text',
      },
    },
  },
  {
    id: 'skills',
    accessorKey: 'skills',
    header: 'Skills',
    meta: {
      label: 'Skills',
      cell: {
        variant: 'multi-select',
        options: [
          { label: 'JavaScript', value: 'javascript' },
          { label: 'TypeScript', value: 'typescript' },
          { label: 'React', value: 'react' },
          { label: 'Node.js', value: 'node' },
          { label: 'Python', value: 'python' },
          { label: 'Java', value: 'java' },
          { label: 'Go', value: 'go' },
          { label: 'Kubernetes', value: 'kubernetes' },
          { label: 'Docker', value: 'docker' },
          { label: 'Terraform', value: 'terraform' },
          { label: 'Design', value: 'design' },
          { label: 'CSS', value: 'css' },
        ],
      },
    },
  },
];

/**
 * Basic Data Grid with various cell types including text, number, select, checkbox, date, URL, long text, and multi-select.
 * 
 * Features:
 * - Inline cell editing
 * - Keyboard navigation (arrow keys, Tab, Enter, etc.)
 * - Cell selection with mouse and keyboard
 * - Copy/paste support
 * - Search functionality (Ctrl/Cmd+F)
 */
export const Default: Story = {
  render: () => {
    const [data, setData] = React.useState<Person[]>(initialData);

    const { table, ...dataGridProps } = useDataGrid({
      data,
      columns,
      onDataChange: setData,
      getRowId: (row) => row.id,
      enableSearch: true,
    });

    return (
      <div className="w-full">
        <DataGrid table={table} {...dataGridProps} height={600} />
      </div>
    );
  },
};

/**
 * Data Grid with row management - add and delete rows.
 * 
 * Features:
 * - Add row button at the bottom
 * - Delete rows via context menu or keyboard shortcuts
 */
export const WithRowManagement: Story = {
  render: () => {
    const [data, setData] = React.useState<Person[]>(initialData);

    const generateId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const onRowAdd = React.useCallback(() => {
      const newRow: Person = {
        id: generateId(),
        name: '',
        email: '',
        age: 0,
        status: 'pending',
        role: 'user',
        active: false,
        startDate: new Date().toISOString().split('T')[0],
        website: '',
        notes: '',
        skills: [],
      };
      setData((prev) => [...prev, newRow]);
      return {
        rowIndex: data.length,
        columnId: 'name',
      };
    }, [data.length]);

    const onRowsDelete = React.useCallback((rows: Person[]) => {
      setData((prev) => prev.filter((row) => !rows.includes(row)));
    }, []);

    const { table, ...dataGridProps } = useDataGrid({
      data,
      columns,
      onDataChange: setData,
      onRowAdd,
      onRowsDelete,
      getRowId: (row) => row.id,
      enableSearch: true,
    });

    return (
      <div className="w-full">
        <DataGrid table={table} {...dataGridProps} height={600} />
      </div>
    );
  },
};

/**
 * Read-only Data Grid - all editing is disabled.
 */
export const ReadOnly: Story = {
  render: () => {
    const [data] = React.useState<Person[]>(initialData);

    const { table, ...dataGridProps } = useDataGrid({
      data,
      columns,
      readOnly: true,
      getRowId: (row) => row.id,
      enableSearch: true,
    });

    return (
      <div className="w-full">
        <DataGrid table={table} {...dataGridProps} height={600} />
      </div>
    );
  },
};

/**
 * Data Grid with custom height and stretched columns.
 */
export const CustomHeight: Story = {
  render: () => {
    const [data, setData] = React.useState<Person[]>(initialData);

    const { table, ...dataGridProps } = useDataGrid({
      data,
      columns,
      onDataChange: setData,
      getRowId: (row) => row.id,
      enableSearch: true,
    });

    return (
      <div className="w-full">
        <DataGrid 
          table={table} 
          {...dataGridProps} 
          height={800}
          stretchColumns={true}
        />
      </div>
    );
  },
};

/**
 * Data Grid with large dataset to demonstrate virtualization performance.
 */
export const LargeDataset: Story = {
  render: () => {
    const generateLargeDataset = (count: number): Person[] => {
      const statuses = ['active', 'inactive', 'pending'];
      const roles = ['admin', 'user', 'guest'];
      const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
      
      return Array.from({ length: count }, (_, i) => ({
        id: `row-${i}`,
        name: `${names[i % names.length]} ${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 40),
        status: statuses[i % statuses.length],
        role: roles[i % roles.length],
        active: i % 2 === 0,
        startDate: new Date(2023, 0, 1 + (i % 365)).toISOString().split('T')[0],
        website: `https://user${i}.com`,
        notes: `User ${i} description`,
        skills: ['javascript', 'typescript'],
      }));
    };

    const [data, setData] = React.useState<Person[]>(generateLargeDataset(1000));

    const { table, ...dataGridProps } = useDataGrid({
      data,
      columns,
      onDataChange: setData,
      getRowId: (row) => row.id,
      enableSearch: true,
    });

    return (
      <div className="w-full">
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {data.length} rows with virtualization enabled
        </div>
        <DataGrid table={table} {...dataGridProps} height={600} />
      </div>
    );
  },
};

/**
 * Minimal Data Grid with only text columns.
 */
export const Minimal: Story = {
  render: () => {
    const minimalData = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
    ];

    const minimalColumns: ColumnDef<{ id: string; name: string; email: string }>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        meta: {
          cell: {
            variant: 'short-text',
          },
        },
      },
    ];

    const [data, setData] = React.useState(minimalData);

    const { table, ...dataGridProps } = useDataGrid({
      data,
      columns: minimalColumns,
      onDataChange: setData,
      getRowId: (row) => row.id,
    });

    return (
      <div className="w-full">
        <DataGrid table={table} {...dataGridProps} height={400} />
      </div>
    );
  },
};
