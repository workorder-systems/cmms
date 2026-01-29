-- SPDX-License-Identifier: AGPL-3.0-or-later
/*
  migration: 20260129135000_deletion_policy
  purpose: enforce hard delete policy by ensuring audit coverage for deletions
  affected:
    - app.departments (audit trigger)
  notes:
    - operational tables use hard deletes by default
    - delete operations must be audited in audit.entity_changes
*/

create trigger departments_audit_trigger
  after insert or update or delete on app.departments
  for each row execute function audit.log_entity_change();
