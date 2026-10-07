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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      departamentos: {
        Row: {
          activo: boolean
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          actualizado_en: string
          apellidos: string
          ci: string
          correo: string | null
          creado_en: string
          foto_url: string | null
          id: string
          nombres: string
          rol_uma: Database["public"]["Enums"]["rol_uma"]
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string
          apellidos: string
          ci: string
          correo?: string | null
          creado_en?: string
          foto_url?: string | null
          id?: string
          nombres: string
          rol_uma?: Database["public"]["Enums"]["rol_uma"]
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string
          apellidos?: string
          ci?: string
          correo?: string | null
          creado_en?: string
          foto_url?: string | null
          id?: string
          nombres?: string
          rol_uma?: Database["public"]["Enums"]["rol_uma"]
          telefono?: string | null
        }
        Relationships: []
      }
      registros_acceso: {
        Row: {
          creado_en: string
          creado_por: string | null
          creado_por_nombre: string
          departamento_destino: string
          estatus: Database["public"]["Enums"]["estatus_acceso"]
          hora_ingreso: string
          hora_salida: string | null
          id: string
          observaciones: string | null
          persona_id: string
          persona_recibe: string
          tipo_acceso: Database["public"]["Enums"]["rol_uma"]
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          creado_por_nombre?: string
          departamento_destino: string
          estatus?: Database["public"]["Enums"]["estatus_acceso"]
          hora_ingreso?: string
          hora_salida?: string | null
          id?: string
          observaciones?: string | null
          persona_id: string
          persona_recibe?: string
          tipo_acceso: Database["public"]["Enums"]["rol_uma"]
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          creado_por_nombre?: string
          departamento_destino?: string
          estatus?: Database["public"]["Enums"]["estatus_acceso"]
          hora_ingreso?: string
          hora_salida?: string | null
          id?: string
          observaciones?: string | null
          persona_id?: string
          persona_recibe?: string
          tipo_acceso?: Database["public"]["Enums"]["rol_uma"]
        }
        Relationships: [
          {
            foreignKeyName: "registros_acceso_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estatus_acceso: "Permitido" | "Denegado" | "En espera"
      rol_uma:
        | "Alumno"
        | "Docente"
        | "Personal Administrativo"
        | "Directivo"
        | "Personal de Apoyo"
        | "Visitante / Proveedor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      estatus_acceso: ["Permitido", "Denegado", "En espera"],
      rol_uma: [
        "Alumno",
        "Docente",
        "Personal Administrativo",
        "Directivo",
        "Personal de Apoyo",
        "Visitante / Proveedor",
      ],
    },
  },
} as const
