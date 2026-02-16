-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Add constraints and comments for color columns
--
-- Purpose: Document expected format for color fields and enforce valid values
--   so UI (e.g. StatusBadge, PriorityBadge) can use them safely. Color is
--   used for borders and tinted backgrounds; hex format is required for
--   consistent rendering.
-- Affected: cfg.status_catalogs.color, cfg.priority_catalogs.color,
--   cfg.maintenance_type_catalogs.color
-- Constraint: Allow null (no color) or a valid hex string: #RGB or #RRGGBB.
-- Special: Existing rows with invalid color are set to null before adding
--   the check constraint to avoid migration failure.

-- ============================================================================
-- Normalize existing invalid color values (set to null)
-- ============================================================================

-- Only non-null, non-empty values that do not match hex are updated.
-- Pattern: # followed by exactly 3 or 6 hex digits (case-insensitive).
update cfg.status_catalogs
set color = null
where color is not null
  and trim(color) <> ''
  and color !~ '^#[0-9a-fA-F]{3}$'
  and color !~ '^#[0-9a-fA-F]{6}$';

update cfg.priority_catalogs
set color = null
where color is not null
  and trim(color) <> ''
  and color !~ '^#[0-9a-fA-F]{3}$'
  and color !~ '^#[0-9a-fA-F]{6}$';

update cfg.maintenance_type_catalogs
set color = null
where color is not null
  and trim(color) <> ''
  and color !~ '^#[0-9a-fA-F]{3}$'
  and color !~ '^#[0-9a-fA-F]{6}$';

-- ============================================================================
-- Add check constraints for color columns
-- ============================================================================

-- Status catalogs: color must be null or a valid hex color (#RGB or #RRGGBB).
alter table cfg.status_catalogs
add constraint status_catalogs_color_check check (
  color is null
  or (trim(color) <> '' and (color ~ '^#[0-9a-fA-F]{3}$' or color ~ '^#[0-9a-fA-F]{6}$'))
);

comment on constraint status_catalogs_color_check on cfg.status_catalogs is
  'Ensures color is either null (no color) or a valid hex value (#RGB or #RRGGBB) for UI badges and indicators.';

alter table cfg.priority_catalogs
add constraint priority_catalogs_color_check check (
  color is null
  or (trim(color) <> '' and (color ~ '^#[0-9a-fA-F]{3}$' or color ~ '^#[0-9a-fA-F]{6}$'))
);

comment on constraint priority_catalogs_color_check on cfg.priority_catalogs is
  'Ensures color is either null or a valid hex value (#RGB or #RRGGBB) for UI badges.';

alter table cfg.maintenance_type_catalogs
add constraint maintenance_type_catalogs_color_check check (
  color is null
  or (trim(color) <> '' and (color ~ '^#[0-9a-fA-F]{3}$' or color ~ '^#[0-9a-fA-F]{6}$'))
);

comment on constraint maintenance_type_catalogs_color_check on cfg.maintenance_type_catalogs is
  'Ensures color is either null or a valid hex value (#RGB or #RRGGBB) for UI.';

-- ============================================================================
-- Add column comments describing expected format
-- ============================================================================

comment on column cfg.status_catalogs.color is
  'Optional hex color for UI (e.g. status badges). Allowed: null, #RGB (e.g. #f00), or #RRGGBB (e.g. #ff0000). Used for border and background tint in status indicators.';

comment on column cfg.priority_catalogs.color is
  'Optional hex color for UI (e.g. priority badges). Allowed: null, #RGB, or #RRGGBB. Used for border and background tint in priority indicators.';

comment on column cfg.maintenance_type_catalogs.color is
  'Optional hex color for UI. Allowed: null, #RGB, or #RRGGBB. Used for maintenance type indicators.';
