export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      banned_ips: {
        Row: {
          banned_at: string
          id: string
          ip_address: string
        }
        Insert: {
          banned_at?: string
          id?: string
          ip_address: string
        }
        Update: {
          banned_at?: string
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      broken_links: {
        Row: {
          broken_url: string
          created_at: string
          id: string
          resolved: boolean
          scan_id: string
          source_page: string
          status_code: number | null
        }
        Insert: {
          broken_url: string
          created_at?: string
          id?: string
          resolved?: boolean
          scan_id: string
          source_page: string
          status_code?: number | null
        }
        Update: {
          broken_url?: string
          created_at?: string
          id?: string
          resolved?: boolean
          scan_id?: string
          source_page?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broken_links_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "link_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          apr: number
          created_at: string
          credit_limit: number
          id: string
          name: string
          user_id: string
        }
        Insert: {
          apr: number
          created_at?: string
          credit_limit?: number
          id?: string
          name: string
          user_id: string
        }
        Update: {
          apr?: number
          created_at?: string
          credit_limit?: number
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          account: string
          amount: number
          category: string | null
          cleared: boolean
          counter_account: string | null
          created_at: string
          currency: string
          date: string
          id: string
          note: string | null
          payee: string | null
          upload_month: string
          user_id: string
        }
        Insert: {
          account: string
          amount: number
          category?: string | null
          cleared?: boolean
          counter_account?: string | null
          created_at?: string
          currency?: string
          date: string
          id?: string
          note?: string | null
          payee?: string | null
          upload_month: string
          user_id: string
        }
        Update: {
          account?: string
          amount?: number
          category?: string | null
          cleared?: boolean
          counter_account?: string | null
          created_at?: string
          currency?: string
          date?: string
          id?: string
          note?: string | null
          payee?: string | null
          upload_month?: string
          user_id?: string
        }
        Relationships: []
      }
      link_scans: {
        Row: {
          broken_count: number
          completed_at: string | null
          created_at: string
          discovered_pages: Json | null
          id: string
          links_checked: number
          pages_crawled: number
          pages_processed: number
          started_at: string
          status: string
          target_url: string
          user_id: string
        }
        Insert: {
          broken_count?: number
          completed_at?: string | null
          created_at?: string
          discovered_pages?: Json | null
          id?: string
          links_checked?: number
          pages_crawled?: number
          pages_processed?: number
          started_at?: string
          status?: string
          target_url: string
          user_id: string
        }
        Update: {
          broken_count?: number
          completed_at?: string | null
          created_at?: string
          discovered_pages?: Json | null
          id?: string
          links_checked?: number
          pages_crawled?: number
          pages_processed?: number
          started_at?: string
          status?: string
          target_url?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string
          success?: boolean
        }
        Relationships: []
      }
      monthly_entries: {
        Row: {
          balances: Json
          created_at: string
          extra_payment: number
          id: string
          month: string
          user_id: string
        }
        Insert: {
          balances?: Json
          created_at?: string
          extra_payment?: number
          id?: string
          month: string
          user_id: string
        }
        Update: {
          balances?: Json
          created_at?: string
          extra_payment?: number
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_ban_ip: { Args: { p_ip: string }; Returns: boolean }
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
