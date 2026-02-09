import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { TreeView, type TreeDataItem } from './tree-view';
import { Folder, FolderOpen, File, FileText, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'Navigation/TreeView',
  component: TreeView,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicData: TreeDataItem[] = [
  {
    id: '1',
    name: 'Item 1',
    children: [
      {
        id: '2',
        name: 'Item 1.1',
        children: [
          {
            id: '3',
            name: 'Item 1.1.1',
          },
          {
            id: '4',
            name: 'Item 1.1.2',
          },
        ],
      },
      {
        id: '5',
        name: 'Item 1.2 (disabled)',
        disabled: true,
      },
    ],
  },
  {
    id: '6',
    name: 'Item 2 (draggable)',
    draggable: true,
  },
];

/**
 * Basic tree view with nested items. Items can be expanded/collapsed by clicking on them.
 * Disabled items cannot be selected or interacted with.
 */
export const Default: Story = {
  render: () => (
    <div className="w-[300px] border rounded-lg p-4">
      <TreeView data={basicData} />
    </div>
  ),
};

const dataWithIcons: TreeDataItem[] = [
  {
    id: '1',
    name: 'Documents',
    icon: Folder,
    openIcon: FolderOpen,
    selectedIcon: FolderOpen,
    children: [
      {
        id: '2',
        name: 'Projects',
        icon: Folder,
        openIcon: FolderOpen,
        selectedIcon: FolderOpen,
        children: [
          {
            id: '3',
            name: 'project-1.pdf',
            icon: FileText,
          },
          {
            id: '4',
            name: 'project-2.pdf',
            icon: FileText,
          },
        ],
      },
      {
        id: '5',
        name: 'Notes',
        icon: Folder,
        openIcon: FolderOpen,
        selectedIcon: FolderOpen,
        children: [
          {
            id: '6',
            name: 'note-1.txt',
            icon: File,
          },
        ],
      },
    ],
  },
  {
    id: '7',
    name: 'Images',
    icon: Folder,
    openIcon: FolderOpen,
    selectedIcon: FolderOpen,
  },
];

/**
 * Tree view with custom icons for folders and files. Icons change based on selection and open state.
 * - `icon`: Default icon shown when item is closed and not selected
 * - `openIcon`: Icon shown when folder is open
 * - `selectedIcon`: Icon shown when item is selected
 */
export const WithIcons: Story = {
  render: () => (
    <div className="w-[300px] border rounded-lg p-4">
      <TreeView data={dataWithIcons} />
    </div>
  ),
};

const dataWithSelection: TreeDataItem[] = [
  {
    id: '1',
    name: 'Home',
    children: [
      {
        id: '2',
        name: 'Documents',
        children: [
          {
            id: '3',
            name: 'File 1',
          },
          {
            id: '4',
            name: 'File 2',
          },
        ],
      },
      {
        id: '5',
        name: 'Downloads',
      },
    ],
  },
];

/**
 * Tree view with initial selection and selection change handler.
 * The selected item is highlighted, and you can see the selection change in the console.
 */
export const WithSelection: Story = {
  render: () => {
    const [selectedItem, setSelectedItem] = React.useState<TreeDataItem | undefined>();

    return (
      <div className="w-[300px] space-y-4">
        <div className="border rounded-lg p-4">
          <TreeView
            data={dataWithSelection}
            initialSelectedItemId="3"
            onSelectChange={(item) => {
              setSelectedItem(item);
              console.log('Selected:', item);
            }}
          />
        </div>
        {selectedItem && (
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium">{selectedItem.name}</span>
          </div>
        )}
      </div>
    );
  },
};

/**
 * Tree view with all nodes expanded by default using the `expandAll` prop.
 */
export const ExpandAll: Story = {
  render: () => (
    <div className="w-[300px] border rounded-lg p-4">
      <TreeView data={dataWithIcons} expandAll />
    </div>
  ),
};

const dataWithActions: TreeDataItem[] = [
  {
    id: '1',
    name: 'Document 1',
    icon: FileText,
    actions: (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ),
    children: [
      {
        id: '2',
        name: 'Section 1',
        icon: File,
        actions: (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        ),
      },
      {
        id: '3',
        name: 'Section 2',
        icon: File,
        actions: (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        ),
      },
    ],
  },
  {
    id: '4',
    name: 'Document 2',
    icon: FileText,
    actions: (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ),
  },
];

/**
 * Tree view with action buttons that appear on hover or when an item is selected.
 * Actions are positioned on the right side of each item.
 */
export const WithActions: Story = {
  render: () => (
    <div className="w-[300px] border rounded-lg p-4">
      <TreeView data={dataWithActions} />
    </div>
  ),
};

const dataWithDragDrop: TreeDataItem[] = [
  {
    id: '1',
    name: 'Folder 1 (droppable)',
    icon: Folder,
    openIcon: FolderOpen,
    droppable: true,
    children: [
      {
        id: '2',
        name: 'Item 1.1 (draggable)',
        icon: File,
        draggable: true,
      },
      {
        id: '3',
        name: 'Item 1.2 (draggable)',
        icon: File,
        draggable: true,
      },
    ],
  },
  {
    id: '4',
    name: 'Folder 2 (droppable)',
    icon: Folder,
    openIcon: FolderOpen,
    droppable: true,
    children: [
      {
        id: '5',
        name: 'Item 2.1',
        icon: File,
      },
    ],
  },
  {
    id: '6',
    name: 'Standalone Item (draggable)',
    icon: File,
    draggable: true,
  },
];

/**
 * Tree view with drag and drop functionality. Draggable items can be dragged and dropped onto droppable items.
 * The `onDocumentDrag` callback is triggered when an item is dropped.
 */
export const WithDragAndDrop: Story = {
  render: () => {
    const handleDrag = (sourceItem: TreeDataItem, targetItem: TreeDataItem) => {
      console.log('Dragged:', sourceItem.name, 'to', targetItem.name);
      alert(`Dragged "${sourceItem.name}" to "${targetItem.name}"`);
    };

    return (
      <div className="w-[300px] border rounded-lg p-4">
        <TreeView data={dataWithDragDrop} onDocumentDrag={handleDrag} />
      </div>
    );
  },
};

const dataWithCustomRender: TreeDataItem[] = [
  {
    id: '1',
    name: 'Custom Item 1',
    children: [
      {
        id: '2',
        name: 'Custom Item 1.1',
      },
      {
        id: '3',
        name: 'Custom Item 1.2',
      },
    ],
  },
  {
    id: '4',
    name: 'Custom Item 2',
  },
];

/**
 * Tree view with custom item rendering using the `renderItem` prop.
 * This allows complete control over how each item is displayed.
 */
export const WithCustomRender: Story = {
  render: () => (
    <div className="w-[300px] border rounded-lg p-4">
      <TreeView
        data={dataWithCustomRender}
        renderItem={({ item, isSelected, isLeaf, level }) => (
          <div className="flex items-center gap-2 w-full">
            <div
              className="flex-1 text-sm"
              style={{ paddingLeft: `${level * 8}px` }}
            >
              <span className={isSelected ? 'font-semibold' : ''}>
                {item.name}
              </span>
              {!isLeaf && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (has children)
                </span>
              )}
            </div>
          </div>
        )}
      />
    </div>
  ),
};

const dataWithDefaultIcons: TreeDataItem[] = [
  {
    id: '1',
    name: 'Folder without icon',
    children: [
      {
        id: '2',
        name: 'File without icon',
      },
    ],
  },
];

/**
 * Tree view with default icons for nodes and leaves when items don't have their own icons.
 * Use `defaultNodeIcon` for folders and `defaultLeafIcon` for files.
 */
export const WithDefaultIcons: Story = {
  render: () => (
    <div className="w-[300px] border rounded-lg p-4">
      <TreeView
        data={dataWithDefaultIcons}
        defaultNodeIcon={Folder}
        defaultLeafIcon={File}
      />
    </div>
  ),
};
