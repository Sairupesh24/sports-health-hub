import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, FileText, Trash2, Eye } from "lucide-react";
import AssessmentReport from "./AssessmentReport";

interface AssessmentReportsListProps {
  clientId: string;
  showDelete: boolean;
}

interface SavedReport {
  id: string;
  title: string;
  test_index: number;
  assessment_data: any;
  report_texts: any;
  pain_data: any;
  reassessment_date: string | null;
  created_at: string;
  created_by: string;
}

export function AssessmentReportsList({ clientId, showDelete }: AssessmentReportsListProps) {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch saved reports
  const { data: reports, isLoading, error } = useQuery<SavedReport[]>({
    queryKey: ["client-assessment-reports", clientId],
    queryFn: async () => {
      return apiFetch<SavedReport[]>(`/clinical/assessment-reports/client/${clientId}`);
    },
    enabled: !!clientId,
  });

  const handleDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/clinical/assessment-reports/${reportToDelete.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Report Deleted",
        description: "The assessment report has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-assessment-reports", clientId] });
      setReportToDelete(null);
    } catch (err: any) {
      console.error("Delete Report Error:", err);
      toast({
        title: "Failed to Delete",
        description: err.message || "An error occurred while deleting the report.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Loading assessment reports...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-500 text-sm">
        Failed to load assessment reports: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Saved Assessment Reports
            </CardTitle>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Interactive reports saved in client profile
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
              No saved assessment reports found for this client.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Date Created</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Report Title</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Test Index</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Reassessment Due</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => setSelectedReport(report)}
                    >
                      <TableCell className="font-medium text-sm py-3">
                        {format(new Date(report.created_at), "dd MMM yyyy, hh:mm a")}
                      </TableCell>
                      <TableCell className="text-sm font-semibold uppercase tracking-tight text-slate-800">
                        {report.title}
                      </TableCell>
                      <TableCell className="text-sm text-center font-bold text-slate-600">
                        Test {report.test_index}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.reassessment_date
                          ? format(new Date(report.reassessment_date), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs text-primary font-bold"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          {showDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-red-500 font-bold hover:bg-red-50 hover:text-red-600"
                              onClick={() => setReportToDelete(report)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Viewer Modal */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 border-none bg-slate-50 dark:bg-slate-950">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase italic">
                <FileText className="w-5 h-5 text-primary animate-pulse" />
                <span>Interactive Assessment Report Viewer</span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <AssessmentReport
                role="admin" // default role, doesn't restrict read-only components
                initialData={selectedReport.assessment_data}
                initialActiveTestIndex={selectedReport.test_index}
                initialPainData={selectedReport.pain_data}
                initialReassessmentDate={selectedReport.reassessment_date || ""}
                initialReportTexts={selectedReport.report_texts}
                initialReportTitle={selectedReport.title}
                readOnly={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold uppercase italic text-red-600">Delete Assessment Report?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">
              Are you sure you want to permanently delete the saved report{" "}
              <strong>"{reportToDelete?.title}" (Test {reportToDelete?.test_index})</strong>?
              This action cannot be undone and will remove it permanently from the client's profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold h-10 text-xs uppercase">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold h-10 text-xs uppercase"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
