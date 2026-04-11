export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole =
  | "admin"
  | "consultant"
  | "client"
  | "foe"
  | "super_admin"
  | "sports_physician"
  | "physiotherapist"
  | "sports_scientist"
  | "manager"
  | "nutritionist"
  | "massage_therapist"
  | "coach"
  | "athlete"

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled"

export interface Database {
  public: {
    Enums: {
      app_role: AppRole
      appointment_status: AppointmentStatus
    }
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          org_code: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          org_code?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          org_code?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          first_name: string
          last_name: string
          email: string | null
          created_at: string
          updated_at: string
          uhid: string | null
          ams_role: string | null
          profession: string | null
          ams_enabled: boolean | null
        }
        Insert: {
          id: string
          organization_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          created_at?: string
          updated_at?: string
          uhid?: string | null
          ams_role?: string | null
          profession?: string | null
          ams_enabled?: boolean | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          created_at?: string
          updated_at?: string
          uhid?: string | null
          ams_role?: string | null
          profession?: string | null
          ams_enabled?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
        }
        Insert: {
          id?: string
          user_id: string
          role: AppRole
        }
        Update: {
          id?: string
          user_id?: string
          role?: AppRole
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          location_id: string | null
          uhid: string
          registered_on: string
          honorific: string | null
          first_name: string
          middle_name: string | null
          last_name: string
          gender: string | null
          mobile_no: string
          aadhaar_no: string | null
          blood_group: string | null
          dob: string | null
          age: number | null
          email: string | null
          alternate_mobile_no: string | null
          occupation: string | null
          org_name: string | null
          address: string | null
          locality: string | null
          pincode: string | null
          city: string | null
          district: string | null
          state: string | null
          country: string | null
          has_insurance: boolean | null
          insurance_provider: string | null
          insurance_policy_no: string | null
          insurance_validity: string | null
          insurance_coverage_amount: number | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          athlete_type: string | null
          vip_tier: string | null
          is_vip: boolean | null
          referral_source: string | null
          referral_source_detail: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          location_id?: string | null
          uhid: string
          registered_on?: string
          honorific?: string | null
          first_name: string
          middle_name?: string | null
          last_name: string
          gender?: string | null
          mobile_no: string
          aadhaar_no?: string | null
          blood_group?: string | null
          dob?: string | null
          age?: number | null
          email?: string | null
          alternate_mobile_no?: string | null
          occupation?: string | null
          org_name?: string | null
          address?: string | null
          locality?: string | null
          pincode?: string | null
          city?: string | null
          district?: string | null
          state?: string | null
          country?: string | null
          has_insurance?: boolean | null
          insurance_provider?: string | null
          insurance_policy_no?: string | null
          insurance_validity?: string | null
          insurance_coverage_amount?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          athlete_type?: string | null
          vip_tier?: string | null
          is_vip?: boolean | null
          referral_source?: string | null
          referral_source_detail?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          location_id?: string | null
          uhid?: string
          registered_on?: string
          honorific?: string | null
          first_name?: string
          middle_name?: string | null
          last_name?: string
          gender?: string | null
          mobile_no?: string
          aadhaar_no?: string | null
          blood_group?: string | null
          dob?: string | null
          age?: number | null
          email?: string | null
          alternate_mobile_no?: string | null
          occupation?: string | null
          org_name?: string | null
          address?: string | null
          locality?: string | null
          pincode?: string | null
          city?: string | null
          district?: string | null
          state?: string | null
          country?: string | null
          has_insurance?: boolean | null
          insurance_provider?: string | null
          insurance_policy_no?: string | null
          insurance_validity?: string | null
          insurance_coverage_amount?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          athlete_type?: string | null
          vip_tier?: string | null
          is_vip?: boolean | null
          referral_source?: string | null
          referral_source_detail?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          consultant_id: string
          service_type: string
          appointment_date: string
          start_time: string
          end_time: string
          status: Database['public']['Enums']['appointment_status'] | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          consultant_id: string
          service_type: string
          appointment_date: string
          start_time: string
          end_time: string
          status?: Database['public']['Enums']['appointment_status'] | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          consultant_id?: string
          service_type?: string
          appointment_date?: string
          start_time?: string
          end_time?: string
          status?: Database['public']['Enums']['appointment_status'] | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          id: string
          organization_id: string
          name: string
          contact: string
          looking_for: string
          preferred_call_time: string | null
          referral_source: string | null
          status: string
          notes: string | null
          created_at: string
          linked_client_id: string | null
          next_follow_up_at: string | null
          last_interaction_at: string | null
          referral_details: string | null
          work_place: string | null
          expected_revenue: number | null
          probability: number | null
          source: string | null
          stage_id: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          contact: string
          looking_for: string
          preferred_call_time?: string | null
          referral_source?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          linked_client_id?: string | null
          next_follow_up_at?: string | null
          last_interaction_at?: string | null
          referral_details?: string | null
          work_place?: string | null
          expected_revenue?: number | null
          probability?: number | null
          source?: string | null
          stage_id?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          contact?: string
          looking_for?: string
          preferred_call_time?: string | null
          referral_source?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          linked_client_id?: string | null
          next_follow_up_at?: string | null
          last_interaction_at?: string | null
          referral_details?: string | null
          work_place?: string | null
          expected_revenue?: number | null
          probability?: number | null
          source?: string | null
          stage_id?: string | null
        }
        Relationships: []
      }
      enquiry_interactions: {
        Row: {
          id: string
          enquiry_id: string
          interaction_type: string
          response_text: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          enquiry_id: string
          interaction_type: string
          response_text?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          enquiry_id?: string
          interaction_type?: string
          response_text?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      injuries: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          injury_date: string
          region: string
          injury_type: string
          diagnosis: string
          mechanism_of_injury: string | null
          severity: string | null
          status: string
          expected_return_date: string | null
          clinical_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          injury_date: string
          region: string
          injury_type: string
          diagnosis: string
          mechanism_of_injury?: string | null
          severity?: string | null
          status: string
          expected_return_date?: string | null
          clinical_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          injury_date?: string
          region?: string
          injury_type?: string
          diagnosis?: string
          mechanism_of_injury?: string | null
          severity?: string | null
          status?: string
          expected_return_date?: string | null
          clinical_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injuries_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          therapist_id: string | null
          service_type: string
          service_id: string | null
          entitlement_id: string | null
          scheduled_start: string
          scheduled_end: string
          actual_start: string | null
          actual_end: string | null
          status: string
          session_type: string | null
          created_at: string
          updated_at: string
          is_guest: boolean | null
          enquiry_id: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          therapist_id?: string | null
          service_type: string
          service_id?: string | null
          entitlement_id?: string | null
          scheduled_start: string
          scheduled_end: string
          actual_start?: string | null
          actual_end?: string | null
          status?: string
          session_type?: string | null
          created_at?: string
          updated_at?: string
          is_guest?: boolean | null
          enquiry_id?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          therapist_id?: string | null
          service_type?: string
          service_id?: string | null
          entitlement_id?: string | null
          scheduled_start?: string
          scheduled_end?: string
          actual_start?: string | null
          actual_end?: string | null
          status?: string
          session_type?: string | null
          created_at?: string
          updated_at?: string
          is_guest?: boolean | null
          enquiry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey",
            columns: ["therapist_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"]
          }
        ]
      }
      physio_session_details: {
        Row: {
          session_id: string
          injury_id: string | null
          pain_score: number | null
          modality_used: string[] | null
          treatment_type: string | null
          manual_therapy: string | null
          exercise_given: string | null
          range_of_motion: string | null
          strength_progress: string | null
          clinical_notes: string | null
          next_plan: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          session_id: string
          injury_id?: string | null
          pain_score?: number | null
          modality_used?: string[] | null
          treatment_type?: string | null
          manual_therapy?: string | null
          exercise_given?: string | null
          range_of_motion?: string | null
          strength_progress?: string | null
          clinical_notes?: string | null
          next_plan?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          session_id?: string
          injury_id?: string | null
          pain_score?: number | null
          modality_used?: string[] | null
          treatment_type?: string | null
          manual_therapy?: string | null
          exercise_given?: string | null
          range_of_motion?: string | null
          strength_progress?: string | null
          clinical_notes?: string | null
          next_plan?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "physio_session_details_session_id_fkey",
            columns: ["session_id"],
            isOneToOne: true,
            referencedRelation: "sessions",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physio_session_details_injury_id_fkey",
            columns: ["injury_id"],
            isOneToOne: false,
            referencedRelation: "injuries",
            referencedColumns: ["id"]
          }
        ]
      }
      training_programs: {
        Row: {
          id: string
          org_id: string
          coach_id: string
          name: string
          description: string | null
          sport_tags: string[] | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          coach_id: string
          name: string
          description?: string | null
          sport_tags?: string[] | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          coach_id?: string
          name?: string
          description?: string | null
          sport_tags?: string[] | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_assignments: {
        Row: {
          id: string
          org_id: string
          program_id: string
          athlete_id: string
          assigned_by: string
          start_date: string
          end_date: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          program_id: string
          athlete_id: string
          assigned_by: string
          start_date: string
          end_date?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          program_id?: string
          athlete_id?: string
          assigned_by?: string
          start_date?: string
          end_date?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      workout_days: {
        Row: {
          id: string
          org_id: string
          program_id: string | null
          scheduled_date: string | null
          title: string | null
          notes: string | null
          is_rest_day: boolean | null
          display_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          program_id?: string | null
          scheduled_date?: string | null
          title?: string | null
          notes?: string | null
          is_rest_day?: boolean | null
          display_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          program_id?: string | null
          scheduled_date?: string | null
          title?: string | null
          notes?: string | null
          is_rest_day?: boolean | null
          display_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_items: {
        Row: {
          id: string
          org_id: string
          workout_day_id: string
          item_type: string
          display_order: number | null
          is_recurring: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          workout_day_id: string
          item_type: string
          display_order?: number | null
          is_recurring?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          workout_day_id?: string
          item_type?: string
          display_order?: number | null
          is_recurring?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wellness_logs: {
        Row: {
          id: string
          athlete_id: string | null
          sleep_score: number | null
          stress_level: number | null
          soreness_level: number | null
          fatigue_level: number | null
          soreness_data: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          athlete_id?: string | null
          sleep_score?: number | null
          stress_level?: number | null
          soreness_level?: number | null
          fatigue_level?: number | null
          soreness_data?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string | null
          sleep_score?: number | null
          stress_level?: number | null
          soreness_level?: number | null
          fatigue_level?: number | null
          soreness_data?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          organization_id: string
          name: string
          category: string | null
          default_session_duration: number | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          category?: string | null
          default_session_duration?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          category?: string | null
          default_session_duration?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          id: string
          organization_id: string
          name: string
          price: number
          description: string | null
          created_at: string
          deleted_at: string | null
          validity_days: number | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          price?: number
          description?: string | null
          created_at?: string
          deleted_at?: string | null
          validity_days?: number | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          price?: number
          description?: string | null
          created_at?: string
          deleted_at?: string | null
          validity_days?: number | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          package_id: string | null
          referral_source_id: string | null
          amount: number
          discount: number
          total: number
          notes: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          transaction_id: string | null
          payment_method: string | null
          billing_staff_name: string | null
          billed_by_id: string | null
          billed_by_name: string | null
          invoice_number: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          package_id?: string | null
          referral_source_id?: string | null
          amount?: number
          discount?: number
          total?: number
          notes?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          transaction_id?: string | null
          payment_method?: string | null
          billing_staff_name?: string | null
          billed_by_id?: string | null
          billed_by_name?: string | null
          invoice_number?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          package_id?: string | null
          referral_source_id?: string | null
          amount?: number
          discount?: number
          total?: number
          notes?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          transaction_id?: string | null
          payment_method?: string | null
          billing_staff_name?: string | null
          billed_by_id?: string | null
          billed_by_name?: string | null
          invoice_number?: string | null
        }
        Relationships: []
      }
      package_services: {
        Row: {
          id: string
          package_id: string
          service_id: string
          sessions_included: number
          created_at: string
        }
        Insert: {
          id?: string
          package_id: string
          service_id: string
          sessions_included?: number
          created_at?: string
        }
        Update: {
          id?: string
          package_id?: string
          service_id?: string
          sessions_included?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey",
            columns: ["package_id"],
            isOneToOne: false,
            referencedRelation: "packages",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey",
            columns: ["service_id"],
            isOneToOne: false,
            referencedRelation: "services",
            referencedColumns: ["id"]
          }
        ]
      }
      injury_master_data: {
        Row: {
          id: string
          organization_id: string
          region: string
          injury_type: string
          diagnosis: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          region: string
          injury_type: string
          diagnosis: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          region?: string
          injury_type?: string
          diagnosis?: string
          created_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          preferred_date: string
          preferred_time_slot: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          preferred_date: string
          preferred_time_slot: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          preferred_date?: string
          preferred_time_slot?: string
          status?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"]
          }
        ]
      }
      client_admin_notes: {
        Row: {
          id: string
          client_id: string
          remarks: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          remarks: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          remarks?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      client_organizations: {
        Row: {
          id: string
          organization_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      referral_sources: {
        Row: {
          id: string
          organization_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          id: string
          client_id: string
          organization_id: string
          document_name: string
          document_type: string | null
          file_path: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          organization_id: string
          document_name: string
          document_type?: string | null
          file_path: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          organization_id?: string
          document_name?: string
          document_type?: string | null
          file_path?: string
          created_at?: string
        }
        Relationships: []
      }
      org_invoice_sequences: {
        Row: {
          organization_id: string
          last_sequence: number
          prefix: string
          updated_at: string
        }
        Insert: {
          organization_id: string
          last_sequence?: number
          prefix?: string
          updated_at?: string
        }
        Update: {
          organization_id?: string
          last_sequence?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_platform_metrics: {
        Args: {}
        Returns: {
          total_organizations: number
          active_organizations: number
          disabled_organizations: number
          total_locations: number
          total_consultants: number
        }
      }
      get_platform_organizations: {
        Args: {}
        Returns: {
          id: string
          name: string
          org_code: string
          slug: string | null
          subscription_plan: string | null
          status: string | null
          created_at: string
          location_count: number
          consultant_count: number
          client_count: number
        }[]
      }
      update_organization_status: {
        Args: {
          p_org_id: string
          p_status: string
        }
        Returns: void
      }
      is_org_active: {
        Args: {
          p_org_id: string
        }
        Returns: boolean
      }
      generate_uhid: {
        Args: {
          p_organization_id: string
        }
        Returns: string
      }
      fn_compute_entitlement_balance: {
        Args: {
          p_client_id: string
        }
        Returns: {
          service_id: string
          service_name: string
          total_purchased: number
          sessions_used: number
          sessions_remaining: number
        }[]
      }
    }
  }
}
