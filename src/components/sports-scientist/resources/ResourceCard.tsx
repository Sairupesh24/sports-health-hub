import { format } from "date-fns";
import { 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Trash2, 
  ExternalLink, 
  Download, 
  User, 
  Calendar,
  FileBadge
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ResourceCardProps {
  resource: any;
  onDelete: () => void;
}

const CATEGORY_STYLES: Record<string, { bg: string, text: string, icon: any }> = {
  athlete_document: { bg: "bg-blue-500/10", text: "text-blue-600", icon: FileBadge },
  research: { bg: "bg-emerald-500/10", text: "text-emerald-600", icon: FileText },
  video: { bg: "bg-rose-500/10", text: "text-rose-600", icon: Video },
  other: { bg: "bg-slate-500/10", text: "text-slate-600", icon: LinkIcon },
};

export function ResourceCard({ resource, onDelete }: ResourceCardProps) {
  const style = CATEGORY_STYLES[resource.category] || CATEGORY_STYLES.other;
  const CategoryIcon = style.icon;

  const handleOpen = async () => {
    if (resource.resource_type === 'link') {
      window.open(resource.url, '_blank');
    } else {
      // For files, get the public URL or signed URL
      const { data } = await supabase.storage
        .from("scientist-resources")
        .getPublicUrl(resource.url);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    }
  };

  const handleDownload = async () => {
    if (resource.resource_type !== 'file') return;

    try {
      const { data, error } = await supabase.storage
        .from("scientist-resources")
        .download(resource.url);

      if (error) throw error;

      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("Download error:", error);
    }
  };

  return (
    <Card className="group bg-white border-slate-100 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-[28px] overflow-hidden flex flex-col h-full relative">
      <CardHeader className="pb-3 space-y-4">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-2xl ${style.bg} transition-colors group-hover:scale-110 duration-500`}>
            <CategoryIcon className={`w-6 h-6 ${style.text}`} />
          </div>
          <div className="flex gap-2">
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(); }}
               className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
               title="Delete Resource"
             >
               <Trash2 className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none ${style.bg} ${style.text}`}>
            {resource.category.replace('_', ' ')}
          </Badge>
          <CardTitle 
            className="text-lg font-black leading-tight text-slate-900 group-hover:text-primary transition-colors cursor-pointer line-clamp-2 min-h-[3rem]"
            onClick={handleOpen}
          >
            {resource.title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {resource.description && (
            <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3 bg-slate-50 p-3 rounded-2xl border border-slate-100/50 italic italic-notes">
              "{resource.description}"
            </p>
          )}

          {resource.athlete && (
            <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-primary/5 border border-primary/10">
              <User className="w-3.5 h-3.5 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Associated Lead</span>
                <span className="text-xs font-bold text-slate-700">{resource.athlete.first_name} {resource.athlete.last_name}</span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
            <Calendar className="w-3 h-3" />
            {format(new Date(resource.created_at), "MMM d, yyyy")}
          </div>
          
          <div className="flex gap-2">
            {resource.resource_type === 'file' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 px-3 rounded-xl text-primary hover:bg-primary/5 font-bold gap-2 text-xs"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl border-slate-200 hover:border-primary/30 hover:bg-primary/5 text-slate-600 hover:text-primary font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm"
              onClick={handleOpen}
            >
              {resource.resource_type === 'link' ? "Open Link" : "View File"} 
              {resource.resource_type === 'link' ? <ExternalLink className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
