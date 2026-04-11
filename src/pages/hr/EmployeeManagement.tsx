import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  Calendar, 
  Plus, 
  Search,
  Filter,
  UserPlus
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function EmployeeManagement() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["hr-employees", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select(`
          *,
          profiles:profile_id (*),
          jobs:job_id (*)
        `)
        .eq("organization_id", profile?.organization_id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Staff Management</h1>
            <p className="text-slate-500 mt-1">Manage employee directory, contracts, and leave requests.</p>
          </div>
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" /> Add Employee
          </Button>
        </div>

        <Tabs defaultValue="directory" className="space-y-6">
          <TabsList className="bg-white border text-slate-500">
            <TabsTrigger value="directory" className="gap-2 px-6">
              <Users className="w-4 h-4" /> Directory
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2 px-6">
              <FileText className="w-4 h-4" /> Contracts
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-2 px-6">
              <Calendar className="w-4 h-4" /> Leave Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            <Card className="border-none shadow-xl overflow-hidden rounded-xl bg-white">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search by name, role, or ID..." 
                    className="pl-10 h-11 bg-slate-50 border-none shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" /> Filters
                </Button>
              </div>
              
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Employee</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Job Position</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Type</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Joined On</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider h-12 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp: any) => (
                      <TableRow key={emp.id} className="hover:bg-slate-50 transition-colors border-slate-100 h-16 cursor-pointer">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {emp.profiles?.first_name?.[0]}{emp.profiles?.last_name?.[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{emp.profiles?.first_name} {emp.profiles?.last_name}</span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{emp.profiles?.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-slate-700">{emp.jobs?.name || 'Unassigned'}</span>
                        </TableCell>
                        <TableCell>
                           <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold uppercase text-[9px]">
                             {emp.employment_type || 'N/A'}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 font-medium">
                          {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : '--'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-wider text-primary">View Profile</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {employees.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <Users className="w-10 h-10 text-slate-200" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No employees found in directory</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts">
             <Card className="border-none shadow-xl bg-white p-20 text-center">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Contract Management</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2">View and manage fixed-salary employment contracts. This feature is integrated with the payroll engine.</p>
                <Button className="mt-6 gap-2" variant="outline">
                   <Plus className="w-4 h-4" /> Create New Contract
                </Button>
             </Card>
          </TabsContent>

          <TabsContent value="leaves">
             <Card className="border-none shadow-xl bg-white p-20 text-center">
                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Leave Management</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2">Track annual, sick, and casual leave requests. Approved leaves automatically sync with clinic scheduling.</p>
                <Button className="mt-6 gap-2" variant="outline">
                   <Calendar className="w-4 h-4" /> View Leave Calendar
                </Button>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
