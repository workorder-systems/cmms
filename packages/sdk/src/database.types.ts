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
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
          parent_location_id: string | null
          tenant_id: string | null
          work_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string | null
          location_id: string | null
          name: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_number?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_number?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
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
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
      v_locations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          parent_location_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          parent_location_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
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
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
          parent_location_id: string | null
          tenant_id: string | null
          work_order_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
      v_work_order_attachments: {
        Row: {
          bucket_id: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          file_id: string | null
          filename: string | null
          id: string | null
          kind: string | null
          label: string | null
          storage_path: string | null
          tenant_id: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_tenant_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_metrics"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenants_overview"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_open_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_overdue_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
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
            referencedRelation: "v_work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v_work_orders: {
        Row: {
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
          priority: string | null
          resolution: string | null
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
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mv_location_summary"
            referencedColumns: ["location_id"]
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
            referencedRelation: "v_locations_summary"
            referencedColumns: ["location_id"]
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
      v_technicians: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          employee_number: string | null
          default_crew_id: string | null
          department_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_crews: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          lead_technician_id: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_crew_members: {
        Row: {
          id: number
          tenant_id: string
          crew_id: string
          technician_id: string
          role: string | null
          joined_at: string
          left_at: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_skill_catalogs: {
        Row: {
          id: string
          tenant_id: string
          name: string
          code: string | null
          category: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_certification_catalogs: {
        Row: {
          id: string
          tenant_id: string
          name: string
          code: string | null
          expiry_required: boolean
          validity_days: number | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_technician_skills: {
        Row: {
          id: number
          tenant_id: string
          technician_id: string
          skill_id: string
          proficiency: string | null
          created_at: string
        }
        Relationships: []
      }
      v_technician_certifications: {
        Row: {
          id: number
          tenant_id: string
          technician_id: string
          certification_id: string
          issued_at: string
          expires_at: string | null
          issued_by: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_availability_patterns: {
        Row: {
          id: number
          tenant_id: string
          technician_id: string
          day_of_week: number
          start_time: string
          end_time: string
          timezone: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_availability_overrides: {
        Row: {
          id: number
          tenant_id: string
          technician_id: string
          override_date: string
          is_available: boolean
          start_time: string | null
          end_time: string | null
          reason: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_shifts: {
        Row: {
          id: string
          tenant_id: string
          technician_id: string | null
          crew_id: string | null
          start_at: string
          end_at: string
          shift_type: string
          label: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_shift_templates: {
        Row: {
          id: string
          tenant_id: string
          crew_id: string | null
          technician_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          shift_type: string
          label: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_work_order_assignments: {
        Row: {
          id: number
          tenant_id: string
          work_order_id: string
          technician_id: string
          assigned_at: string
          created_at: string
        }
        Relationships: []
      }
      v_work_order_labor_actuals: {
        Row: {
          tenant_id: string
          work_order_id: string
          technician_id: string | null
          user_id: string | null
          entry_count: number
          total_minutes: number | null
          total_labor_cost_cents: number | null
          first_entry_date: string | null
          last_entry_date: string | null
        }
        Relationships: []
      }
      v_technician_capacity: {
        Row: {
          tenant_id: string
          technician_id: string
          shift_date: string
          shift_count: number
          scheduled_minutes: number | null
        }
        Relationships: []
      }
      v_schedule_blocks: {
        Row: {
          id: string
          tenant_id: string
          work_order_id: string
          start_at: string
          end_at: string
          technician_id: string | null
          crew_id: string | null
          location_id: string | null
          asset_id: string | null
          work_order_title: string
          work_order_status: string
          work_order_priority: string
          work_order_due_date: string | null
          effective_location_id: string | null
          effective_asset_id: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_schedule_by_technician: {
        Row: {
          id: string
          tenant_id: string
          work_order_id: string
          start_at: string
          end_at: string
          technician_id: string | null
          crew_id: string | null
          location_id: string | null
          asset_id: string | null
          work_order_title: string
          work_order_status: string
          work_order_priority: string
          work_order_due_date: string | null
          effective_location_id: string | null
          effective_asset_id: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_schedule_by_crew: {
        Row: {
          id: string
          tenant_id: string
          work_order_id: string
          start_at: string
          end_at: string
          technician_id: string | null
          crew_id: string | null
          location_id: string | null
          asset_id: string | null
          work_order_title: string
          work_order_status: string
          work_order_priority: string
          work_order_due_date: string | null
          effective_location_id: string | null
          effective_asset_id: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_schedule_by_asset: {
        Row: {
          id: string
          tenant_id: string
          work_order_id: string
          start_at: string
          end_at: string
          technician_id: string | null
          crew_id: string | null
          location_id: string | null
          asset_id: string | null
          work_order_title: string
          work_order_status: string
          work_order_priority: string
          work_order_due_date: string | null
          effective_location_id: string | null
          effective_asset_id: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      v_schedule_by_location: {
        Row: {
          id: string
          tenant_id: string
          work_order_id: string
          start_at: string
          end_at: string
          technician_id: string | null
          crew_id: string | null
          location_id: string | null
          asset_id: string | null
          work_order_title: string
          work_order_status: string
          work_order_priority: string
          work_order_due_date: string | null
          effective_location_id: string | null
          effective_asset_id: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_analytics_views: { Args: never; Returns: undefined }
      refresh_tenant_analytics: {
        Args: { p_tenant_id: string }
        Returns: undefined
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
      rpc_backfill_upsert_work_order_embedding: {
        Args: {
          p_embedding: string
          p_model_name?: string
          p_model_version?: string
          p_source_text?: string
          p_tenant_id: string
          p_work_order_id: string
        }
        Returns: undefined
      }
      rpc_clear_tenant_context: { Args: never; Returns: undefined }
      rpc_check_shift_conflicts: {
        Args: {
          p_technician_id: string
          p_start_at: string
          p_end_at: string
          p_exclude_shift_id?: string | null
        }
        Returns: {
          id: string
          start_at: string
          end_at: string
          shift_type: string
          label: string | null
        }[]
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
      rpc_create_location: {
        Args: {
          p_description?: string
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
      rpc_create_tenant: {
        Args: { p_name: string; p_slug: string }
        Returns: string
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
          p_tenant_id: string
          p_title: string
        }
        Returns: string
      }
      rpc_create_tenant_api_key: {
        Args: { p_tenant_id: string; p_name: string }
        Returns: Record<string, unknown>
      }
      rpc_generate_shifts_from_templates: {
        Args: {
          p_tenant_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          id: string
          technician_id: string | null
          crew_id: string | null
          start_at: string
          end_at: string
          shift_type: string
          label: string | null
        }[]
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
      rpc_delete_meter: {
        Args: { p_meter_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_delete_pm_schedule: {
        Args: { p_pm_schedule_id: string; p_tenant_id: string }
        Returns: undefined
      }
      rpc_generate_due_pms: {
        Args: { p_limit?: number; p_tenant_id: string }
        Returns: number
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
      rpc_list_tenant_api_keys: {
        Args: { p_tenant_id: string }
        Returns: {
          id: string
          name: string
          keyPrefix: string
          createdAt: string
          lastUsedAt: string | null
          expiresAt: string | null
        }[]
      }
      rpc_log_work_order_time: {
        Args: {
          p_description?: string
          p_entry_date?: string
          p_minutes: number
          p_tenant_id: string
          p_user_id?: string
          p_work_order_id: string
        }
        Returns: string
      }
      rpc_next_work_orders_for_embedding: {
        Args: { p_limit?: number }
        Returns: {
          asset_name: string
          cause: string
          description: string
          location_name: string
          resolution: string
          tenant_id: string
          title: string
          work_order_id: string
        }[]
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
        Args: { p_tenant_id: string; p_key_id: string }
        Returns: undefined
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
      rpc_schedule_work_order: {
        Args: {
          p_work_order_id: string
          p_technician_id?: string | null
          p_crew_id?: string | null
          p_start_at: string
          p_end_at: string
          p_location_id?: string | null
          p_asset_id?: string | null
        }
        Returns: string
      }
      rpc_unschedule_work_order: {
        Args: {
          p_schedule_block_id?: string | null
          p_work_order_id?: string | null
        }
        Returns: undefined
      }
      rpc_update_schedule_block: {
        Args: {
          p_schedule_block_id: string
          p_technician_id?: string | null
          p_crew_id?: string | null
          p_start_at?: string | null
          p_end_at?: string | null
          p_location_id?: string | null
          p_asset_id?: string | null
        }
        Returns: string
      }
      rpc_validate_schedule: {
        Args: {
          p_technician_id?: string | null
          p_crew_id?: string | null
          p_start_at?: string | null
          p_end_at?: string | null
          p_work_order_id?: string | null
          p_exclude_block_id?: string | null
        }
        Returns: {
          check_type: string
          severity: string
          message: string
        }[]
      }
      rpc_similar_past_work_orders: {
        Args: {
          p_exclude_work_order_id?: string
          p_limit?: number
          p_min_similarity?: number
          p_query_embedding: string
        }
        Returns: {
          asset_id: string
          cause: string
          completed_at: string
          description: string
          location_id: string
          resolution: string
          similarity_score: number
          status: string
          title: string
          work_order_id: string
        }[]
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
      rpc_update_location: {
        Args: {
          p_description?: string
          p_location_id: string
          p_name?: string
          p_parent_location_id?: string
          p_tenant_id: string
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
      rpc_update_work_order_attachment_metadata: {
        Args: { p_attachment_id: string; p_kind?: string; p_label?: string }
        Returns: undefined
      }
      rpc_upsert_work_order_embedding: {
        Args: {
          p_embedding: string
          p_model_name?: string
          p_model_version?: string
          p_source_text?: string
          p_work_order_id: string
        }
        Returns: undefined
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

