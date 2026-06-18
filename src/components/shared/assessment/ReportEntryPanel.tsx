import React, { useState, useRef } from "react";
import { parseAssessmentXLS, ParsedAssessmentData } from "./XlsParser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Upload, AlertTriangle, Loader2, RefreshCw, X, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Client {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  honorific?: string;
  uhid: string;
  gender?: string;
}

interface ReportEntryPanelProps {
  clients?: Client[];
  onParseSuccess: (data: ParsedAssessmentData, clientName: string, clientId?: string, clientGender?: string) => void;
}

export default function ReportEntryPanel({ clients = [], onParseSuccess }: ReportEntryPanelProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [freetextName, setFreetextName] = useState("");
  const [isFreetextConfirmed, setIsFreetextConfirmed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // File states
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [tempParsedData, setTempParsedData] = useState<ParsedAssessmentData | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [uploadFilename, setUploadFilename] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered clients list
  const filteredClients = clients.filter(c => {
    const fullName = [c.honorific, c.first_name, c.middle_name, c.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || c.uhid.toLowerCase().includes(query);
  });

  const getClientFullName = (c: Client) => {
    return [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
  };

  const handleSelectClient = (c: Client) => {
    setSelectedClient(c);
    setSearchQuery("");
    setParseError(null);
  };

  const handleConfirmFreetext = () => {
    if (freetextName.trim()) {
      setIsFreetextConfirmed(true);
      setParseError(null);
    }
  };

  const handleResetClient = () => {
    setSelectedClient(null);
    setFreetextName("");
    setIsFreetextConfirmed(false);
    setSearchQuery("");
    setTempParsedData(null);
    setShowWarning(false);
    setParseError(null);
  };

  // Upload and Parse handlers
  const handleFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xls" && extension !== "xlsx") {
      toast({
        title: "Invalid File Type",
        description: "Please upload an .xls or .xlsx file only.",
        variant: "destructive",
      });
      return;
    }

    setUploadFilename(file.name);
    setLoading(true);
    setParseError(null);
    setTempParsedData(null);
    setShowWarning(false);

    try {
      const parsed = await parseAssessmentXLS(file);
      const activeName = selectedClient ? getClientFullName(selectedClient) : freetextName;
      
      // Name cross-check case-insensitive
      const match = parsed.client.name.toLowerCase().replace(/\s+/g, "") === 
                    activeName.toLowerCase().replace(/\s+/g, "");

      if (!match) {
        setTempParsedData(parsed);
        setShowWarning(true);
      } else {
        onParseSuccess(parsed, activeName, selectedClient?.id, selectedClient?.gender);
      }
    } catch (err: any) {
      setParseError(err.message || "Could not parse this file.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (loading) return;
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleContinueAnyway = () => {
    if (tempParsedData) {
      const activeName = selectedClient ? getClientFullName(selectedClient) : freetextName;
      onParseSuccess(tempParsedData, activeName, selectedClient?.id, selectedClient?.gender);
    }
  };

  const handleReupload = () => {
    setTempParsedData(null);
    setShowWarning(false);
    setUploadFilename("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isClientSelected = selectedClient !== null || isFreetextConfirmed;
  const activeClientLabel = selectedClient 
    ? `${getClientFullName(selectedClient)} (${selectedClient.uhid})`
    : freetextName;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Search/Select Client */}
      <Card className="gradient-card border-border">
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-bold font-display text-foreground uppercase tracking-tight">
            Generate Assessment Report
          </h2>

          {!isClientSelected ? (
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Select Client</Label>
              {clients.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search or select client by name or UHID..."
                      className="pl-9 bg-white dark:bg-slate-900 border-border"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {searchQuery && (
                    <div className="border rounded-xl bg-white dark:bg-slate-900 max-h-48 overflow-y-auto shadow-md divide-y divide-border">
                      {filteredClients.length > 0 ? (
                        filteredClients.map(c => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectClient(c)}
                            className="flex justify-between items-center px-4 py-2.5 hover:bg-primary/5 cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">{getClientFullName(c)}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{c.uhid}</p>
                            </div>
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full">
                              Select
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No matching clients found
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show quick-select list of first few active clients */}
                  {!searchQuery && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {clients.slice(0, 4).map(c => (
                        <Button
                          key={c.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectClient(c)}
                          className="text-[10px] h-8 font-bold border-dashed uppercase tracking-wider rounded-xl hover:bg-primary/10 hover:text-primary"
                        >
                          <User className="w-3 h-3 mr-1.5" />
                          {c.first_name} {c.last_name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Freetext Autocomplete fallback if standalone */
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter client's full name..."
                    className="bg-white border-border"
                    value={freetextName}
                    onChange={(e) => setFreetextName(e.target.value)}
                  />
                  <Button onClick={handleConfirmFreetext} className="rounded-xl font-bold uppercase text-xs">
                    Confirm
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border border-primary/20 bg-primary/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-black font-display italic">
                  {activeClientLabel.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-foreground">{activeClientLabel}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selected Client</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetClient}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-wider h-8"
              >
                Change
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card
        className={`border-border ${
          !isClientSelected ? "opacity-50 pointer-events-none bg-slate-50 dark:bg-slate-900/10" : "gradient-card"
        }`}
      >
        <CardContent className="pt-6 space-y-4">
          <Label className="text-sm font-semibold">Upload Assessment File</Label>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-3xl space-y-3 bg-white/20 dark:bg-slate-900/20" role="status">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Analysing {uploadFilename}...
              </p>
            </div>
          ) : showWarning ? (
            <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-3xl p-6 space-y-4" role="alert">
              <div className="flex items-start gap-3 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">Client Name Mismatch</h3>
                  <p className="text-xs mt-1 leading-relaxed">
                    The name listed inside this file is **{tempParsedData?.client.name}**, which does not match your selected client (**{activeClientLabel}**).
                  </p>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider mt-1.5">
                    Please verify before importing this assessment sheet.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={handleReupload} className="rounded-xl text-xs font-bold h-9">
                  Re-upload
                </Button>
                <Button onClick={handleContinueAnyway} className="rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white h-9 shadow-md shadow-amber-500/10">
                  Continue Anyway
                </Button>
              </div>
            </div>
          ) : parseError ? (
            <div className="border border-red-200 bg-red-50 dark:bg-red-950/10 rounded-3xl p-6 space-y-4" role="alert">
              <div className="flex items-start gap-3 text-red-800 dark:text-red-200">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">Analysis Failed</h3>
                  <p className="text-xs mt-1 leading-relaxed">{parseError}</p>
                  <p className="text-[10px] opacity-75 mt-1.5">
                    Ensure the workbook has the sheets: Customer information, Mobility, Strength, Strength balance.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button variant="destructive" onClick={handleReupload} className="rounded-xl text-xs font-bold h-9">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/40 rounded-3xl p-10 text-center cursor-pointer transition-all bg-white/30 dark:bg-slate-900/10 hover:bg-primary/5 flex flex-col items-center justify-center space-y-3 shadow-inner"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xls,.xlsx"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-foreground uppercase tracking-tight">
                  Drop assessment sheet here
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                  or click to browse from local files
                </p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pt-1 block">
                Accepts CSSH assessment exports only
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
