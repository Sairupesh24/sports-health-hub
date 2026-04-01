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
      appointment_history: {
        Row: {
          appointment_id: string
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["appointment_status"]
          previous_status:
            | Database["public"]["Enums"]["appointment_status"]
            | null
        }
        Insert: {
          appointment_id: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["appointment_status"]
          previous_status?:
            | Database["public"]["Enums"]["appointment_status"]
            | null
        }
        Update: {
          appointment_id?: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["appointment_status"]
          previous_status?:
            | Database["public"]["Enums"]["appointment_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          client_id: string
          consultant_id: string
          created_at: string | null
          created_by: string | null
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          service_type: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          client_id: string
          consultant_id: string
          created_at?: string | null
          created_by?: string | null
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          service_type: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          client_id?: string
          consultant_id?: string
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          service_type?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_external_mapping: {
        Row: {
          client_id: string
          created_at: string | null
          external_athlete_id: string
          external_system: string
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          external_athlete_id: string
          external_system?: string
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          external_athlete_id?: string
          external_system?: string
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_external_mapping_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_external_mapping_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          consultant_id: string
          created_at: string | null
          end_time: string | null
          exception_date: string
          id: string
          is_blocked: boolean | null
          organization_id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          consultant_id: string
          created_at?: string | null
          end_time?: string | null
          exception_date: string
          id?: string
          is_blocked?: boolean | null
          organization_id: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          consultant_id?: string
          created_at?: string | null
          end_time?: string | null
          exception_date?: string
          id?: string
          is_blocked?: boolean | null
          organization_id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          discount: number
          id: string
          notes: string | null
          organization_id: string
          package_id: string | null
          payment_method: string | null
          referral_source_id: string | null
          status: string
          total: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount?: number
          id?: string
          notes?: string | null
          organization_id: string
          package_id?: string | null
          payment_method?: string | null
          referral_source_id?: string | null
          status?: string
          total?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount?: number
          id?: string
          notes?: string | null
          organization_id?: string
          package_id?: string | null
          payment_method?: string | null
          referral_source_id?: string | null
          status?: string
          total?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_referral_source_id_fkey"
            columns: ["referral_source_id"]
            isOneToOne: false
            referencedRelation: "referral_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignment_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          client_id: string
          created_at: string | null
          id: string
          new_consultant_id: string | null
          previous_consultant_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          new_consultant_id?: string | null
          previous_consultant_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          new_consultant_id?: string | null
          previous_consultant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_assignment_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignment_history_new_consultant_id_fkey"
            columns: ["new_consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignment_history_previous_consultant_id_fkey"
            columns: ["previous_consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          document_name: string
          document_type: string | null
          file_path: string
          id: string
          organization_id: string
          uploaded_by: string | null
          category: Database["public"]["Enums"]["document_category"] | null
          access_level: string | null
          uploaded_by_role: string | null
          notes: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          document_name: string
          document_type?: string | null
          file_path: string
          id?: string
          organization_id: string
          uploaded_by?: string | null
          category?: Database["public"]["Enums"]["document_category"] | null
          access_level?: string | null
          uploaded_by_role?: string | null
          notes?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          document_name?: string
          document_type?: string | null
          file_path?: string
          id?: string
          organization_id?: string
          uploaded_by?: string | null
          category?: Database["public"]["Enums"]["document_category"] | null
          access_level?: string | null
          uploaded_by_role?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_entitlements: {
        Row: {
          client_id: string
          created_at: string | null
          default_sessions: number
          granted_sessions: number
          id: string
          invoice_id: string | null
          notes: string | null
          organization_id: string
          package_id: string | null
          service_type: string
          sessions_used: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          default_sessions: number
          granted_sessions: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id: string
          package_id?: string | null
          service_type: string
          sessions_used?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          default_sessions?: number
          granted_sessions?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string
          package_id?: string | null
          service_type?: string
          sessions_used?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_entitlements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_field_config: {
        Row: {
          field_name: string
          id: string
          is_mandatory: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          field_name: string
          id?: string
          is_mandatory?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          field_name?: string
          id?: string
          is_mandatory?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_field_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_entitlements: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organization_id: string
          purchase_id: string
          service_id: string
          sessions_allowed: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          purchase_id: string
          service_id: string
          sessions_allowed: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          purchase_id?: string
          service_id?: string
          sessions_allowed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_entitlements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_entitlements_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_entitlements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          aadhaar_no: string | null
          address: string | null
          age: number | null
          alternate_mobile_no: string | null
          blood_group: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          district: string | null
          dob: string | null
          email: string | null
          first_name: string
          gender: string | null
          has_insurance: boolean | null
          honorific: string | null
          id: string
          insurance_coverage_amount: number | null
          insurance_policy_no: string | null
          insurance_provider: string | null
          insurance_validity: string | null
          last_name: string
          locality: string | null
          location_id: string | null
          middle_name: string | null
          mobile_no: string
          occupation: string | null
          org_name: string | null
          organization_id: string
          pincode: string | null
          registered_on: string
          sport: string | null
          state: string | null
          uhid: string
          updated_at: string
        }
        Insert: {
          aadhaar_no?: string | null
          address?: string | null
          age?: number | null
          alternate_mobile_no?: string | null
          blood_group?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          has_insurance?: boolean | null
          honorific?: string | null
          id?: string
          insurance_coverage_amount?: number | null
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          insurance_validity?: string | null
          last_name: string
          locality?: string | null
          location_id?: string | null
          middle_name?: string | null
          mobile_no: string
          occupation?: string | null
          org_name?: string | null
          organization_id: string
          pincode?: string | null
          registered_on?: string
          sport?: string | null
          state?: string | null
          uhid: string
          updated_at?: string
        }
        Update: {
          aadhaar_no?: string | null
          address?: string | null
          age?: number | null
          alternate_mobile_no?: string | null
          blood_group?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          has_insurance?: boolean | null
          honorific?: string | null
          id?: string
          insurance_coverage_amount?: number | null
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          insurance_validity?: string | null
          last_name?: string
          locality?: string | null
          location_id?: string | null
          middle_name?: string | null
          mobile_no?: string
          occupation?: string | null
          org_name?: string | null
          organization_id?: string
          pincode?: string | null
          registered_on?: string
          sport?: string | null
          state?: string | null
          uhid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_availability: {
        Row: {
          buffer_time: number
          consultant_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          max_daily_appointments: number | null
          organization_id: string
          service_type: string | null
          slot_duration_interval: number | null
          start_time: string
        }
        Insert: {
          buffer_time?: number
          consultant_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          max_daily_appointments?: number | null
          organization_id: string
          service_type?: string | null
          slot_duration_interval?: number | null
          start_time: string
        }
        Update: {
          buffer_time?: number
          consultant_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          max_daily_appointments?: number | null
          organization_id?: string
          service_type?: string | null
          slot_duration_interval?: number | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_availability_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_training_summary: {
        Row: {
          client_id: string
          completion_status: string | null
          created_at: string | null
          duration_minutes: number | null
          external_system: string
          id: string
          organization_id: string
          training_date: string
          training_load: number | null
          updated_at: string | null
          workout_name: string | null
        }
        Insert: {
          client_id: string
          completion_status?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          external_system?: string
          id?: string
          organization_id: string
          training_date: string
          training_load?: number | null
          updated_at?: string | null
          workout_name?: string | null
        }
        Update: {
          client_id?: string
          completion_status?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          external_system?: string
          id?: string
          organization_id?: string
          training_date?: string
          training_load?: number | null
          updated_at?: string | null
          workout_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_training_summary_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_training_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_attendance: {
        Row: {
          attendance_status: string
          client_id: string
          created_at: string | null
          id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          attendance_status?: string
          client_id: string
          created_at?: string | null
          id?: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          attendance_status?: string
          client_id?: string
          created_at?: string | null
          id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_attendance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      injuries: {
        Row: {
          client_id: string
          clinical_notes: string | null
          created_at: string | null
          created_by: string | null
          diagnosis: string | null
          expected_return_date: string | null
          id: string
          injury_date: string
          injury_region: string | null
          injury_side: string | null
          injury_type: string | null
          mechanism_of_injury: string | null
          organization_id: string
          region: string | null
          resolved_date: string | null
          severity: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          clinical_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis?: string | null
          expected_return_date?: string | null
          id?: string
          injury_date: string
          injury_region?: string | null
          injury_side?: string | null
          injury_type?: string | null
          mechanism_of_injury?: string | null
          organization_id: string
          region?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          clinical_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis?: string | null
          expected_return_date?: string | null
          id?: string
          injury_date?: string
          injury_region?: string | null
          injury_side?: string | null
          injury_type?: string | null
          mechanism_of_injury?: string | null
          organization_id?: string
          region?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injuries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injuries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_master_data: {
        Row: {
          created_at: string
          diagnosis: string
          id: string
          injury_type: string
          organization_id: string
          region: string
        }
        Insert: {
          created_at?: string
          diagnosis: string
          id?: string
          injury_type: string
          organization_id: string
          region: string
        }
        Update: {
          created_at?: string
          diagnosis?: string
          id?: string
          injury_type?: string
          organization_id?: string
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "injury_master_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          allow_custom_duration: boolean | null
          created_at: string | null
          default_slot_duration: number | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          allow_custom_duration?: boolean | null
          created_at?: string | null
          default_slot_duration?: number | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          allow_custom_duration?: boolean | null
          created_at?: string | null
          default_slot_duration?: number | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          org_code: string
          slug: string
          status: string | null
          subscription_plan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          org_code?: string
          slug: string
          status?: string | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          org_code?: string
          slug?: string
          status?: string | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      package_purchases: {
        Row: {
          bill_id: string | null
          client_id: string
          created_at: string
          expiry_date: string | null
          id: string
          organization_id: string
          package_id: string
          purchase_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          bill_id?: string | null
          client_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          organization_id: string
          package_id: string
          purchase_date?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          bill_id?: string | null
          client_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          organization_id?: string
          package_id?: string
          purchase_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_purchases_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_services: {
        Row: {
          created_at: string
          id: string
          package_id: string
          service_id: string
          sessions_included: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          service_id: string
          sessions_included: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          service_id?: string
          sessions_included?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          price: number
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          price?: number
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          price?: number
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      physio_session_details: {
        Row: {
          clinical_notes: string | null
          created_at: string | null
          exercise_given: string | null
          injury_id: string | null
          manual_therapy: string | null
          modality_used: string | null
          next_plan: string | null
          pain_score: number | null
          range_of_motion: string | null
          session_id: string
          strength_progress: string | null
          treatment_type: string | null
          updated_at: string | null
        }
        Insert: {
          clinical_notes?: string | null
          created_at?: string | null
          exercise_given?: string | null
          injury_id?: string | null
          manual_therapy?: string | null
          modality_used?: string | null
          next_plan?: string | null
          pain_score?: number | null
          range_of_motion?: string | null
          session_id: string
          strength_progress?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Update: {
          clinical_notes?: string | null
          created_at?: string | null
          exercise_given?: string | null
          injury_id?: string | null
          manual_therapy?: string | null
          modality_used?: string | null
          next_plan?: string | null
          pain_score?: number | null
          range_of_motion?: string | null
          session_id?: string
          strength_progress?: string | null
          treatment_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "physio_session_details_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physio_session_details_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_approved: boolean
          last_name: string
          organization_id: string | null
          uhid: string | null
          updated_at: string
          ams_role: "coach" | "athlete" | null
          assigned_consultant_id: string | null
          profession: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string
          id: string
          is_approved?: boolean
          last_name?: string
          organization_id?: string | null
          uhid?: string | null
          updated_at?: string
          ams_role?: "coach" | "athlete" | null
          assigned_consultant_id?: string | null
          profession?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_approved?: boolean
          last_name?: string
          organization_id?: string | null
          uhid?: string | null
          updated_at?: string
          ams_role?: "coach" | "athlete" | null
          assigned_consultant_id?: string | null
          profession?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_uhid"
            columns: ["uhid"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["uhid"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_consultant_id_fkey"
            columns: ["assigned_consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_tests: {
        Row: {
          id: string
          athlete_id: string
          test_type: string
          value: number
          unit: string
          recorded_at: string
          created_at: string | null
          organization_id: string | null
        }
        Insert: {
          id?: string
          athlete_id: string
          test_type: string
          value: number
          unit: string
          recorded_at?: string
          created_at?: string | null
          organization_id?: string | null
        }
        Update: {
          id?: string
          athlete_id?: string
          test_type?: string
          value?: number
          unit?: string
          recorded_at?: string
          created_at?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_tests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      training_sessions: {
        Row: {
          id: string
          athlete_id: string
          session_date: string
          duration_mins: number
          rpe: number
          calculated_load: number
          session_type: string | null
          created_at: string | null
          organization_id: string | null
        }
        Insert: {
          id?: string
          athlete_id: string
          session_date?: string
          duration_mins: number
          rpe: number
          calculated_load?: number
          session_type?: string | null
          created_at?: string | null
          organization_id?: string | null
        }
        Update: {
          id?: string
          athlete_id?: string
          session_date?: string
          duration_mins?: number
          rpe?: number
          calculated_load?: number
          session_type?: string | null
          created_at?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      wellness_logs: {
        Row: {
          id: string
          athlete_id: string
          sleep_score: number
          stress_level: number
          soreness_level: number
          fatigue_level: number
          energy_level: number | null
          notes: string | null
          soreness_data: Json | null
          created_at: string | null
          organization_id: string | null
        }
        Insert: {
          id?: string
          athlete_id: string
          sleep_score: number
          stress_level: number
          soreness_level: number
          fatigue_level: number
          energy_level?: number | null
          notes?: string | null
          soreness_data?: Json | null
          created_at?: string | null
          organization_id?: string | null
        }
        Update: {
          id?: string
          athlete_id?: string
          sleep_score?: number
          stress_level?: number
          soreness_level?: number
          fatigue_level?: number
          energy_level?: number | null
          notes?: string | null
          soreness_data?: Json | null
          created_at?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      referral_sources: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rehab_progress: {
        Row: {
          created_at: string | null
          id: string
          injury_id: string
          milestone: string
          notes: string | null
          organization_id: string
          recorded_by: string | null
          recorded_date: string
          session_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          injury_id: string
          milestone: string
          notes?: string | null
          organization_id: string
          recorded_by?: string | null
          recorded_date?: string
          session_id?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          injury_id?: string
          milestone?: string
          notes?: string | null
          organization_id?: string
          recorded_by?: string | null
          recorded_date?: string
          session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_progress_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      return_to_play: {
        Row: {
          approval_date: string
          approved_by: string | null
          clearance_stage: string
          client_id: string
          created_at: string | null
          id: string
          injury_id: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          approval_date?: string
          approved_by?: string | null
          clearance_stage: string
          client_id: string
          created_at?: string | null
          id?: string
          injury_id: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          approval_date?: string
          approved_by?: string | null
          clearance_stage?: string
          client_id?: string
          created_at?: string | null
          id?: string
          injury_id?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_to_play_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_play_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_play_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_package_items: {
        Row: {
          created_at: string | null
          default_sessions: number
          id: string
          package_id: string
          service_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_sessions?: number
          id?: string
          package_id: string
          service_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_sessions?: number
          id?: string
          package_id?: string
          service_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          default_session_duration: number | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_session_duration?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_session_duration?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_consumption_log: {
        Row: {
          client_id: string
          consumed_by: string | null
          consumed_on: string
          created_at: string
          entitlement_id: string
          id: string
          organization_id: string
          service_id: string
          session_id: string
        }
        Insert: {
          client_id: string
          consumed_by?: string | null
          consumed_on?: string
          created_at?: string
          entitlement_id: string
          id?: string
          organization_id: string
          service_id: string
          session_id: string
        }
        Update: {
          client_id?: string
          consumed_by?: string | null
          consumed_on?: string
          created_at?: string
          entitlement_id?: string
          id?: string
          organization_id?: string
          service_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_consumption_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_consumption_log_consumed_by_fkey"
            columns: ["consumed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_consumption_log_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "client_service_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_consumption_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_consumption_log_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_consumption_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          bill_id: string
          client_id: string
          created_at: string | null
          id: string
          is_entitlement_reversed: boolean | null
          notes: string | null
          organization_id: string
          refund_mode: Database["public"]["Enums"]["refund_mode"]
          refund_proof_url: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bill_id: string
          client_id: string
          created_at?: string | null
          id?: string
          is_entitlement_reversed?: boolean | null
          notes?: string | null
          organization_id: string
          refund_mode: Database["public"]["Enums"]["refund_mode"]
          refund_proof_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          is_entitlement_reversed?: boolean | null
          notes?: string | null
          organization_id?: string
          refund_mode?: Database["public"]["Enums"]["refund_mode"]
          refund_proof_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          entitlement_id: string | null
          id: string
          organization_id: string
          rescheduled_from_session_id: string | null
          rescheduled_to_session_id: string | null
          scheduled_end: string
          scheduled_start: string
          service_id: string | null
          service_type: string
          session_mode: string | null
          session_type: string | null
          status: string
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          entitlement_id?: string | null
          id?: string
          organization_id: string
          rescheduled_from_session_id?: string | null
          rescheduled_to_session_id?: string | null
          scheduled_end: string
          scheduled_start: string
          service_id?: string | null
          service_type: string
          session_mode?: string | null
          session_type?: string | null
          status?: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          entitlement_id?: string | null
          id?: string
          organization_id?: string
          rescheduled_from_session_id?: string | null
          rescheduled_to_session_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          service_id?: string | null
          service_type?: string
          session_mode?: string | null
          session_type?: string | null
          status?: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "client_service_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_rescheduled_from_session_id_fkey"
            columns: ["rescheduled_from_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_rescheduled_to_session_id_fkey"
            columns: ["rescheduled_to_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uhid_sequences: {
        Row: {
          id: string
          last_serial: number
          organization_id: string
          year_month: string
        }
        Insert: {
          id?: string
          last_serial?: number
          organization_id: string
          year_month: string
        }
        Update: {
          id?: string
          last_serial?: number
          organization_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "uhid_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      complete_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      fn_compute_entitlement_balance: {
        Args: { p_client_id: string }
        Returns: {
          service_id: string
          service_name: string
          sessions_remaining: number
          sessions_used: number
          total_purchased: number
        }[]
      }
      generate_org_code: { Args: never; Returns: string }
      generate_uhid: { Args: { p_organization_id: string }; Returns: string }
      get_available_slots: {
        Args: {
          p_consultant_id: string
          p_date: string
          p_org_id: string
          p_service?: string
        }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      get_consultant_session_kpis: {
        Args: { p_end_date: string; p_org_id: string; p_start_date: string }
        Returns: {
          consultant_name: string
          total_completed: number
          total_missed: number
        }[]
      }
      get_my_org_id: { Args: never; Returns: string }
      get_org_by_code: { Args: { p_code: string }; Returns: string }
      get_platform_metrics: { Args: never; Returns: Json }
      get_platform_organizations: {
        Args: never
        Returns: {
          client_count: number
          consultant_count: number
          created_at: string
          id: string
          location_count: number
          name: string
          org_code: string
          slug: string
          status: string
          subscription_plan: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_active: { Args: { p_org_id: string }; Returns: boolean }
      reschedule_session: {
        Args: { p_new_end: string; p_new_start: string; p_session_id: string }
        Returns: string
      }
      update_organization_status: {
        Args: { p_org_id: string; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "consultant" | "client" | "super_admin" | "foe" | "athlete"
      appointment_status:
        | "requested"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
        | "checked_in"
      refund_mode: "Cash" | "Online Bank Transfer" | "UPI" | "Clinic Credit"
      document_category: 
        | "Exercise Charts"
        | "Scan Reports"
        | "Insurance"
        | "Consent Forms"
        | "Prescriptions"
        | "Other"
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
      app_role: ["admin", "consultant", "client", "super_admin", "foe", "athlete"],
      appointment_status: [
        "requested",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
        "checked_in",
      ],
      refund_mode: ["Cash", "Online Bank Transfer", "UPI", "Clinic Credit"],
      document_category: [
        "Exercise Charts",
        "Scan Reports",
        "Insurance",
        "Consent Forms",
        "Prescriptions",
        "Other",
      ],
    },
  },
} as const
