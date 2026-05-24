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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      doctor_accounts: {
        Row: {
          active_patients: number
          created_at: string
          full_name: string
          id: string
          is_online: boolean
          password_hash: string
          speciality: string | null
          username: string
        }
        Insert: {
          active_patients?: number
          created_at?: string
          full_name: string
          id?: string
          is_online?: boolean
          password_hash: string
          speciality?: string | null
          username: string
        }
        Update: {
          active_patients?: number
          created_at?: string
          full_name?: string
          id?: string
          is_online?: boolean
          password_hash?: string
          speciality?: string | null
          username?: string
        }
        Relationships: []
      }
      doctor_patient_assignments: {
        Row: {
          created_at: string
          doctor_id: string | null
          escalated_case_id: string | null
          id: string
          patient_name: string | null
          patient_phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          escalated_case_id?: string | null
          id?: string
          patient_name?: string | null
          patient_phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          escalated_case_id?: string | null
          id?: string
          patient_name?: string | null
          patient_phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_patient_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_patient_assignments_escalated_case_id_fkey"
            columns: ["escalated_case_id"]
            isOneToOne: false
            referencedRelation: "escalated_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      escalated_cases: {
        Row: {
          case_summary: string
          created_at: string
          escalation_reason: string
          id: string
          patient_name: string | null
          patient_phone: string | null
          patient_query: string
          resolved_at: string | null
          routed_to: string | null
          status: string
          symptoms: string[]
          urgency: string
        }
        Insert: {
          case_summary: string
          created_at?: string
          escalation_reason: string
          id?: string
          patient_name?: string | null
          patient_phone?: string | null
          patient_query: string
          resolved_at?: string | null
          routed_to?: string | null
          status?: string
          symptoms?: string[]
          urgency: string
        }
        Update: {
          case_summary?: string
          created_at?: string
          escalation_reason?: string
          id?: string
          patient_name?: string | null
          patient_phone?: string | null
          patient_query?: string
          resolved_at?: string | null
          routed_to?: string | null
          status?: string
          symptoms?: string[]
          urgency?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          active: boolean
          approved_answer: string
          category: string
          created_at: string
          id: string
          question: string
          source: string
        }
        Insert: {
          active?: boolean
          approved_answer: string
          category: string
          created_at?: string
          id?: string
          question: string
          source?: string
        }
        Update: {
          active?: boolean
          approved_answer?: string
          category?: string
          created_at?: string
          id?: string
          question?: string
          source?: string
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          message: string
          sender: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          message: string
          sender: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          message?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "doctor_patient_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      red_flag_rules: {
        Row: {
          active: boolean
          created_at: string
          escalation_reason: string
          id: string
          keyword: string
          urgency: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          escalation_reason: string
          id?: string
          keyword: string
          urgency?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          escalation_reason?: string
          id?: string
          keyword?: string
          urgency?: string
        }
        Relationships: []
      }
      test_cases: {
        Row: {
          created_at: string
          expected_decision: string
          expected_urgency: string
          id: string
          last_actual_decision: string | null
          last_actual_urgency: string | null
          last_result: string | null
          last_run_at: string | null
          patient_query: string
        }
        Insert: {
          created_at?: string
          expected_decision: string
          expected_urgency: string
          id?: string
          last_actual_decision?: string | null
          last_actual_urgency?: string | null
          last_result?: string | null
          last_run_at?: string | null
          patient_query: string
        }
        Update: {
          created_at?: string
          expected_decision?: string
          expected_urgency?: string
          id?: string
          last_actual_decision?: string | null
          last_actual_urgency?: string | null
          last_result?: string | null
          last_run_at?: string | null
          patient_query?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
