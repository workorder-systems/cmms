import { z } from 'zod';
import type { SdkOperationDef } from '../types.js';
import { ann } from '../annotations.js';
import { emptyArgs, uuid } from '../zod-common.js';

const receiveLine = z.object({
  purchase_order_line_id: uuid,
  quantity_received: z.number(),
  to_inventory_location_id: uuid.nullable().optional(),
});

const poLine = z.object({
  part_id: uuid,
  quantity_ordered: z.number(),
  unit_price: z.number().nullable().optional(),
});

export const partsInventoryOperations: Record<string, SdkOperationDef> = {
  'parts_inventory.list_parts_with_stock': {
    description: 'Parts with stock aggregates.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listPartsWithStock();
    },
  },
  'parts_inventory.get_part_with_stock_by_id': {
    description: 'Get part with stock by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.partsInventory.getPartWithStockById(id);
    },
  },
  'parts_inventory.list_stock_by_location': {
    description: 'Stock by location.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listStockByLocation();
    },
  },
  'parts_inventory.list_parts': {
    description: 'List parts catalog.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listParts();
    },
  },
  'parts_inventory.get_part_by_id': {
    description: 'Get part by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.partsInventory.getPartById(id);
    },
  },
  'parts_inventory.list_suppliers': {
    description: 'List suppliers.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listSuppliers();
    },
  },
  'parts_inventory.get_supplier_by_id': {
    description: 'Get supplier by id.',
    annotations: ann.read,
    inputSchema: z.object({ id: uuid }),
    async invoke(client, args) {
      const { id } = z.object({ id: uuid }).parse(args);
      return client.partsInventory.getSupplierById(id);
    },
  },
  'parts_inventory.list_inventory_locations': {
    description: 'List inventory locations.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listInventoryLocations();
    },
  },
  'parts_inventory.list_stock_levels': {
    description: 'List stock levels.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listStockLevels();
    },
  },
  'parts_inventory.list_part_reservations': {
    description: 'List part reservations.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listPartReservations();
    },
  },
  'parts_inventory.list_part_reservations_by_work_order_id': {
    description: 'List part reservations for a work order.',
    annotations: ann.read,
    inputSchema: z.object({ work_order_id: uuid }),
    async invoke(client, args) {
      const { work_order_id } = z.object({ work_order_id: uuid }).parse(args);
      return client.partsInventory.listPartReservationsByWorkOrderId(work_order_id);
    },
  },
  'parts_inventory.list_part_usage': {
    description: 'List part usage.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listPartUsage();
    },
  },
  'parts_inventory.list_part_usage_by_work_order_id': {
    description: 'List part usage for a work order.',
    annotations: ann.read,
    inputSchema: z.object({ work_order_id: uuid }),
    async invoke(client, args) {
      const { work_order_id } = z.object({ work_order_id: uuid }).parse(args);
      return client.partsInventory.listPartUsageByWorkOrderId(work_order_id);
    },
  },
  'parts_inventory.list_open_requisitions': {
    description: 'Open purchase requisitions.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listOpenRequisitions();
    },
  },
  'parts_inventory.create_purchase_requisition': {
    description: 'Create draft purchase requisition.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      due_date: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          due_date: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.createPurchaseRequisition({
        tenantId: p.tenant_id,
        dueDate: p.due_date ?? null,
        notes: p.notes ?? null,
      });
    },
  },
  'parts_inventory.add_purchase_requisition_line': {
    description: 'Add line to draft requisition.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      purchase_requisition_id: uuid,
      part_id: uuid,
      quantity: z.number(),
      estimated_unit_cost: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          purchase_requisition_id: uuid,
          part_id: uuid,
          quantity: z.number(),
          estimated_unit_cost: z.number().nullable().optional(),
          notes: z.string().nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.addPurchaseRequisitionLine({
        tenantId: p.tenant_id,
        purchaseRequisitionId: p.purchase_requisition_id,
        partId: p.part_id,
        quantity: p.quantity,
        estimatedUnitCost: p.estimated_unit_cost ?? null,
        notes: p.notes ?? null,
      });
    },
  },
  'parts_inventory.update_purchase_requisition_line': {
    description: 'Update requisition line.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      line_id: uuid,
      quantity: z.number().nullable().optional(),
      estimated_unit_cost: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          line_id: uuid,
          quantity: z.number().nullable().optional(),
          estimated_unit_cost: z.number().nullable().optional(),
          notes: z.string().nullable().optional(),
        })
        .parse(args);
      await client.partsInventory.updatePurchaseRequisitionLine({
        tenantId: p.tenant_id,
        lineId: p.line_id,
        quantity: p.quantity ?? null,
        estimatedUnitCost: p.estimated_unit_cost ?? null,
        notes: p.notes ?? null,
      });
      return { ok: true };
    },
  },
  'parts_inventory.remove_purchase_requisition_line': {
    description: 'Remove requisition line.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      line_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, line_id: uuid }).parse(args);
      await client.partsInventory.removePurchaseRequisitionLine(p.tenant_id, p.line_id);
      return { ok: true };
    },
  },
  'parts_inventory.delete_purchase_requisition': {
    description: 'Delete draft requisition.',
    annotations: ann.destructive,
    inputSchema: z.object({
      tenant_id: uuid,
      purchase_requisition_id: uuid,
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, purchase_requisition_id: uuid }).parse(args);
      await client.partsInventory.deletePurchaseRequisition(p.tenant_id, p.purchase_requisition_id);
      return { ok: true };
    },
  },
  'parts_inventory.list_open_purchase_orders': {
    description: 'Open purchase orders.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listOpenPurchaseOrders();
    },
  },
  'parts_inventory.list_purchase_order_receipt_status': {
    description: 'PO receipt status.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listPurchaseOrderReceiptStatus();
    },
  },
  'parts_inventory.list_purchase_order_receipt_status_by_po_id': {
    description: 'Receipt status for one PO.',
    annotations: ann.read,
    inputSchema: z.object({ po_id: uuid }),
    async invoke(client, args) {
      const { po_id } = z.object({ po_id: uuid }).parse(args);
      return client.partsInventory.listPurchaseOrderReceiptStatusByPoId(po_id);
    },
  },
  'parts_inventory.reserve_parts': {
    description: 'Reserve parts for a work order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      part_id: uuid,
      quantity: z.number(),
      inventory_location_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          part_id: uuid,
          quantity: z.number(),
          inventory_location_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.reserveParts({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        partId: p.part_id,
        quantity: p.quantity,
        inventoryLocationId: p.inventory_location_id ?? null,
      });
    },
  },
  'parts_inventory.issue_parts_to_work_order': {
    description: 'Issue parts to work order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      work_order_id: uuid,
      part_id: uuid,
      quantity: z.number(),
      inventory_location_id: uuid.nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          work_order_id: uuid,
          part_id: uuid,
          quantity: z.number(),
          inventory_location_id: uuid.nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.issuePartsToWorkOrder({
        tenantId: p.tenant_id,
        workOrderId: p.work_order_id,
        partId: p.part_id,
        quantity: p.quantity,
        inventoryLocationId: p.inventory_location_id ?? null,
      });
    },
  },
  'parts_inventory.receive_purchase_order': {
    description: 'Receive a purchase order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      po_id: uuid,
      lines: z.array(receiveLine),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, po_id: uuid, lines: z.array(receiveLine) }).parse(args);
      return client.partsInventory.receivePurchaseOrder({
        tenantId: p.tenant_id,
        poId: p.po_id,
        lines: p.lines,
      });
    },
  },
  'parts_inventory.create_purchase_order': {
    description: 'Create a purchase order.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      supplier_id: uuid,
      order_number: z.string().min(1),
      order_date: z.string().nullable().optional(),
      expected_delivery_date: z.string().nullable().optional(),
      external_id: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      lines: z.array(poLine).optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          supplier_id: uuid,
          order_number: z.string(),
          order_date: z.string().nullable().optional(),
          expected_delivery_date: z.string().nullable().optional(),
          external_id: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
          lines: z.array(poLine).optional(),
        })
        .parse(args);
      return client.partsInventory.createPurchaseOrder({
        tenantId: p.tenant_id,
        supplierId: p.supplier_id,
        orderNumber: p.order_number,
        orderDate: p.order_date ?? null,
        expectedDeliveryDate: p.expected_delivery_date ?? null,
        externalId: p.external_id ?? null,
        notes: p.notes ?? null,
        lines: p.lines,
      });
    },
  },
  'parts_inventory.create_part': {
    description: 'Create a part.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      part_number: z.string().min(1),
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      unit: z.string().optional(),
      preferred_supplier_id: uuid.nullable().optional(),
      external_id: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      reorder_point: z.number().nullable().optional(),
      min_quantity: z.number().nullable().optional(),
      max_quantity: z.number().nullable().optional(),
      lead_time_days: z.number().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          part_number: z.string(),
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          unit: z.string().optional(),
          preferred_supplier_id: uuid.nullable().optional(),
          external_id: z.string().nullable().optional(),
          barcode: z.string().nullable().optional(),
          reorder_point: z.number().nullable().optional(),
          min_quantity: z.number().nullable().optional(),
          max_quantity: z.number().nullable().optional(),
          lead_time_days: z.number().nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.createPart({
        tenantId: p.tenant_id,
        partNumber: p.part_number,
        name: p.name ?? null,
        description: p.description ?? null,
        unit: p.unit,
        preferredSupplierId: p.preferred_supplier_id ?? null,
        externalId: p.external_id ?? null,
        barcode: p.barcode ?? null,
        reorderPoint: p.reorder_point ?? null,
        minQuantity: p.min_quantity ?? null,
        maxQuantity: p.max_quantity ?? null,
        leadTimeDays: p.lead_time_days ?? null,
      });
    },
  },
  'parts_inventory.update_part': {
    description: 'Update a part.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      part_id: uuid,
      part_number: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      unit: z.string().nullable().optional(),
      preferred_supplier_id: uuid.nullable().optional(),
      external_id: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      reorder_point: z.number().nullable().optional(),
      min_quantity: z.number().nullable().optional(),
      max_quantity: z.number().nullable().optional(),
      lead_time_days: z.number().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          part_id: uuid,
          part_number: z.string().nullable().optional(),
          name: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          unit: z.string().nullable().optional(),
          preferred_supplier_id: uuid.nullable().optional(),
          external_id: z.string().nullable().optional(),
          barcode: z.string().nullable().optional(),
          reorder_point: z.number().nullable().optional(),
          min_quantity: z.number().nullable().optional(),
          max_quantity: z.number().nullable().optional(),
          lead_time_days: z.number().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
        })
        .parse(args);
      await client.partsInventory.updatePart({
        tenantId: p.tenant_id,
        partId: p.part_id,
        partNumber: p.part_number ?? null,
        name: p.name ?? null,
        description: p.description ?? null,
        unit: p.unit ?? null,
        preferredSupplierId: p.preferred_supplier_id ?? null,
        externalId: p.external_id ?? null,
        barcode: p.barcode,
        reorderPoint: p.reorder_point ?? null,
        minQuantity: p.min_quantity ?? null,
        maxQuantity: p.max_quantity ?? null,
        leadTimeDays: p.lead_time_days ?? null,
        isActive: p.is_active ?? null,
      });
      return { ok: true };
    },
  },
  'parts_inventory.resolve_part_by_scan_code': {
    description: 'Resolve scan code to part id.',
    annotations: ann.read,
    inputSchema: z.object({
      tenant_id: uuid,
      code: z.string().min(1),
    }),
    async invoke(client, args) {
      const p = z.object({ tenant_id: uuid, code: z.string() }).parse(args);
      return client.partsInventory.resolvePartByScanCode(p.tenant_id, p.code);
    },
  },
  'parts_inventory.create_supplier': {
    description: 'Create a supplier.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      name: z.string().min(1),
      code: z.string().nullable().optional(),
      external_id: z.string().nullable().optional(),
      contact_name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      address_line: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          name: z.string(),
          code: z.string().nullable().optional(),
          external_id: z.string().nullable().optional(),
          contact_name: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          address_line: z.string().nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.createSupplier({
        tenantId: p.tenant_id,
        name: p.name,
        code: p.code ?? null,
        externalId: p.external_id ?? null,
        contactName: p.contact_name ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        addressLine: p.address_line ?? null,
      });
    },
  },
  'parts_inventory.update_supplier': {
    description: 'Update a supplier.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      supplier_id: uuid,
      name: z.string().nullable().optional(),
      code: z.string().nullable().optional(),
      external_id: z.string().nullable().optional(),
      contact_name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      address_line: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          supplier_id: uuid,
          name: z.string().nullable().optional(),
          code: z.string().nullable().optional(),
          external_id: z.string().nullable().optional(),
          contact_name: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          address_line: z.string().nullable().optional(),
        })
        .parse(args);
      await client.partsInventory.updateSupplier({
        tenantId: p.tenant_id,
        supplierId: p.supplier_id,
        name: p.name ?? null,
        code: p.code ?? null,
        externalId: p.external_id ?? null,
        contactName: p.contact_name ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        addressLine: p.address_line ?? null,
      });
      return { ok: true };
    },
  },
  'parts_inventory.list_supplier_contracts': {
    description: 'List supplier contracts.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listSupplierContracts();
    },
  },
  'parts_inventory.list_supplier_contract_rates': {
    description: 'List contract rates; optional contract_id filter.',
    annotations: ann.read,
    inputSchema: z.object({ contract_id: uuid.optional() }),
    async invoke(client, args) {
      const { contract_id } = z.object({ contract_id: uuid.optional() }).parse(args);
      return client.partsInventory.listSupplierContractRates(contract_id);
    },
  },
  'parts_inventory.list_vendor_spend_by_supplier': {
    description: 'Vendor spend roll-up.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listVendorSpendBySupplier();
    },
  },
  'parts_inventory.list_work_order_counts_by_primary_supplier': {
    description: 'Work order counts by primary supplier.',
    annotations: ann.read,
    inputSchema: emptyArgs,
    async invoke(client) {
      return client.partsInventory.listWorkOrderCountsByPrimarySupplier();
    },
  },
  'parts_inventory.create_supplier_contract': {
    description: 'Create supplier contract.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      supplier_id: uuid,
      effective_start: z.string().min(1),
      effective_end: z.string().nullable().optional(),
      contract_number: z.string().nullable().optional(),
      terms: z.string().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          supplier_id: uuid,
          effective_start: z.string(),
          effective_end: z.string().nullable().optional(),
          contract_number: z.string().nullable().optional(),
          terms: z.string().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.createSupplierContract({
        tenantId: p.tenant_id,
        supplierId: p.supplier_id,
        effectiveStart: p.effective_start,
        effectiveEnd: p.effective_end ?? null,
        contractNumber: p.contract_number ?? null,
        terms: p.terms ?? null,
        isActive: p.is_active ?? null,
      });
    },
  },
  'parts_inventory.update_supplier_contract': {
    description: 'Update supplier contract.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      contract_id: uuid,
      effective_start: z.string().nullable().optional(),
      effective_end: z.string().nullable().optional(),
      contract_number: z.string().nullable().optional(),
      terms: z.string().nullable().optional(),
      is_active: z.boolean().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          contract_id: uuid,
          effective_start: z.string().nullable().optional(),
          effective_end: z.string().nullable().optional(),
          contract_number: z.string().nullable().optional(),
          terms: z.string().nullable().optional(),
          is_active: z.boolean().nullable().optional(),
        })
        .parse(args);
      await client.partsInventory.updateSupplierContract({
        tenantId: p.tenant_id,
        contractId: p.contract_id,
        effectiveStart: p.effective_start ?? null,
        effectiveEnd: p.effective_end ?? null,
        contractNumber: p.contract_number ?? null,
        terms: p.terms ?? null,
        isActive: p.is_active ?? null,
      });
      return { ok: true };
    },
  },
  'parts_inventory.add_supplier_contract_rate': {
    description: 'Add contract rate line.',
    annotations: ann.write,
    inputSchema: z.object({
      tenant_id: uuid,
      contract_id: uuid,
      rate_type: z.string().min(1),
      amount_cents: z.number().int(),
      uom: z.string().nullable().optional(),
    }),
    async invoke(client, args) {
      const p = z
        .object({
          tenant_id: uuid,
          contract_id: uuid,
          rate_type: z.string(),
          amount_cents: z.number().int(),
          uom: z.string().nullable().optional(),
        })
        .parse(args);
      return client.partsInventory.addSupplierContractRate({
        tenantId: p.tenant_id,
        contractId: p.contract_id,
        rateType: p.rate_type,
        amountCents: p.amount_cents,
        uom: p.uom ?? null,
      });
    },
  },
};
