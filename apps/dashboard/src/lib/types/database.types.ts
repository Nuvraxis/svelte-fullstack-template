export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          hash: string
          id: string
          last_used_at: string | null
          name: string
          org_id: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          hash: string
          id?: string
          last_used_at?: string | null
          name: string
          org_id: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          hash?: string
          id?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          org_id: string
          resource: string
          resource_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          org_id: string
          resource: string
          resource_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string
          resource?: string
          resource_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_events: {
        Row: {
          churned_at: string
          customer_id: string
          id: string
          mrr_lost: number | null
          org_id: string
          reason: string | null
          subscription_id: string | null
        }
        Insert: {
          churned_at?: string
          customer_id: string
          id?: string
          mrr_lost?: number | null
          org_id: string
          reason?: string | null
          subscription_id?: string | null
        }
        Update: {
          churned_at?: string
          customer_id?: string
          id?: string
          mrr_lost?: number | null
          org_id?: string
          reason?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "churn_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "churn_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "churn_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company: string | null
          country_code: string | null
          created_at: string
          email: string
          external_id: string | null
          full_name: string
          id: string
          ltv: number
          metadata: Json
          mrr: number
          org_id: string
          risk_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          country_code?: string | null
          created_at?: string
          email: string
          external_id?: string | null
          full_name: string
          id?: string
          ltv?: number
          metadata?: Json
          mrr?: number
          org_id: string
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          country_code?: string | null
          created_at?: string
          email?: string
          external_id?: string | null
          full_name?: string
          id?: string
          ltv?: number
          metadata?: Json
          mrr?: number
          org_id?: string
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_signals: {
        Row: {
          created_at: string
          details: Json
          id: string
          org_id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          score: number | null
          severity: string
          signal_type: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          org_id: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number | null
          severity: string
          signal_type: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          org_id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number | null
          severity?: string
          signal_type?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          customer_id: string
          due_date: string | null
          id: string
          line_items: Json
          number: string
          org_id: string
          paid_at: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          created_at?: string
          currency?: string
          customer_id: string
          due_date?: string | null
          id?: string
          line_items?: Json
          number: string
          org_id: string
          paid_at?: string | null
          status: string
          subscription_id?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          line_items?: Json
          number?: string
          org_id?: string
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      mrr_snapshots: {
        Row: {
          active_subscriptions: number
          churned_mrr: number
          contraction_mrr: number
          expansion_mrr: number
          id: string
          mrr: number
          new_mrr: number
          org_id: string
          reactivation_mrr: number
          snapshot_date: string
          total_customers: number
        }
        Insert: {
          active_subscriptions: number
          churned_mrr?: number
          contraction_mrr?: number
          expansion_mrr?: number
          id?: string
          mrr: number
          new_mrr?: number
          org_id: string
          reactivation_mrr?: number
          snapshot_date: string
          total_customers: number
        }
        Update: {
          active_subscriptions?: number
          churned_mrr?: number
          contraction_mrr?: number
          expansion_mrr?: number
          id?: string
          mrr?: number
          new_mrr?: number
          org_id?: string
          reactivation_mrr?: number
          snapshot_date?: string
          total_customers?: number
        }
        Relationships: [
          {
            foreignKeyName: "mrr_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          org_id: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          org_id: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          org_id?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          org_id: string
          role_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          org_id: string
          role_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          org_id?: string
          role_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          mode: string
          name: string
          plan: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          mode?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          mode?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          customer_id: string
          expiry_month: number | null
          expiry_year: number | null
          fingerprint: string | null
          id: string
          is_default: boolean
          last_four: string | null
          org_id: string
          provider: string | null
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expiry_month?: number | null
          expiry_year?: number | null
          fingerprint?: string | null
          id?: string
          is_default?: boolean
          last_four?: string | null
          org_id: string
          provider?: string | null
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expiry_month?: number | null
          expiry_year?: number | null
          fingerprint?: string | null
          id?: string
          is_default?: boolean
          last_four?: string | null
          org_id?: string
          provider?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          amount: number
          created_at: string
          currency: string
          features: Json
          id: string
          interval: string
          is_active: boolean
          name: string
          org_id: string
          slug: string
          trial_days: number
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval: string
          is_active?: boolean
          name: string
          org_id: string
          slug: string
          trial_days?: number
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          org_id?: string
          slug?: string
          trial_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_permissions: {
        Row: {
          action: string
          created_at: string
          expires_at: string | null
          granted: boolean
          granted_by: string | null
          id: string
          org_id: string
          resource: string
          resource_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          org_id: string
          resource: string
          resource_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          org_id?: string
          resource?: string
          resource_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system: boolean
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          id: string
          metadata: Json
          mrr: number
          org_id: string
          plan_id: string
          status: string
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          id?: string
          metadata?: Json
          mrr?: number
          org_id: string
          plan_id: string
          status: string
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          customer_id?: string
          id?: string
          metadata?: Json
          mrr?: number
          org_id?: string
          plan_id?: string
          status?: string
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          channel: string | null
          country_code: string | null
          created_at: string
          currency: string
          customer_id: string | null
          fee_amount: number
          flagged_reason: string | null
          id: string
          metadata: Json
          net_amount: number | null
          org_id: string
          payment_method: string | null
          processed_at: string | null
          reference: string
          status: string
          type: string
        }
        Insert: {
          amount: number
          channel?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          fee_amount?: number
          flagged_reason?: string | null
          id?: string
          metadata?: Json
          net_amount?: number | null
          org_id: string
          payment_method?: string | null
          processed_at?: string | null
          reference: string
          status: string
          type: string
        }
        Update: {
          amount?: number
          channel?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          fee_amount?: number
          flagged_reason?: string | null
          id?: string
          metadata?: Json
          net_amount?: number | null
          org_id?: string
          payment_method?: string | null
          processed_at?: string | null
          reference?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          org_id: string
          preferences: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          org_id: string
          preferences?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          org_id?: string
          preferences?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_has_permission: {
        Args: { p_action: string; p_org_id: string; p_resource: string }
        Returns: boolean
      }
      user_in_org: { Args: { p_org_id: string }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

