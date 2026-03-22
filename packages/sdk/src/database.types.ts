export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      mv_asset_summary: {
        Row: {
          active_count: number | null
          count: number | null
          first_asset_at: string | null
          inactive_count: number | null
          last_asset_at: string | null
          last_updated_at: string | null
          location_id: string | null
          status: string | null
          tenant_id: string | null
          unassigned_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      mv_location_summary: {
        Row: {
          active_asset_count: number | null
          active_work_order_count: number | null
          asset_count: number | null
          completed_work_order_count: number | null
          last_asset_activity_at: string | null
          last_work_order_activity_at: string | null
          location_id: string | null
          location_name: string | null
          location_type: string | null
          parent_location_id: string | null
          site_id: string | null
          tenant_id: string | null
          work_order_count: number | null
        }
        Relationships: []
      }
      mv_site_summary: {
        Row: {
          active_asset_count: number | null
          active_work_order_count: number | null
          asset_count: number | null
          building_count: number | null
          floor_count: number | null
          location_type: string | null
          room_count: number | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          tenant_id: string | null
          work_order_count: number | null
          zone_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      mv_tenant_overview: {
        Row: {
          active_work_order_count: number | null
          asset_count: number | null
          first_work_order_at: string | null
          last_work_order_at: string | null
          location_count: number | null
          member_count: number | null
          overdue_work_order_count: number | null
          slug: string | null
          tenant_created_at: string | null
          tenant_id: string | null
          tenant_name: string | null
          work_order_count: number | null
        }
        Relationships: []
      }
      mv_work_order_summary: {
        Row: {
          assigned_count: number | null
          avg_completion_hours: number | null
          completed_count: number | null
          count: number | null
          created_last_30_days: number | null
          first_work_order_at: string | null
          last_updated_at: string | null
          last_work_order_at: string | null
          overdue_count: number | null
          priority: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_asset_attachments: {
        Row: {
          asset_id: string | null
          bucket_id: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          document_type_key: string | null
          effective_date: string | null
          file_id: string | null
          filename: string | null
          id: string | null
          is_controlled: boolean | null
          kind: string | null
          label: string | null
          revision_label: string | null
          storage_path: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_asset_costs: {
        Row: {
          asset_id: string | null
          labor_cents: number | null
          parts_cents: number | null
          tenant_id: string | null
          total_cents: number | null
          vendor_cents: number | null
          work_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_asset_lifecycle_alerts: {
        Row: {
          alert_type: string | null
          asset_id: string | null
          days_until: number | null
          reference_date: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      v_asset_meters: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          created_at: string | null
          current_reading: number | null
          decimal_places: number | null
          description: string | null
          id: string | null
          installation_date: string | null
          is_active: boolean | null
          last_reading_date: string | null
          meter_type: string | null
          name: string | null
          reading_direction: string | null
          tenant_id: string | null
          unit: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_meters_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_meters_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_meters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "asset_meters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "asset_meters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "asset_meters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_meters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_assets: {
        Row: {
          asset_number: string | null
          commissioned_at: string | null
          created_at: string | null
          decommissioned_at: string | null
          department_id: string | null
          description: string | null
          end_of_life_estimate: string | null
          id: string | null
          location_id: string | null
          name: string | null
          planned_replacement_date: string | null
          replaced_by_asset_id: string | null
          replacement_of_asset_id: string | null
          service_contract_expires_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          warranty_expires_at: string | null
        }
        Insert: {
          asset_number?: string | null
          commissioned_at?: string | null
          created_at?: string | null
          decommissioned_at?: string | null
          department_id?: string | null
          description?: string | null
          end_of_life_estimate?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          planned_replacement_date?: string | null
          replaced_by_asset_id?: string | null
          replacement_of_asset_id?: string | null
          service_contract_expires_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          warranty_expires_at?: string | null
        }
        Update: {
          asset_number?: string | null
          commissioned_at?: string | null
          created_at?: string | null
          decommissioned_at?: string | null
          department_id?: string | null
          description?: string | null
          end_of_life_estimate?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          planned_replacement_date?: string | null
          replaced_by_asset_id?: string | null
          replacement_of_asset_id?: string | null
          service_contract_expires_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          warranty_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "v_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_replaced_by_asset_id_fkey"
            columns: ["replaced_by_asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_replaced_by_asset_id_fkey"
            columns: ["replaced_by_asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_replacement_of_asset_id_fkey"
            columns: ["replacement_of_asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_replacement_of_asset_id_fkey"
            columns: ["replacement_of_asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_assets_summary: {
        Row: {
          active_count: number | null
          count: number | null
          first_asset_at: string | null
          inactive_count: number | null
          last_asset_at: string | null
          last_updated_at: string | null
          location_id: string | null
          status: string | null
          tenant_id: string | null
          unassigned_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_audit_entity_changes: {
        Row: {
          changed_fields: string[] | null
          created_at: string | null
          id: number | null
          new_data: Json | null
          old_data: Json | null
          operation: string | null
          record_id: string | null
          table_name: string | null
          table_schema: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          changed_fields?: string[] | null
          created_at?: string | null
          id?: number | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id?: string | null
          table_name?: string | null
          table_schema?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          changed_fields?: string[] | null
          created_at?: string | null
          id?: number | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id?: string | null
          table_name?: string | null
          table_schema?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_audit_permission_changes: {
        Row: {
          change_type: string | null
          changed_by: string | null
          created_at: string | null
          id: number | null
          permission_id: string | null
          permission_key: string | null
          role_id: string | null
          role_key: string | null
          target_user_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          change_type?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: number | null
          permission_id?: string | null
          permission_key?: string | null
          role_id?: string | null
          role_key?: string | null
          target_user_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          change_type?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: number | null
          permission_id?: string | null
          permission_key?: string | null
          role_id?: string | null
          role_key?: string | null
          target_user_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_changes_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "v_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_changes_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "v_role_permissions"
            referencedColumns: ["permission_id"]
          },
          {
            foreignKeyName: "permission_changes_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "permission_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "permission_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "permission_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_audit_retention_configs: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          retention_months: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          retention_months?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          retention_months?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_retention_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_retention_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_retention_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_retention_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_retention_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_availability_overrides: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: number | null
          is_available: boolean | null
          override_date: string | null
          reason: string | null
          start_time: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: number | null
          is_available?: boolean | null
          override_date?: string | null
          reason?: string | null
          start_time?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: number | null
          is_available?: boolean | null
          override_date?: string | null
          reason?: string | null
          start_time?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "availability_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "availability_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "availability_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_availability_patterns: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_time: string | null
          id: number | null
          start_time: string | null
          technician_id: string | null
          tenant_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: number | null
          start_time?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: number | null
          start_time?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_patterns_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "availability_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "availability_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "availability_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_certification_catalogs: {
        Row: {
          code: string | null
          created_at: string | null
          display_order: number | null
          expiry_required: boolean | null
          id: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          expiry_required?: boolean | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          expiry_required?: boolean | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "certification_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "certification_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "certification_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_crew_members: {
        Row: {
          created_at: string | null
          crew_id: string | null
          id: number | null
          joined_at: string | null
          left_at: string | null
          role: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crew_id?: string | null
          id?: number | null
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crew_id?: string | null
          id?: number | null
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "crew_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "crew_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "crew_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_crews: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          lead_technician_id: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          lead_technician_id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          lead_technician_id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crews_lead_technician_id_fkey"
            columns: ["lead_technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "crews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "crews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "crews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_dashboard_metrics: {
        Row: {
          active_assets: number | null
          completed_last_30_days: number | null
          mttr_hours: number | null
          open_count: number | null
          overdue_count: number | null
          tenant_id: string | null
          tenant_name: string | null
          total_assets: number | null
          total_locations: number | null
        }
        Insert: {
          active_assets?: never
          completed_last_30_days?: never
          mttr_hours?: never
          open_count?: never
          overdue_count?: never
          tenant_id?: string | null
          tenant_name?: string | null
          total_assets?: never
          total_locations?: never
        }
        Update: {
          active_assets?: never
          completed_last_30_days?: never
          mttr_hours?: never
          open_count?: never
          overdue_count?: never
          tenant_id?: string | null
          tenant_name?: string | null
          total_assets?: never
          total_locations?: never
        }
        Relationships: []
      }
      v_dashboard_mttr_metrics: {
        Row: {
          avg_labor_minutes: number | null
          completed_count: number | null
          max_completion_hours: number | null
          median_completion_hours: number | null
          min_completion_hours: number | null
          mttr_days: number | null
          mttr_hours: number | null
          tenant_id: string | null
          total_labor_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_dashboard_open_work_orders: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          location_id: string | null
          maintenance_type: string | null
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          total_labor_minutes: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_dashboard_overdue_work_orders: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          created_at: string | null
          days_overdue: number | null
          description: string | null
          due_date: string | null
          id: string | null
          location_id: string | null
          maintenance_type: string | null
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          total_labor_minutes: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_dashboard_work_orders_by_maintenance_type: {
        Row: {
          avg_completion_hours: number | null
          avg_labor_minutes: number | null
          category: string | null
          completed_count: number | null
          count: number | null
          maintenance_type: string | null
          open_count: number | null
          overdue_count: number | null
          total_labor_minutes: number | null
        }
        Relationships: []
      }
      v_dashboard_work_orders_by_status: {
        Row: {
          assigned_count: number | null
          avg_completion_hours: number | null
          count: number | null
          first_created_at: string | null
          last_created_at: string | null
          overdue_count: number | null
          status: string | null
        }
        Relationships: []
      }
      v_department_costs: {
        Row: {
          department_id: string | null
          labor_cents: number | null
          parts_cents: number | null
          tenant_id: string | null
          total_cents: number | null
          vendor_cents: number | null
          work_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "v_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_departments: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_due_pms: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          completion_count: number | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          last_completed_at: string | null
          next_due_date: string | null
          template_id: string | null
          template_name: string | null
          tenant_id: string | null
          title: string | null
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pm_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_entity_attachments: {
        Row: {
          bucket_id: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          document_type_key: string | null
          effective_date: string | null
          entity_id: string | null
          entity_type: string | null
          file_id: string | null
          filename: string | null
          id: string | null
          is_controlled: boolean | null
          kind: string | null
          label: string | null
          revision_label: string | null
          storage_path: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_incident_actions: {
        Row: {
          action_type: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          incident_id: string | null
          incident_severity: string | null
          incident_title: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "v_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "incident_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "incident_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "incident_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_incidents: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          location_id: string | null
          location_name: string | null
          metadata: Json | null
          occurred_at: string | null
          reported_at: string | null
          reported_by: string | null
          reported_by_name: string | null
          severity: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          work_order_id: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inspection_run_items: {
        Row: {
          created_at: string | null
          id: string | null
          inspection_run_id: string | null
          notes: string | null
          result: string | null
          template_item_description: string | null
          template_item_id: string | null
          template_item_required: boolean | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_run_items_inspection_run_id_fkey"
            columns: ["inspection_run_id"]
            isOneToOne: false
            referencedRelation: "v_inspection_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_run_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "v_inspection_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_run_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_run_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_run_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_run_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_run_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_inspection_runs: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          conducted_by: string | null
          conducted_by_name: string | null
          created_at: string | null
          id: string | null
          inspection_schedule_id: string | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          template_id: string | null
          template_name: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_id: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_runs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_inspection_schedule_id_fkey"
            columns: ["inspection_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_inspection_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inspection_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inspection_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inspection_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_runs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_runs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "inspection_runs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "inspection_runs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inspection_schedules: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          location_id: string | null
          location_name: string | null
          next_due_at: string | null
          template_id: string | null
          template_name: string | null
          tenant_id: string | null
          title: string | null
          trigger_config: Json | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inspection_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inspection_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inspection_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_inspection_template_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string | null
          required: boolean | null
          template_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_inspection_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_system: boolean | null
          item_count: number | null
          name: string | null
          tenant_id: string | null
          trigger_config: Json | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system?: boolean | null
          item_count?: never
          name?: string | null
          tenant_id?: string | null
          trigger_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system?: boolean | null
          item_count?: never
          name?: string | null
          tenant_id?: string | null
          trigger_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_inventory_locations: {
        Row: {
          code: string | null
          created_at: string | null
          id: string | null
          location_id: string | null
          name: string | null
          parent_id: string | null
          tenant_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          parent_id?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          parent_id?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inventory_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inventory_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "inventory_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_location_attachments: {
        Row: {
          bucket_id: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          document_type_key: string | null
          effective_date: string | null
          file_id: string | null
          filename: string | null
          id: string | null
          is_controlled: boolean | null
          kind: string | null
          label: string | null
          location_id: string | null
          revision_label: string | null
          storage_path: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_location_costs: {
        Row: {
          labor_cents: number | null
          location_id: string | null
          parts_cents: number | null
          tenant_id: string | null
          total_cents: number | null
          vendor_cents: number | null
          work_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_location_hierarchy: {
        Row: {
          address_line: string | null
          code: string | null
          depth: number | null
          description: string | null
          external_id: string | null
          id: string | null
          location_type: string | null
          name: string | null
          parent_location_id: string | null
          path_ids: string[] | null
          path_names: string[] | null
          tenant_id: string | null
        }
        Relationships: []
      }
      v_locations: {
        Row: {
          address_line: string | null
          code: string | null
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string | null
          latitude: number | null
          location_type: string | null
          longitude: number | null
          name: string | null
          parent_location_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          address_line?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name?: string | null
          parent_location_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name?: string | null
          parent_location_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_locations_summary: {
        Row: {
          active_asset_count: number | null
          active_work_order_count: number | null
          asset_count: number | null
          completed_work_order_count: number | null
          last_asset_activity_at: string | null
          last_work_order_activity_at: string | null
          location_id: string | null
          location_name: string | null
          location_type: string | null
          parent_location_id: string | null
          site_id: string | null
          tenant_id: string | null
          work_order_count: number | null
        }
        Relationships: []
      }
      v_maintenance_type_catalogs: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          entity_type: string | null
          icon: string | null
          id: string | null
          is_system: boolean | null
          key: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          entity_type?: string | null
          icon?: string | null
          id?: string | null
          is_system?: boolean | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          entity_type?: string | null
          icon?: string | null
          id?: string | null
          is_system?: boolean | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_type_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "maintenance_type_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "maintenance_type_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "maintenance_type_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_type_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_map_zones: {
        Row: {
          created_at: string | null
          geometry: Json | null
          id: string | null
          location_id: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          geometry?: Json | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          geometry?: Json | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "map_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "map_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "map_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "map_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "map_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "map_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_meter_readings: {
        Row: {
          asset_name: string | null
          created_at: string | null
          id: string | null
          meter_id: string | null
          meter_name: string | null
          notes: string | null
          reading_date: string | null
          reading_type: string | null
          reading_value: number | null
          recorded_by: string | null
          recorded_by_name: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "v_asset_meters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "meter_readings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "meter_readings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "meter_readings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_mobile_assets: {
        Row: {
          asset_number: string | null
          id: string | null
          location_id: string | null
          name: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_number?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_number?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_mobile_locations: {
        Row: {
          id: string | null
          name: string | null
          parent_location_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          parent_location_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          parent_location_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_mobile_work_order_attachments: {
        Row: {
          created_at: string | null
          file_id: string | null
          id: string | null
          kind: string | null
          label: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_id?: string | null
          id?: string | null
          kind?: string | null
          label?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: string | null
          id?: string | null
          kind?: string | null
          label?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_mobile_work_order_check_ins: {
        Row: {
          checked_in_at: string | null
          created_at: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          tenant_id: string | null
          user_id: string | null
          work_order_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          tenant_id?: string | null
          user_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          tenant_id?: string | null
          user_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_check_ins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_check_ins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_check_ins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_check_ins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_check_ins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_check_ins_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_check_ins_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_check_ins_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_check_ins_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_check_ins_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_check_ins_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_check_ins_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_mobile_work_order_notes: {
        Row: {
          body: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          tenant_id: string | null
          work_order_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_mobile_work_order_time_entries: {
        Row: {
          created_at: string | null
          description: string | null
          entry_date: string | null
          id: string | null
          latitude: number | null
          logged_at: string | null
          longitude: number | null
          minutes: number | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entry_date?: string | null
          id?: string | null
          latitude?: number | null
          logged_at?: string | null
          longitude?: number | null
          minutes?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entry_date?: string | null
          id?: string | null
          latitude?: number | null
          logged_at?: string | null
          longitude?: number | null
          minutes?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_mobile_work_orders: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          completed_at: string | null
          due_date: string | null
          id: string | null
          location_id: string | null
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          due_date?: string | null
          id?: string | null
          location_id?: string | null
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          due_date?: string | null
          id?: string | null
          location_id?: string | null
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_my_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_key: string | null
          id: string | null
          payload: Json | null
          read_at: string | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string | null
          payload?: Json | null
          read_at?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string | null
          payload?: Json | null
          read_at?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_my_work_order_requests: {
        Row: {
          asset_id: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          location_id: string | null
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          location_id?: string | null
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          location_id?: string | null
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_open_purchase_orders: {
        Row: {
          created_at: string | null
          expected_delivery_date: string | null
          external_id: string | null
          external_invoice_id: string | null
          id: string | null
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          status: string | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_open_requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          notes: string | null
          requested_at: string | null
          requested_by: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          notes?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          notes?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_requisitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_requisitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_requisitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_overdue_pms: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          completion_count: number | null
          created_at: string | null
          days_overdue: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          last_completed_at: string | null
          next_due_date: string | null
          template_id: string | null
          template_name: string | null
          tenant_id: string | null
          title: string | null
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pm_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_part_reservations: {
        Row: {
          created_at: string | null
          id: string | null
          inventory_location_id: string | null
          part_id: string | null
          quantity: number | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          inventory_location_id?: string | null
          part_id?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          inventory_location_id?: string | null
          part_id?: string | null
          quantity?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_reservations_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "part_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "part_reservations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_part_usage: {
        Row: {
          created_at: string | null
          id: string | null
          inventory_location_id: string | null
          part_id: string | null
          quantity_used: number | null
          tenant_id: string | null
          used_at: string | null
          used_by: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          inventory_location_id?: string | null
          part_id?: string | null
          quantity_used?: number | null
          tenant_id?: string | null
          used_at?: string | null
          used_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          inventory_location_id?: string | null
          part_id?: string | null
          quantity_used?: number | null
          tenant_id?: string | null
          used_at?: string | null
          used_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_usage_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "part_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "part_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "part_usage_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_parts: {
        Row: {
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string | null
          is_active: boolean | null
          lead_time_days: number | null
          max_quantity: number | null
          min_quantity: number | null
          name: string | null
          part_number: string | null
          preferred_supplier_id: string | null
          reorder_point: number | null
          tenant_id: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string | null
          is_active?: boolean | null
          lead_time_days?: number | null
          max_quantity?: number | null
          min_quantity?: number | null
          name?: string | null
          part_number?: string | null
          preferred_supplier_id?: string | null
          reorder_point?: number | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string | null
          is_active?: boolean | null
          lead_time_days?: number | null
          max_quantity?: number | null
          min_quantity?: number | null
          name?: string | null
          part_number?: string | null
          preferred_supplier_id?: string | null
          reorder_point?: number | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_parts_with_stock: {
        Row: {
          available: number | null
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string | null
          is_active: boolean | null
          lead_time_days: number | null
          max_quantity: number | null
          min_quantity: number | null
          name: string | null
          part_number: string | null
          preferred_supplier_id: string | null
          reorder_point: number | null
          tenant_id: string | null
          total_on_hand: number | null
          total_reserved: number | null
          unit: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_permissions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          key: string | null
          name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          key?: string | null
          name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          key?: string | null
          name?: string | null
        }
        Relationships: []
      }
      v_plugin_delivery_queue_recent: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_type: string | null
          id: string | null
          last_error: string | null
          plugin_installation_id: string | null
          plugin_key: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plugin_delivery_queue_plugin_installation_id_fkey"
            columns: ["plugin_installation_id"]
            isOneToOne: false
            referencedRelation: "v_plugin_installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_delivery_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_delivery_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_delivery_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_delivery_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_delivery_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_plugin_installations: {
        Row: {
          config: Json | null
          id: string | null
          installed_at: string | null
          installed_by: string | null
          is_integration: boolean | null
          plugin_id: string | null
          plugin_key: string | null
          plugin_name: string | null
          secret_ref: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plugin_installations_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "v_plugins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_plugin_webhook_subscriptions: {
        Row: {
          changed_fields_allowlist: string[] | null
          created_at: string | null
          id: string | null
          include_payload: boolean | null
          operations: string[] | null
          plugin_installation_id: string | null
          plugin_key: string | null
          table_name: string | null
          table_schema: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_installations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "plugin_webhook_subscriptions_plugin_installation_id_fkey"
            columns: ["plugin_installation_id"]
            isOneToOne: false
            referencedRelation: "v_plugin_installations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_plugins: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_integration: boolean | null
          key: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_integration?: boolean | null
          key?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_integration?: boolean | null
          key?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_pm_history: {
        Row: {
          actual_hours: number | null
          completed_by: string | null
          completed_by_name: string | null
          completed_date: string | null
          cost: number | null
          created_at: string | null
          id: string | null
          notes: string | null
          pm_schedule_id: string | null
          pm_title: string | null
          scheduled_date: string | null
          tenant_id: string | null
          work_order_id: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_history_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_due_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_pm_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "pm_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "pm_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pm_schedules: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          auto_generate: boolean | null
          completion_count: number | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_overdue: boolean | null
          last_completed_at: string | null
          last_work_order_id: string | null
          next_due_date: string | null
          parent_pm_id: string | null
          template_id: string | null
          template_name: string | null
          tenant_id: string | null
          title: string | null
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
          wo_description: string | null
          wo_estimated_hours: number | null
          wo_priority: string | null
          wo_priority_entity_type: string | null
          wo_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_last_work_order_id_fkey"
            columns: ["last_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_last_work_order_id_fkey"
            columns: ["last_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_last_work_order_id_fkey"
            columns: ["last_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_last_work_order_id_fkey"
            columns: ["last_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_last_work_order_id_fkey"
            columns: ["last_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "pm_schedules_last_work_order_id_fkey"
            columns: ["last_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "pm_schedules_last_work_order_id_fkey"
            columns: ["last_work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_parent_pm_id_fkey"
            columns: ["parent_pm_id"]
            isOneToOne: false
            referencedRelation: "v_due_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_parent_pm_id_fkey"
            columns: ["parent_pm_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_parent_pm_id_fkey"
            columns: ["parent_pm_id"]
            isOneToOne: false
            referencedRelation: "v_pm_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_parent_pm_id_fkey"
            columns: ["parent_pm_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pm_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_wo_priority_fk"
            columns: ["tenant_id", "wo_priority_entity_type", "wo_priority"]
            isOneToOne: false
            referencedRelation: "v_priority_catalogs"
            referencedColumns: ["tenant_id", "entity_type", "key"]
          },
        ]
      }
      v_pm_template_checklist_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string | null
          required: boolean | null
          template_id: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_template_checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pm_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_pm_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_system: boolean | null
          name: string | null
          tenant_id: string | null
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
          wo_description: string | null
          wo_estimated_hours: number | null
          wo_priority: string | null
          wo_priority_entity_type: string | null
          wo_title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system?: boolean | null
          name?: string | null
          tenant_id?: string | null
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          wo_description?: string | null
          wo_estimated_hours?: number | null
          wo_priority?: string | null
          wo_priority_entity_type?: string | null
          wo_title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system?: boolean | null
          name?: string | null
          tenant_id?: string | null
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          wo_description?: string | null
          wo_estimated_hours?: number | null
          wo_priority?: string | null
          wo_priority_entity_type?: string | null
          wo_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_templates_wo_priority_fk"
            columns: ["tenant_id", "wo_priority_entity_type", "wo_priority"]
            isOneToOne: false
            referencedRelation: "v_priority_catalogs"
            referencedColumns: ["tenant_id", "entity_type", "key"]
          },
        ]
      }
      v_portfolio_overview: {
        Row: {
          active_work_order_count: number | null
          asset_count: number | null
          building_count: number | null
          first_work_order_at: string | null
          floor_count: number | null
          last_work_order_at: string | null
          location_count: number | null
          member_count: number | null
          overdue_work_order_count: number | null
          room_count: number | null
          site_active_asset_count: number | null
          site_active_work_order_count: number | null
          site_asset_count: number | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          site_work_order_count: number | null
          slug: string | null
          tenant_created_at: string | null
          tenant_id: string | null
          tenant_name: string | null
          work_order_count: number | null
          zone_count: number | null
        }
        Relationships: []
      }
      v_priority_catalogs: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          entity_type: string | null
          id: string | null
          key: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          entity_type?: string | null
          id?: string | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          entity_type?: string | null
          id?: string | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "priority_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "priority_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "priority_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "priority_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_project_costs: {
        Row: {
          labor_cents: number | null
          parts_cents: number | null
          project_id: string | null
          tenant_id: string | null
          total_cents: number | null
          vendor_cents: number | null
          work_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_projects: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_purchase_order_receipt_status: {
        Row: {
          order_number: string | null
          part_id: string | null
          part_name: string | null
          part_number: string | null
          po_status: string | null
          purchase_order_id: string | null
          purchase_order_line_id: string | null
          quantity_balance: number | null
          quantity_ordered: number | null
          quantity_received: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_role_permissions: {
        Row: {
          granted_at: string | null
          id: number | null
          permission_category: string | null
          permission_id: string | null
          permission_key: string | null
          permission_name: string | null
          role_key: string | null
          role_name: string | null
          tenant_id: string | null
          tenant_role_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_role_permissions_tenant_role_id_fkey"
            columns: ["tenant_role_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_schedule_blocks: {
        Row: {
          asset_id: string | null
          created_at: string | null
          crew_id: string | null
          effective_asset_id: string | null
          effective_location_id: string | null
          end_at: string | null
          id: string | null
          location_id: string | null
          start_at: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_due_date: string | null
          work_order_id: string | null
          work_order_priority: string | null
          work_order_status: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_schedule_by_asset: {
        Row: {
          asset_id: string | null
          created_at: string | null
          crew_id: string | null
          effective_asset_id: string | null
          effective_location_id: string | null
          end_at: string | null
          id: string | null
          location_id: string | null
          start_at: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_due_date: string | null
          work_order_id: string | null
          work_order_priority: string | null
          work_order_status: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_schedule_by_crew: {
        Row: {
          asset_id: string | null
          created_at: string | null
          crew_id: string | null
          effective_asset_id: string | null
          effective_location_id: string | null
          end_at: string | null
          id: string | null
          location_id: string | null
          start_at: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_due_date: string | null
          work_order_id: string | null
          work_order_priority: string | null
          work_order_status: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_schedule_by_location: {
        Row: {
          asset_id: string | null
          created_at: string | null
          crew_id: string | null
          effective_asset_id: string | null
          effective_location_id: string | null
          end_at: string | null
          id: string | null
          location_id: string | null
          start_at: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_due_date: string | null
          work_order_id: string | null
          work_order_priority: string | null
          work_order_status: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_schedule_by_technician: {
        Row: {
          asset_id: string | null
          created_at: string | null
          crew_id: string | null
          effective_asset_id: string | null
          effective_location_id: string | null
          end_at: string | null
          id: string | null
          location_id: string | null
          start_at: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_due_date: string | null
          work_order_id: string | null
          work_order_priority: string | null
          work_order_status: string | null
          work_order_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "schedule_blocks_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "schedule_blocks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_shift_handovers: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          from_user_id: string | null
          id: string | null
          location_id: string | null
          shift_ended_at: string | null
          shift_started_at: string | null
          status: string | null
          summary: string | null
          tenant_id: string | null
          to_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string | null
          location_id?: string | null
          shift_ended_at?: string | null
          shift_started_at?: string | null
          status?: string | null
          summary?: string | null
          tenant_id?: string | null
          to_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string | null
          location_id?: string | null
          shift_ended_at?: string | null
          shift_started_at?: string | null
          status?: string | null
          summary?: string | null
          tenant_id?: string | null
          to_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "shift_handovers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "shift_handovers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "shift_handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shift_handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shift_handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shift_handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_shift_templates: {
        Row: {
          created_at: string | null
          crew_id: string | null
          day_of_week: number | null
          end_time: string | null
          id: string | null
          label: string | null
          shift_type: string | null
          start_time: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crew_id?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string | null
          label?: string | null
          shift_type?: string | null
          start_time?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crew_id?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string | null
          label?: string | null
          shift_type?: string | null
          start_time?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shift_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shift_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shift_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_shifts: {
        Row: {
          created_at: string | null
          crew_id: string | null
          end_at: string | null
          id: string | null
          label: string | null
          shift_type: string | null
          start_at: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crew_id?: string | null
          end_at?: string | null
          id?: string | null
          label?: string | null
          shift_type?: string | null
          start_at?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crew_id?: string | null
          end_at?: string | null
          id?: string | null
          label?: string | null
          shift_type?: string | null
          start_at?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_site_rollup: {
        Row: {
          active_asset_count: number | null
          active_work_order_count: number | null
          asset_count: number | null
          building_count: number | null
          floor_count: number | null
          location_type: string | null
          room_count: number | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          tenant_id: string | null
          work_order_count: number | null
          zone_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_skill_catalogs: {
        Row: {
          category: string | null
          code: string | null
          created_at: string | null
          display_order: number | null
          id: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "skill_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "skill_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "skill_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_spaces: {
        Row: {
          area_sqft: number | null
          attributes: Json | null
          capacity: number | null
          created_at: string | null
          id: string | null
          location_id: string | null
          location_name: string | null
          location_type: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          usage_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "spaces_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "spaces_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "spaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "spaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "spaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "spaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_status_catalogs: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          display_order: number | null
          entity_type: string | null
          icon: string | null
          id: string | null
          is_final: boolean | null
          key: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          entity_type?: string | null
          icon?: string | null
          id?: string | null
          is_final?: boolean | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          entity_type?: string | null
          icon?: string | null
          id?: string | null
          is_final?: boolean | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "status_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "status_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "status_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_status_transitions: {
        Row: {
          created_at: string | null
          entity_type: string | null
          from_status_key: string | null
          guard_condition: Json | null
          id: string | null
          required_permission: string | null
          tenant_id: string | null
          to_status_key: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_type?: string | null
          from_status_key?: string | null
          guard_condition?: Json | null
          id?: string | null
          required_permission?: string | null
          tenant_id?: string | null
          to_status_key?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_type?: string | null
          from_status_key?: string | null
          guard_condition?: Json | null
          id?: string | null
          required_permission?: string | null
          tenant_id?: string | null
          to_status_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_transitions_from_fk"
            columns: ["tenant_id", "entity_type", "from_status_key"]
            isOneToOne: false
            referencedRelation: "v_status_catalogs"
            referencedColumns: ["tenant_id", "entity_type", "key"]
          },
          {
            foreignKeyName: "status_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "status_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "status_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "status_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "status_transitions_to_fk"
            columns: ["tenant_id", "entity_type", "to_status_key"]
            isOneToOne: false
            referencedRelation: "v_status_catalogs"
            referencedColumns: ["tenant_id", "entity_type", "key"]
          },
        ]
      }
      v_stock_by_location: {
        Row: {
          inventory_location_id: string | null
          location_code: string | null
          location_name: string | null
          location_type: string | null
          part_id: string | null
          part_name: string | null
          part_number: string | null
          quantity: number | null
          tenant_id: string | null
          unit: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_stock_levels: {
        Row: {
          inventory_location_id: string | null
          part_id: string | null
          quantity: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          inventory_location_id?: string | null
          part_id?: string | null
          quantity?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          inventory_location_id?: string | null
          part_id?: string | null
          quantity?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "v_parts_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_suppliers: {
        Row: {
          address_line: string | null
          code: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          external_id: string | null
          id: string | null
          name: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          address_line?: string | null
          code?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line?: string | null
          code?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_technician_capacity: {
        Row: {
          scheduled_minutes: number | null
          shift_count: number | null
          shift_date: string | null
          technician_id: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_technician_certifications: {
        Row: {
          certification_id: string | null
          created_at: string | null
          expires_at: string | null
          id: number | null
          issued_at: string | null
          issued_by: string | null
          technician_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          certification_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: number | null
          issued_at?: string | null
          issued_by?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          certification_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: number | null
          issued_at?: string | null
          issued_by?: string | null
          technician_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "v_certification_catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_certifications_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technician_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technician_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technician_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_technician_skills: {
        Row: {
          created_at: string | null
          id: number | null
          proficiency: string | null
          skill_id: string | null
          technician_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          proficiency?: string | null
          skill_id?: string | null
          technician_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          proficiency?: string | null
          skill_id?: string | null
          technician_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "v_skill_catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_skills_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technician_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technician_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technician_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_technicians: {
        Row: {
          created_at: string | null
          default_crew_id: string | null
          department_id: string | null
          employee_number: string | null
          id: string | null
          is_active: boolean | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_crew_id?: string | null
          department_id?: string | null
          employee_number?: string | null
          id?: string | null
          is_active?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_crew_id?: string | null
          department_id?: string | null
          employee_number?: string | null
          id?: string | null
          is_active?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_default_crew_id_fkey"
            columns: ["default_crew_id"]
            isOneToOne: false
            referencedRelation: "v_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "v_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_tenant_roles: {
        Row: {
          created_at: string | null
          id: string | null
          is_default: boolean | null
          is_system: boolean | null
          key: string | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_default?: boolean | null
          is_system?: boolean | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_default?: boolean | null
          is_system?: boolean | null
          key?: string | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_tenants: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      v_tenants_overview: {
        Row: {
          active_work_order_count: number | null
          asset_count: number | null
          first_work_order_at: string | null
          last_work_order_at: string | null
          location_count: number | null
          member_count: number | null
          overdue_work_order_count: number | null
          slug: string | null
          tenant_created_at: string | null
          tenant_id: string | null
          tenant_name: string | null
          work_order_count: number | null
        }
        Relationships: []
      }
      v_tool_checkouts: {
        Row: {
          checked_out_at: string | null
          checked_out_to_user_id: string | null
          created_at: string | null
          due_at: string | null
          id: string | null
          notes: string | null
          returned_at: string | null
          tenant_id: string | null
          tool_id: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          checked_out_at?: string | null
          checked_out_to_user_id?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string | null
          notes?: string | null
          returned_at?: string | null
          tenant_id?: string | null
          tool_id?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          checked_out_at?: string | null
          checked_out_to_user_id?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string | null
          notes?: string | null
          returned_at?: string | null
          tenant_id?: string | null
          tool_id?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tool_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tool_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tool_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tool_checkouts_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "v_tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_checkouts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "tool_checkouts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "tool_checkouts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tools: {
        Row: {
          asset_tag: string | null
          created_at: string | null
          id: string | null
          name: string | null
          serial_number: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_tag?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          serial_number?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_tag?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          serial_number?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_upcoming_pms: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          completion_count: number | null
          created_at: string | null
          days_until_due: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          last_completed_at: string | null
          next_due_date: string | null
          template_id: string | null
          template_name: string | null
          tenant_id: string | null
          title: string | null
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_pm_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_user_tenant_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: number | null
          role_key: string | null
          role_name: string | null
          tenant_id: string | null
          tenant_role_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenant_roles_tenant_role_id_fkey"
            columns: ["tenant_role_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_work_order_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: number | null
          technician_id: string | null
          tenant_id: string | null
          work_order_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: number | null
          technician_id?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: number | null
          technician_id?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_assignments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_work_order_attachments: {
        Row: {
          bucket_id: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          document_type_key: string | null
          effective_date: string | null
          file_id: string | null
          filename: string | null
          id: string | null
          is_controlled: boolean | null
          kind: string | null
          label: string | null
          revision_label: string | null
          storage_path: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_work_order_costs: {
        Row: {
          labor_cents: number | null
          parts_cents: number | null
          tenant_id: string | null
          total_cents: number | null
          vendor_cents: number | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_work_order_labor_actuals: {
        Row: {
          entry_count: number | null
          first_entry_date: string | null
          last_entry_date: string | null
          technician_id: string | null
          tenant_id: string | null
          total_labor_cost_cents: number | null
          total_minutes: number | null
          user_id: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_time_entries_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "v_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_work_order_sla_status: {
        Row: {
          acknowledged_at: string | null
          priority: string | null
          resolution_sla_breached: boolean | null
          response_sla_breached: boolean | null
          sla_resolution_breached_at: string | null
          sla_resolution_due_at: string | null
          sla_response_breached_at: string | null
          sla_response_due_at: string | null
          status: string | null
          tenant_id: string | null
          work_order_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          priority?: string | null
          resolution_sla_breached?: never
          response_sla_breached?: never
          sla_resolution_breached_at?: string | null
          sla_resolution_due_at?: string | null
          sla_response_breached_at?: string | null
          sla_response_due_at?: string | null
          status?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          priority?: string | null
          resolution_sla_breached?: never
          response_sla_breached?: never
          sla_resolution_breached_at?: string | null
          sla_resolution_due_at?: string | null
          sla_response_breached_at?: string | null
          sla_response_due_at?: string | null
          status?: string | null
          tenant_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_work_order_time_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          description: string | null
          entry_date: string | null
          id: string | null
          logged_at: string | null
          minutes: number | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_my_work_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_costs"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_order_sla_status"
            referencedColumns: ["work_order_id"]
          },
          {
            foreignKeyName: "work_order_time_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_work_orders: {
        Row: {
          acknowledged_at: string | null
          asset_id: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          cause: string | null
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          location_id: string | null
          maintenance_type: string | null
          pm_schedule_id: string | null
          primary_supplier_id: string | null
          priority: string | null
          project_id: string | null
          requested_by: string | null
          resolution: string | null
          sla_resolution_breached_at: string | null
          sla_resolution_due_at: string | null
          sla_response_breached_at: string | null
          sla_response_due_at: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          total_labor_minutes: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_site_summary"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_mobile_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "v_site_rollup"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "work_orders_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_due_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_pm_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_pm_schedule_id_fkey"
            columns: ["pm_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_primary_supplier_id_fkey"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      v_work_orders_summary: {
        Row: {
          assigned_count: number | null
          avg_completion_hours: number | null
          completed_count: number | null
          count: number | null
          created_last_30_days: number | null
          first_work_order_at: string | null
          last_updated_at: string | null
          last_work_order_at: string | null
          overdue_count: number | null
          priority: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_portfolio_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Functions: {
      refresh_analytics_views: { Args: never; Returns: undefined }
      refresh_tenant_analytics: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      rpc_acknowledge_shift_handover: {
        Args: { p_handover_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_acknowledge_work_order: {
        Args: { p_tenant_id: string; p_work_order_id: string }
        Returns: undefined
      }
      rpc_add_shift_handover_item: {
        Args: {
          p_body: string
          p_handover_id: string
          p_priority?: string
          p_tenant_id: string
          p_work_order_id?: string
        }
        Returns: string
      }
      rpc_add_work_order_note: {
        Args: {
          p_body: string
          p_latitude?: number
          p_longitude?: number
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_asset_lifecycle_alerts: {
        Args: { p_days_ahead?: number; p_tenant_id: string }
        Returns: {
          alert_type: string
          asset_id: string
          days_until: number
          reference_date: string
        }[]
      }
      rpc_asset_total_cost_of_ownership: {
        Args: {
          p_asset_id: string
          p_from_date?: string
          p_tenant_id: string
          p_to_date?: string
        }
        Returns: {
          labor_cents: number
          parts_cents: number
          total_cents: number
          vendor_cents: number
          work_order_count: number
        }[]
      }
      rpc_assign_permission_to_role: {
        Args: {
          p_permission_key: string
          p_role_key: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_assign_role_to_user: {
        Args: { p_role_key: string; p_tenant_id: string; p_user_id: string }
        Returns: undefined
      }
      rpc_assign_work_order: {
        Args: {
          p_assigned_to: string
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: undefined
      }
      rpc_bulk_import_assets: {
        Args: { p_rows: Json; p_tenant_id: string }
        Returns: Json
      }
      rpc_bulk_import_departments: {
        Args: { p_rows: Json; p_tenant_id: string }
        Returns: Json
      }
      rpc_bulk_import_locations: {
        Args: { p_rows: Json; p_tenant_id: string }
        Returns: Json
      }
      rpc_bulk_import_work_orders: {
        Args: { p_rows: Json; p_tenant_id: string }
        Returns: Json
      }
      rpc_check_shift_conflicts: {
        Args: {
          p_end_at: string
          p_exclude_shift_id?: string
          p_start_at: string
          p_technician_id: string
        }
        Returns: {
          end_at: string
          id: string
          label: string
          shift_type: string
          start_at: string
        }[]
      }
      rpc_checkout_tool: {
        Args: {
          p_checked_out_to_user_id: string
          p_due_at?: string
          p_notes?: string
          p_tenant_id: string
          p_tool_id: string
          p_work_order_id?: string
        }
        Returns: string
      }
      rpc_clear_tenant_context: { Args: never; Returns: undefined }
      rpc_close_incident: {
        Args: { p_incident_id: string; p_status?: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_complete_incident_action: {
        Args: { p_action_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_complete_inspection_run: {
        Args: { p_item_results?: Json; p_run_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_complete_work_order: {
        Args: {
          p_cause?: string
          p_resolution?: string
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: undefined
      }
      rpc_compliance_incident_report: {
        Args: {
          p_from_date: string
          p_severity?: string
          p_tenant_id: string
          p_to_date: string
        }
        Returns: {
          action_completed_count: number
          action_count: number
          action_pending_count: number
          closed_at: string
          incident_id: string
          occurred_at: string
          severity: string
          status: string
          title: string
          type: string
        }[]
      }
      rpc_compliance_inspection_history: {
        Args: {
          p_asset_id?: string
          p_from_date: string
          p_location_id?: string
          p_tenant_id: string
          p_to_date: string
        }
        Returns: {
          asset_name: string
          completed_at: string
          conducted_by_name: string
          fail_count: number
          location_name: string
          na_count: number
          not_checked_count: number
          pass_count: number
          run_id: string
          scheduled_at: string
          status: string
          template_name: string
        }[]
      }
      rpc_cost_rollup: {
        Args: {
          p_from_date?: string
          p_group_by: string
          p_tenant_id: string
          p_to_date?: string
        }
        Returns: {
          group_key: string
          group_name: string
          labor_cents: number
          parts_cents: number
          total_cents: number
          vendor_cents: number
          work_order_count: number
        }[]
      }
      rpc_create_asset: {
        Args: {
          p_asset_number?: string
          p_department_id?: string
          p_description?: string
          p_location_id?: string
          p_name: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_department: {
        Args: {
          p_code?: string
          p_description?: string
          p_name: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_incident: {
        Args: {
          p_asset_id?: string
          p_description?: string
          p_location_id?: string
          p_metadata?: Json
          p_occurred_at?: string
          p_severity?: string
          p_tenant_id: string
          p_title: string
          p_type?: string
          p_work_order_id?: string
        }
        Returns: string
      }
      rpc_create_incident_action: {
        Args: {
          p_action_type?: string
          p_assigned_to?: string
          p_description: string
          p_due_date?: string
          p_incident_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_inspection_run: {
        Args: {
          p_asset_id?: string
          p_inspection_schedule_id?: string
          p_location_id?: string
          p_notes?: string
          p_scheduled_at?: string
          p_template_id?: string
          p_tenant_id: string
          p_work_order_id?: string
        }
        Returns: string
      }
      rpc_create_inspection_schedule: {
        Args: {
          p_asset_id?: string
          p_location_id?: string
          p_next_due_at?: string
          p_template_id: string
          p_tenant_id: string
          p_title: string
          p_trigger_config?: Json
        }
        Returns: string
      }
      rpc_create_inspection_template: {
        Args: {
          p_category?: string
          p_checklist_items?: Json
          p_description?: string
          p_name: string
          p_tenant_id: string
          p_trigger_config?: Json
        }
        Returns: string
      }
      rpc_create_location: {
        Args: {
          p_address_line?: string
          p_code?: string
          p_description?: string
          p_external_id?: string
          p_latitude?: number
          p_location_type?: string
          p_longitude?: number
          p_name: string
          p_parent_location_id?: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_maintenance_type: {
        Args: {
          p_category: string
          p_color?: string
          p_description?: string
          p_display_order?: number
          p_icon?: string
          p_key: string
          p_name: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_map_zone: {
        Args: {
          p_geometry: Json
          p_location_id?: string
          p_name: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_meter: {
        Args: {
          p_asset_id: string
          p_current_reading?: number
          p_decimal_places?: number
          p_description?: string
          p_meter_type: string
          p_name: string
          p_reading_direction?: string
          p_tenant_id: string
          p_unit: string
        }
        Returns: string
      }
      rpc_create_part: {
        Args: {
          p_description?: string
          p_external_id?: string
          p_lead_time_days?: number
          p_max_quantity?: number
          p_min_quantity?: number
          p_name?: string
          p_part_number: string
          p_preferred_supplier_id?: string
          p_reorder_point?: number
          p_tenant_id: string
          p_unit?: string
        }
        Returns: string
      }
      rpc_create_pm_dependency: {
        Args: {
          p_dependency_type?: string
          p_depends_on_pm_id: string
          p_pm_schedule_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_pm_schedule: {
        Args: {
          p_asset_id: string
          p_auto_generate?: boolean
          p_description?: string
          p_estimated_hours?: number
          p_template_id?: string
          p_tenant_id: string
          p_title: string
          p_trigger_config: Json
          p_trigger_type: string
          p_wo_description?: string
          p_wo_estimated_hours?: number
          p_wo_priority?: string
          p_wo_title?: string
        }
        Returns: string
      }
      rpc_create_pm_template: {
        Args: {
          p_checklist_items?: Json
          p_description?: string
          p_estimated_hours?: number
          p_name: string
          p_tenant_id: string
          p_trigger_config: Json
          p_trigger_type: string
          p_wo_description?: string
          p_wo_estimated_hours?: number
          p_wo_priority?: string
          p_wo_title?: string
        }
        Returns: string
      }
      rpc_create_priority: {
        Args: {
          p_color?: string
          p_display_order: number
          p_entity_type: string
          p_key: string
          p_name: string
          p_tenant_id: string
          p_weight: number
        }
        Returns: string
      }
      rpc_create_purchase_order: {
        Args: {
          p_expected_delivery_date?: string
          p_external_id?: string
          p_lines?: Json
          p_notes?: string
          p_order_date?: string
          p_order_number: string
          p_supplier_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_shift_handover: {
        Args: {
          p_location_id: string
          p_shift_ended_at: string
          p_shift_started_at: string
          p_summary?: string
          p_tenant_id: string
          p_to_user_id: string
        }
        Returns: string
      }
      rpc_create_space: {
        Args: {
          p_area_sqft?: number
          p_attributes?: Json
          p_capacity?: number
          p_location_id: string
          p_status?: string
          p_tenant_id: string
          p_usage_type?: string
        }
        Returns: string
      }
      rpc_create_status: {
        Args: {
          p_category: string
          p_color?: string
          p_display_order: number
          p_entity_type: string
          p_icon?: string
          p_key: string
          p_name: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_status_transition: {
        Args: {
          p_entity_type: string
          p_from_status_key: string
          p_guard_condition?: Json
          p_required_permission?: string
          p_tenant_id: string
          p_to_status_key: string
        }
        Returns: string
      }
      rpc_create_supplier: {
        Args: {
          p_address_line?: string
          p_code?: string
          p_contact_name?: string
          p_email?: string
          p_external_id?: string
          p_insurance_expires_at?: string
          p_name: string
          p_phone?: string
          p_supplies_labor?: boolean
          p_supplies_parts?: boolean
          p_tax_id?: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_create_tenant: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      rpc_create_tenant_api_key: {
        Args: { p_name: string; p_tenant_id: string }
        Returns: Json
      }
      rpc_create_work_order: {
        Args: {
          p_asset_id?: string
          p_assigned_to?: string
          p_description?: string
          p_due_date?: string
          p_location_id?: string
          p_maintenance_type?: string
          p_pm_schedule_id?: string
          p_priority?: string
          p_project_id?: string
          p_tenant_id: string
          p_title: string
        }
        Returns: string
      }
      rpc_create_work_order_request: {
        Args: {
          p_asset_id?: string
          p_description?: string
          p_due_date?: string
          p_location_id?: string
          p_maintenance_type?: string
          p_priority?: string
          p_tenant_id: string
          p_title: string
        }
        Returns: string
      }
      rpc_delete_asset: {
        Args: { p_asset_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_delete_department: {
        Args: { p_department_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_delete_location: {
        Args: { p_location_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_delete_map_zone: {
        Args: { p_tenant_id: string; p_zone_id: string }
        Returns: undefined
      }
      rpc_delete_meter: {
        Args: { p_meter_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_delete_plugin_webhook_subscription: {
        Args: { p_subscription_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_delete_pm_schedule: {
        Args: { p_pm_schedule_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_delete_space: {
        Args: { p_space_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_generate_due_pms: {
        Args: { p_limit?: number; p_tenant_id: string }
        Returns: number
      }
      rpc_generate_shifts_from_templates: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: {
          crew_id: string
          end_at: string
          id: string
          label: string
          shift_type: string
          start_at: string
          technician_id: string
        }[]
      }
      rpc_get_user_permissions: {
        Args: { p_tenant_id: string }
        Returns: string[]
      }
      rpc_get_workflow_graph: {
        Args: { p_entity_type: string; p_tenant_id: string }
        Returns: Json
      }
      rpc_grant_scope: {
        Args: {
          p_scope_type: string
          p_scope_value?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      rpc_has_permission: {
        Args: { p_permission_key: string; p_tenant_id: string }
        Returns: boolean
      }
      rpc_insert_attachment_storage_object: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_name: string
          p_owner_id: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_install_plugin: {
        Args: {
          p_config?: Json
          p_plugin_key: string
          p_secret_ref?: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_invite_user_to_tenant: {
        Args: {
          p_invitee_email: string
          p_role_key: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_issue_parts_to_work_order: {
        Args: {
          p_inventory_location_id?: string
          p_part_id: string
          p_quantity: number
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_list_my_notifications: {
        Args: { p_limit?: number; p_tenant_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_list_tenant_api_keys: {
        Args: { p_tenant_id: string }
        Returns: Json[]
      }
      rpc_log_work_order_time: {
        Args: {
          p_accuracy_metres?: number
          p_description?: string
          p_entry_date?: string
          p_latitude?: number
          p_longitude?: number
          p_minutes: number
          p_tenant_id: string
          p_user_id?: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_mark_notifications_read: {
        Args: { p_notification_ids: string[]; p_tenant_id: string }
        Returns: undefined
      }
      rpc_mobile_sync: {
        Args: {
          p_limit?: number
          p_technician_id?: string
          p_tenant_id: string
          p_updated_after?: string
        }
        Returns: Json
      }
      rpc_plugin_ingest_webhook: {
        Args: {
          p_installation_id: string
          p_payload: Json
          p_plugin_key: string
          p_signature: string
        }
        Returns: Json
      }
      rpc_process_due_notifications: { Args: never; Returns: undefined }
      rpc_process_plugin_deliveries: {
        Args: { p_batch_size?: number }
        Returns: number
      }
      rpc_receive_purchase_order: {
        Args: { p_lines: Json; p_po_id: string; p_tenant_id: string }
        Returns: string
      }
      rpc_record_asset_downtime: {
        Args: {
          p_asset_id: string
          p_ended_at?: string
          p_linked_work_order_id?: string
          p_notes?: string
          p_reason_key: string
          p_started_at?: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_record_meter_reading: {
        Args: {
          p_meter_id: string
          p_notes?: string
          p_reading_date?: string
          p_reading_type?: string
          p_reading_value: number
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_record_meter_reading_automated: {
        Args: {
          p_meter_id: string
          p_notes?: string
          p_reading_date?: string
          p_reading_value: number
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_register_entity_attachment: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_file_id: string
          p_kind?: string
          p_label?: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_register_plugin: {
        Args: {
          p_description?: string
          p_is_active?: boolean
          p_is_integration?: boolean
          p_key: string
          p_name: string
        }
        Returns: string
      }
      rpc_remove_member_from_tenant: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: undefined
      }
      rpc_reserve_parts: {
        Args: {
          p_inventory_location_id?: string
          p_part_id: string
          p_quantity: number
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_return_tool: {
        Args: { p_checkout_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_revoke_permission_from_role: {
        Args: {
          p_permission_key: string
          p_role_key: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_revoke_scope: {
        Args: {
          p_scope_type: string
          p_scope_value?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      rpc_revoke_tenant_api_key: {
        Args: { p_key_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_schedule_work_order: {
        Args: {
          p_asset_id?: string
          p_crew_id?: string
          p_end_at?: string
          p_location_id?: string
          p_start_at?: string
          p_technician_id?: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_set_audit_retention_config: {
        Args: {
          p_is_active?: boolean
          p_retention_months: number
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_set_tenant_context: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      rpc_set_work_order_primary_supplier: {
        Args: {
          p_primary_supplier_id: string
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: undefined
      }
      rpc_start_work_order: {
        Args: {
          p_accuracy_metres?: number
          p_latitude?: number
          p_longitude?: number
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_stop_work_order: {
        Args: {
          p_accuracy_metres?: number
          p_cause?: string
          p_complete?: boolean
          p_latitude?: number
          p_longitude?: number
          p_minutes?: number
          p_note?: string
          p_resolution?: string
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: undefined
      }
      rpc_submit_shift_handover: {
        Args: { p_handover_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_tenant_api_key_touch: {
        Args: { p_key_id: string }
        Returns: undefined
      }
      rpc_transition_work_order_status: {
        Args: {
          p_tenant_id: string
          p_to_status_key: string
          p_work_order_id: string
        }
        Returns: undefined
      }
      rpc_trigger_manual_pm: {
        Args: { p_pm_schedule_id: string; p_tenant_id: string }
        Returns: string
      }
      rpc_uninstall_plugin: {
        Args: { p_installation_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_unschedule_work_order: {
        Args: { p_schedule_block_id?: string; p_work_order_id?: string }
        Returns: undefined
      }
      rpc_update_asset: {
        Args: {
          p_asset_id: string
          p_asset_number?: string
          p_department_id?: string
          p_description?: string
          p_location_id?: string
          p_name?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_update_department: {
        Args: {
          p_code?: string
          p_department_id: string
          p_description?: string
          p_name?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_update_entity_attachment_metadata: {
        Args: {
          p_attachment_id: string
          p_document_type_key?: string
          p_effective_date?: string
          p_is_controlled?: boolean
          p_kind?: string
          p_label?: string
          p_revision_label?: string
        }
        Returns: undefined
      }
      rpc_update_incident: {
        Args: {
          p_asset_id?: string
          p_description?: string
          p_incident_id: string
          p_location_id?: string
          p_metadata?: Json
          p_occurred_at?: string
          p_severity?: string
          p_status?: string
          p_tenant_id: string
          p_title?: string
          p_type?: string
          p_work_order_id?: string
        }
        Returns: undefined
      }
      rpc_update_incident_action: {
        Args: {
          p_action_id: string
          p_assigned_to?: string
          p_description?: string
          p_due_date?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_update_inspection_run: {
        Args: {
          p_conducted_by?: string
          p_notes?: string
          p_run_id: string
          p_scheduled_at?: string
          p_started_at?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_update_inspection_schedule: {
        Args: {
          p_asset_id?: string
          p_is_active?: boolean
          p_location_id?: string
          p_next_due_at?: string
          p_schedule_id: string
          p_tenant_id: string
          p_title?: string
          p_trigger_config?: Json
        }
        Returns: undefined
      }
      rpc_update_inspection_template: {
        Args: {
          p_category?: string
          p_checklist_items?: Json
          p_description?: string
          p_name?: string
          p_template_id: string
          p_tenant_id: string
          p_trigger_config?: Json
        }
        Returns: undefined
      }
      rpc_update_location: {
        Args: {
          p_address_line?: string
          p_clear_position?: boolean
          p_code?: string
          p_description?: string
          p_external_id?: string
          p_latitude?: number
          p_location_id: string
          p_location_type?: string
          p_longitude?: number
          p_name?: string
          p_parent_location_id?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_update_map_zone: {
        Args: {
          p_geometry?: Json
          p_location_id?: string
          p_name?: string
          p_tenant_id: string
          p_zone_id: string
        }
        Returns: undefined
      }
      rpc_update_meter: {
        Args: {
          p_decimal_places?: number
          p_description?: string
          p_is_active?: boolean
          p_meter_id: string
          p_name?: string
          p_reading_direction?: string
          p_tenant_id: string
          p_unit?: string
        }
        Returns: undefined
      }
      rpc_update_part: {
        Args: {
          p_description?: string
          p_external_id?: string
          p_is_active?: boolean
          p_lead_time_days?: number
          p_max_quantity?: number
          p_min_quantity?: number
          p_name?: string
          p_part_id: string
          p_part_number?: string
          p_preferred_supplier_id?: string
          p_reorder_point?: number
          p_tenant_id: string
          p_unit?: string
        }
        Returns: undefined
      }
      rpc_update_plugin_installation: {
        Args: {
          p_config?: Json
          p_installation_id: string
          p_secret_ref?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_update_pm_schedule: {
        Args: {
          p_auto_generate?: boolean
          p_description?: string
          p_estimated_hours?: number
          p_is_active?: boolean
          p_pm_schedule_id: string
          p_tenant_id: string
          p_title?: string
          p_trigger_config?: Json
          p_wo_description?: string
          p_wo_estimated_hours?: number
          p_wo_priority?: string
          p_wo_title?: string
        }
        Returns: undefined
      }
      rpc_update_pm_template: {
        Args: {
          p_checklist_items?: Json
          p_description?: string
          p_estimated_hours?: number
          p_name?: string
          p_template_id: string
          p_tenant_id: string
          p_trigger_config?: Json
          p_wo_description?: string
          p_wo_estimated_hours?: number
          p_wo_priority?: string
          p_wo_title?: string
        }
        Returns: undefined
      }
      rpc_update_schedule_block: {
        Args: {
          p_asset_id?: string
          p_crew_id?: string
          p_end_at?: string
          p_location_id?: string
          p_schedule_block_id: string
          p_start_at?: string
          p_technician_id?: string
        }
        Returns: string
      }
      rpc_update_space: {
        Args: {
          p_area_sqft?: number
          p_attributes?: Json
          p_capacity?: number
          p_space_id: string
          p_status?: string
          p_tenant_id: string
          p_usage_type?: string
        }
        Returns: undefined
      }
      rpc_update_supplier: {
        Args: {
          p_address_line?: string
          p_code?: string
          p_contact_name?: string
          p_email?: string
          p_external_id?: string
          p_insurance_expires_at?: string
          p_name?: string
          p_phone?: string
          p_supplier_id: string
          p_supplies_labor?: boolean
          p_supplies_parts?: boolean
          p_tax_id?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_upsert_asset_warranty: {
        Args: {
          p_asset_id: string
          p_coverage_summary?: string
          p_expires_on?: string
          p_external_reference?: string
          p_is_active?: boolean
          p_starts_on?: string
          p_supplier_id?: string
          p_tenant_id: string
          p_warranty_id?: string
          p_warranty_type?: string
        }
        Returns: string
      }
      rpc_upsert_notification_preference: {
        Args: {
          p_channel_in_app: boolean
          p_event_key: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      rpc_upsert_plugin_webhook_subscription: {
        Args: {
          p_changed_fields_allowlist?: string[]
          p_include_payload?: boolean
          p_installation_id: string
          p_operations: string[]
          p_table_name: string
          p_table_schema: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_upsert_work_order_sla_rule: {
        Args: {
          p_is_active?: boolean
          p_maintenance_type_key?: string
          p_priority_key: string
          p_resolution_interval?: string
          p_response_interval?: string
          p_rule_id?: string
          p_tenant_id: string
        }
        Returns: string
      }
      rpc_upsert_work_order_vendor_cost: {
        Args: {
          p_amount_cents?: number
          p_description?: string
          p_invoice_reference?: string
          p_supplier_id?: string
          p_tenant_id: string
          p_vendor_cost_id?: string
          p_vendor_name?: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_validate_schedule: {
        Args: {
          p_crew_id?: string
          p_end_at?: string
          p_exclude_block_id?: string
          p_start_at?: string
          p_technician_id?: string
          p_work_order_id?: string
        }
        Returns: {
          check_type: string
          message: string
          severity: string
        }[]
      }
      rpc_validate_tenant_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          key_id: string
          tenant_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

