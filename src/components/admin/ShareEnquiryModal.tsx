import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Share2, 
  Download, 
  Globe, 
  MessageCircle, 
  Stethoscope, 
  Sparkles,
  Link2
} from "lucide-react";

interface ShareEnquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug?: string | null;
  orgName?: string | null;
}

export function ShareEnquiryModal({
  open,
  onOpenChange,
  orgSlug,
  orgName = "ISHPO Clinic"
}: ShareEnquiryModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const effectiveSlug = orgSlug || 'default';
  const directLink = `${baseUrl}/enquiry/${effectiveSlug}`;

  const campaignChannels = [
    {
      id: "instagram",
      label: "Instagram Bio / Story",
      source: "Instagram",
      icon: Globe,
      color: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
      description: "Auto-tags enquiry source as 'Instagram'"
    },
    {
      id: "whatsapp",
      label: "WhatsApp Blast / Status",
      source: "WhatsApp",
      icon: MessageCircle,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
      description: "Auto-tags enquiry source as 'WhatsApp'"
    },
    {
      id: "google",
      label: "Google Business / Ads",
      source: "Google Search",
      icon: Globe,
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      description: "Auto-tags enquiry source as 'Google Search'"
    },
    {
      id: "referral",
      label: "Doctor / Partner Referral",
      source: "Professional Referral",
      icon: Stethoscope,
      color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      description: "Auto-tags enquiry source as 'Professional Referral'"
    },
    {
      id: "reception",
      label: "Clinic Reception QR",
      source: "Reception Desk",
      icon: QrCode,
      color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
      description: "Auto-tags enquiry source as 'Reception Desk'"
    }
  ];

  const handleCopy = (text: string, key: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({
        title: "Link Copied!",
        description: `${label} has been copied to your clipboard.`,
      });
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(directLink)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold text-slate-900">
                Share Enquiry Form
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Collect new patient leads via direct link, social campaigns, or reception QR code.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Main Direct Link Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-primary" /> Direct Public Link
              </span>
              <a 
                href={directLink} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                Open Form <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Input 
                value={directLink} 
                readOnly 
                className="bg-white font-mono text-xs h-10 select-all border-slate-200"
              />
              <Button 
                onClick={() => handleCopy(directLink, 'direct', 'Direct form link')}
                className="shrink-0 h-10 gap-1.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-4"
              >
                {copiedKey === 'direct' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="campaigns" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="campaigns" className="text-xs font-semibold">
                Campaign-Tagged Links
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-xs font-semibold">
                Printable QR Code
              </TabsTrigger>
            </TabsList>

            {/* Campaign-tagged links */}
            <TabsContent value="campaigns" className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">
                Share pre-tagged links so when prospective patients enquire, their referral source is auto-attributed without manual entry.
              </p>

              <div className="space-y-2">
                {campaignChannels.map((channel) => {
                  const taggedUrl = `${directLink}?source=${encodeURIComponent(channel.source)}`;
                  const isCopied = copiedKey === channel.id;

                  return (
                    <div 
                      key={channel.id}
                      className="p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border ${channel.color} shrink-0`}>
                          <channel.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{channel.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">{channel.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(taggedUrl, channel.id, channel.label)}
                          className="h-8 text-xs font-semibold gap-1 hover:bg-slate-50"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-[11px]">Copy Link</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* QR Code Tab */}
            <TabsContent value="qr" className="mt-4">
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-center space-y-4">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
                  <img 
                    src={qrImageUrl} 
                    alt="Enquiry Form QR Code" 
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{orgName} Enquiry QR</h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Print and display on reception desk cards, marketing flyers, or event popups.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a href={qrImageUrl} download={`${effectiveSlug}-enquiry-qr.png`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                      <Download className="w-3.5 h-3.5" /> Download QR
                    </Button>
                  </a>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleCopy(directLink, 'qr_url', 'QR code link')}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Target URL
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

