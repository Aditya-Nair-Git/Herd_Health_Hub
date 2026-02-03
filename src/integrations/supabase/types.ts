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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      animals: {
        Row: {
          age: number | null
          animal_id: string
          body_temperature: number | null
          breed: string | null
          created_at: string
          disease_diagnosis: string | null
          farmer_id: string
          farmer_name: string
          follow_up: boolean | null
          follow_up_date: string | null
          last_vaccination_date: string | null
          milk_production_status: string | null
          prescribed_medication: string | null
          previous_disease_history: string | null
          sex: string | null
          species: string
          symptom_1: string | null
          symptom_2: string | null
          symptom_3: string | null
          updated_at: string
          vaccination_status: string | null
          vet_id: string | null
        }
        Insert: {
          age?: number | null
          animal_id?: string
          body_temperature?: number | null
          breed?: string | null
          created_at?: string
          disease_diagnosis?: string | null
          farmer_id: string
          farmer_name: string
          follow_up?: boolean | null
          follow_up_date?: string | null
          last_vaccination_date?: string | null
          milk_production_status?: string | null
          prescribed_medication?: string | null
          previous_disease_history?: string | null
          sex?: string | null
          species?: string
          symptom_1?: string | null
          symptom_2?: string | null
          symptom_3?: string | null
          updated_at?: string
          vaccination_status?: string | null
          vet_id?: string | null
        }
        Update: {
          age?: number | null
          animal_id?: string
          body_temperature?: number | null
          breed?: string | null
          created_at?: string
          disease_diagnosis?: string | null
          farmer_id?: string
          farmer_name?: string
          follow_up?: boolean | null
          follow_up_date?: string | null
          last_vaccination_date?: string | null
          milk_production_status?: string | null
          prescribed_medication?: string | null
          previous_disease_history?: string | null
          sex?: string | null
          species?: string
          symptom_1?: string | null
          symptom_2?: string | null
          symptom_3?: string | null
          updated_at?: string
          vaccination_status?: string | null
          vet_id?: string | null
        }
        Relationships: []
      }
      farmer_entries: {
        Row: {
          age: number | null
          animal_id: string
          created_at: string
          entry_date: string
          farmer_id: string
          id: string
          milk_production_status: string | null
          notes: string | null
          previous_disease_history: string | null
          sex: string | null
          species: string | null
          symptom_1: string | null
          symptom_2: string | null
          symptom_3: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          animal_id: string
          created_at?: string
          entry_date?: string
          farmer_id: string
          id?: string
          milk_production_status?: string | null
          notes?: string | null
          previous_disease_history?: string | null
          sex?: string | null
          species?: string | null
          symptom_1?: string | null
          symptom_2?: string | null
          symptom_3?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          animal_id?: string
          created_at?: string
          entry_date?: string
          farmer_id?: string
          id?: string
          milk_production_status?: string | null
          notes?: string | null
          previous_disease_history?: string | null
          sex?: string | null
          species?: string | null
          symptom_1?: string | null
          symptom_2?: string | null
          symptom_3?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_entries_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          animal_id: string
          appointment_date: string
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          created_at: string
          farmer_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          vaccine_name: string | null
          vet_id: string
        }
        Insert: {
          animal_id: string
          appointment_date: string
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          farmer_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          vaccine_name?: string | null
          vet_id: string
        }
        Update: {
          animal_id?: string
          appointment_date?: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          farmer_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          vaccine_name?: string | null
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["animal_id"]
          },
        ]
      }
      symptoms_master: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vet_entries: {
        Row: {
          animal_id: string
          body_temperature: number | null
          continuing_medication: boolean | null
          created_at: string
          id: string
          notes: string | null
          predicted_diagnosis: string | null
          species: string | null
          symptom_1: string | null
          symptom_2: string | null
          symptom_3: string | null
          updated_at: string
          vet_diagnosis: string | null
          vet_id: string
          vet_prescribed_medication: string | null
          visit_date: string
        }
        Insert: {
          animal_id: string
          body_temperature?: number | null
          continuing_medication?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          predicted_diagnosis?: string | null
          species?: string | null
          symptom_1?: string | null
          symptom_2?: string | null
          symptom_3?: string | null
          updated_at?: string
          vet_diagnosis?: string | null
          vet_id: string
          vet_prescribed_medication?: string | null
          visit_date?: string
        }
        Update: {
          animal_id?: string
          body_temperature?: number | null
          continuing_medication?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          predicted_diagnosis?: string | null
          species?: string | null
          symptom_1?: string | null
          symptom_2?: string | null
          symptom_3?: string | null
          updated_at?: string
          vet_diagnosis?: string | null
          vet_id?: string
          vet_prescribed_medication?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_entries_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["animal_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_farmer: { Args: { _user_id: string }; Returns: boolean }
      is_vet: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "farmer" | "vet" | "admin"
      appointment_status: "scheduled" | "completed" | "cancelled" | "overdue"
      appointment_type: "vaccination" | "follow_up"
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
    Enums: {
      app_role: ["farmer", "vet", "admin"],
      appointment_status: ["scheduled", "completed", "cancelled", "overdue"],
      appointment_type: ["vaccination", "follow_up"],
    },
  },
} as const
