import CaseRepoPage from "./CaseRepoPage";
import type { Database } from "@/integrations/supabase/types";

export type InjuryOverview = Database['public']['Tables']['injuries']['Row'] & {
    client: {
        id: string;
        first_name: string;
        middle_name?: string;
        last_name: string;
        honorific?: string;
    } | null;
};

export default CaseRepoPage;
