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
      badges: {
        Row: {
          description: string
          emoji: string
          id: string
          is_paid: boolean
          name: string
          price: number | null
        }
        Insert: {
          description: string
          emoji: string
          id: string
          is_paid?: boolean
          name: string
          price?: number | null
        }
        Update: {
          description?: string
          emoji?: string
          id?: string
          is_paid?: boolean
          name?: string
          price?: number | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      gem_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          reference_id: string | null
          type: Database["public"]["Enums"]["gem_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type: Database["public"]["Enums"]["gem_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type?: Database["public"]["Enums"]["gem_tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      match_queue: {
        Row: {
          joined_at: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          answer_a: string | null
          answer_b: string | null
          answered_at_a: string | null
          answered_at_b: string | null
          completed_at: string | null
          created_at: string
          gems_awarded: number
          id: string
          question_id: string
          status: Database["public"]["Enums"]["match_status"]
          unlocked: boolean
          user_a: string
          user_b: string
        }
        Insert: {
          answer_a?: string | null
          answer_b?: string | null
          answered_at_a?: string | null
          answered_at_b?: string | null
          completed_at?: string | null
          created_at?: string
          gems_awarded?: number
          id?: string
          question_id: string
          status?: Database["public"]["Enums"]["match_status"]
          unlocked?: boolean
          user_a: string
          user_b: string
        }
        Update: {
          answer_a?: string | null
          answer_b?: string | null
          answered_at_a?: string | null
          answered_at_b?: string | null
          completed_at?: string | null
          created_at?: string
          gems_awarded?: number
          id?: string
          question_id?: string
          status?: Database["public"]["Enums"]["match_status"]
          unlocked?: boolean
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_verified: boolean
          avatar_url: string | null
          bio: string | null
          boost_until: string | null
          countries_matched: string[]
          country: string | null
          created_at: string
          gems: number
          id: string
          last_login_date: string | null
          referral_code: string
          referred_by: string | null
          streak: number
          total_gems_earned: number
          total_gifts_sent: number
          total_matches_won: number
          total_referrals: number
          updated_at: string
          username: string
        }
        Insert: {
          age_verified?: boolean
          avatar_url?: string | null
          bio?: string | null
          boost_until?: string | null
          countries_matched?: string[]
          country?: string | null
          created_at?: string
          gems?: number
          id: string
          last_login_date?: string | null
          referral_code: string
          referred_by?: string | null
          streak?: number
          total_gems_earned?: number
          total_gifts_sent?: number
          total_matches_won?: number
          total_referrals?: number
          updated_at?: string
          username: string
        }
        Update: {
          age_verified?: boolean
          avatar_url?: string | null
          bio?: string | null
          boost_until?: string | null
          countries_matched?: string[]
          country?: string | null
          created_at?: string
          gems?: number
          id?: string
          last_login_date?: string | null
          referral_code?: string
          referred_by?: string | null
          streak?: number
          total_gems_earned?: number
          total_gifts_sent?: number
          total_matches_won?: number
          total_referrals?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      question_suggestions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          option_a: string
          option_b: string
          status: string
          suggested_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          option_a: string
          option_b: string
          status?: string
          suggested_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          option_a?: string
          option_b?: string
          status?: string
          suggested_by?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          option_a: string
          option_b: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          option_a: string
          option_b: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          option_a?: string
          option_b?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          reason: string
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          reason: string
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          reason?: string
          reported_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_gems: {
        Args: {
          _delta: number
          _note?: string
          _ref?: string
          _type: Database["public"]["Enums"]["gem_tx_type"]
          _user_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      gem_tx_type:
        | "purchase"
        | "match_win"
        | "daily"
        | "referral"
        | "gift_sent"
        | "gift_received"
        | "spend_boost"
        | "spend_mystery"
        | "spend_streak_saver"
        | "spend_badge"
        | "mystery_payout"
        | "admin"
      match_status: "waiting" | "active" | "completed" | "expired"
      message_type: "text" | "gift"
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
      app_role: ["admin", "moderator", "user"],
      gem_tx_type: [
        "purchase",
        "match_win",
        "daily",
        "referral",
        "gift_sent",
        "gift_received",
        "spend_boost",
        "spend_mystery",
        "spend_streak_saver",
        "spend_badge",
        "mystery_payout",
        "admin",
      ],
      match_status: ["waiting", "active", "completed", "expired"],
      message_type: ["text", "gift"],
    },
  },
} as const
