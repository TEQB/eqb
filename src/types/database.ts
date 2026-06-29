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
      courses: {
        Row: {
          code: string
          created_at: string | null
          department_id: string | null
          id: string
          level: number
          scope: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          level: number
          scope?: string
          title: string
        }
        Update: {
          code?: string
          created_at?: string | null
          department_id?: string | null
          id?: string
          level?: number
          scope?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_courses: {
        Row: {
          course_id: string
          department_id: string
        }
        Insert: {
          course_id: string
          department_id: string
        }
        Update: {
          course_id?: string
          department_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          available_levels: number[]
          created_at: string | null
          faculty_id: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          available_levels?: number[]
          created_at?: string | null
          faculty_id: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          available_levels?: number[]
          created_at?: string | null
          faculty_id?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      feedback_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          created_at: string | null
          flagged_by: string
          id: string
          question_id: string
          reason: string
        }
        Insert: {
          created_at?: string | null
          flagged_by: string
          id?: string
          question_id: string
          reason: string
        }
        Update: {
          created_at?: string | null
          flagged_by?: string
          id?: string
          question_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "past_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      past_questions: {
        Row: {
          ai_rejection_reason: string | null
          course_id: string
          created_at: string | null
          exam_type: string
          file_type: string
          file_url: string
          flag_count: number
          id: string
          level: number
          semester: string
          status: string
          uploaded_by: string
          year: number
        }
        Insert: {
          ai_rejection_reason?: string | null
          course_id: string
          created_at?: string | null
          exam_type?: string
          file_type: string
          file_url: string
          flag_count?: number
          id?: string
          level: number
          semester: string
          status?: string
          uploaded_by: string
          year: number
        }
        Update: {
          ai_rejection_reason?: string | null
          course_id?: string
          created_at?: string | null
          exam_type?: string
          file_type?: string
          file_url?: string
          flag_count?: number
          id?: string
          level?: number
          semester?: string
          status?: string
          uploaded_by?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "past_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_questions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_otps: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      pending_registrations: {
        Row: {
          created_at: string | null
          current_level: number
          department_id: string
          email: string
          full_name: string
          matric_number: string
        }
        Insert: {
          created_at?: string | null
          current_level: number
          department_id: string
          email: string
          full_name: string
          matric_number: string
        }
        Update: {
          created_at?: string | null
          current_level?: number
          department_id?: string
          email?: string
          full_name?: string
          matric_number?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          lockout_enabled: boolean
          updated_at: string | null
          upload_obligation_days: number
        }
        Insert: {
          id?: string
          lockout_enabled?: boolean
          updated_at?: string | null
          upload_obligation_days?: number
        }
        Update: {
          id?: string
          lockout_enabled?: boolean
          updated_at?: string | null
          upload_obligation_days?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_user_id: string
          created_at: string | null
          current_level: number
          department_id: string
          full_name: string
          id: string
          is_locked: boolean
          last_upload_at: string | null
          matric_number: string
          role: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          current_level: number
          department_id: string
          full_name: string
          id?: string
          is_locked?: boolean
          last_upload_at?: string | null
          matric_number: string
          role?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          current_level?: number
          department_id?: string
          full_name?: string
          id?: string
          is_locked?: boolean
          last_upload_at?: string | null
          matric_number?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_votes: {
        Row: {
          created_at: string | null
          id: string
          solution_id: string
          vote: string
          voter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          solution_id: string
          vote: string
          voter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          solution_id?: string
          vote?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_votes_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions: {
        Row: {
          body: string | null
          created_at: string | null
          downvotes: number
          file_url: string | null
          id: string
          question_id: string
          rating_count: number
          rating_sum: number
          status: string
          submitted_by: string
          upvotes: number
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          downvotes?: number
          file_url?: string | null
          id?: string
          question_id: string
          rating_count?: number
          rating_sum?: number
          status?: string
          submitted_by: string
          upvotes?: number
        }
        Update: {
          body?: string | null
          created_at?: string | null
          downvotes?: number
          file_url?: string | null
          id?: string
          question_id?: string
          rating_count?: number
          rating_sum?: number
          status?: string
          submitted_by?: string
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "solutions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "past_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          rater_id: string
          solution_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          rater_id: string
          solution_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          rater_id?: string
          solution_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_ratings_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_student_department: { Args: never; Returns: string }
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
