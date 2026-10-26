import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Search,
  Plus,
  Edit3,
  Globe,
  Lock,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
  History,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  Stethoscope,
  Activity,
  Dumbbell,
  Apple,
  CalendarDays,
  Building2,
  ShieldCheck,
  Orbit,
  MessageSquare,
  Users,
  X,
  Maximize2,
  Save,
  Check,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderMinus,
  Home,
  ArrowLeft,
  ArrowRight,
  ListTree,
  Compass,
  CornerDownRight,
  HelpCircle,
  Laptop,
  CreditCard,
  UserCheck,
  HeartPulse,
  PlusCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";

export interface KBArticle {
  id: string;
  category: string;
  section_number?: string;
  parent_id?: string | null;
  title: string;
  slug?: string;
  description: string;
  content: string;
  module_href?: string;
  tags?: string[];
  sort_order: number;
  is_published: boolean;
  author_name?: string;
  author_email?: string;
  author_profession?: string;
  author_avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface KBRevision {
  id: string;
  article_id: string;
  editor_name: string;
  editor_role: string;
  change_summary: string;
  is_published_state: boolean;
  created_at: string;
}

export interface TreeNode {
  id: string;
  article: KBArticle;
  section_number: string;
  title: string;
  depth: number;
  children: TreeNode[];
}

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: Layers },
  { id: "getting_started", label: "Getting Started", icon: Sparkles },
  { id: "foe", label: "Front Desk & Reception", icon: CalendarDays },
  { id: "clinical", label: "Clinical & Physio", icon: Stethoscope },
  { id: "sports_scientist", label: "Athlete Science", icon: Dumbbell },
  { id: "ams", label: "Activity Monitoring (AMS)", icon: Activity },
  { id: "nutritionist", label: "Nutrition & Diet", icon: Apple },
  { id: "admin", label: "Administration & Billing", icon: Building2 },
  { id: "hr", label: "HR & Workforce", icon: Users },
  { id: "planner", label: "OrbitFlow Planner", icon: Orbit },
  { id: "teamcomms", label: "TeamComms Messenger", icon: MessageSquare },
  { id: "settings", label: "Settings & Security", icon: ShieldCheck },
];

// Helper to compare decimal section numbers: 1 < 1.1 < 1.1.1 < 1.2 < 2 < 2.1
function compareSectionNumbers(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const partsA = a.split(".").map(n => parseInt(n, 10));
  const partsB = b.split(".").map(n => parseInt(n, 10));
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = isNaN(partsA[i]) ? -1 : partsA[i];
    const numB = isNaN(partsB[i]) ? -1 : partsB[i];
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

// Helper to automatically compute the next decimal section number under any parent
// E.g., under parent "1.1", if "1.1.1" and "1.1.2" exist, returns "1.1.3"
// E.g., under parent "1", if "1.1", "1.2", "1.3" exist, returns "1.4"
// E.g., at root level (parent = null), if "1".."9" exist, returns "10"
function calculateNextSection(articlesList: KBArticle[], parentSec?: string | null): string {
  if (!parentSec) {
    const roots = articlesList
      .map(a => a.section_number)
      .filter((s): s is string => Boolean(s && !s.includes(".")))
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n));
    const max = roots.length > 0 ? Math.max(...roots) : 0;
    return String(max + 1);
  }

  const prefix = `${parentSec}.`;
  const childNums = articlesList
    .map(a => a.section_number)
    .filter((s): s is string => Boolean(s && s.startsWith(prefix)))
    .map(s => s.slice(prefix.length))
    .filter(rest => !rest.includes("."))
    .map(s => parseInt(s, 10))
    .filter(n => !isNaN(n));

  const max = childNums.length > 0 ? Math.max(...childNums) : 0;
  return `${prefix}${max + 1}`;
}

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, roles } = useAuth();

  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [treeFilter, setTreeFilter] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Expanded folders in sidebar tree
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "1": true,
    "1.1": true,
    "2": true,
    "3": true
  });

  // Editor Modal States
  const [editorOpen, setEditorOpen] = useState(false);
  const [isNewArticle, setIsNewArticle] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    section_number: "",
    parent_id: "",
    title: "",
    category: "getting_started",
    description: "",
    module_href: "",
    content: "",
    is_published: true,
    change_summary: ""
  });
  const [savingArticle, setSavingArticle] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<KBArticle | null>(null);
  const [deleteCascade, setDeleteCascade] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lightbox Preview State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Revision History Drawer
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<KBRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Load articles on mount
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{
        success: boolean;
        can_edit: boolean;
        stats: { total: number; published: number; drafts: number };
        articles: KBArticle[];
      }>("/knowledge-base/articles");

      if (res.success) {
        const sorted = (res.articles || []).sort((a, b) => compareSectionNumbers(a.section_number, b.section_number));
        setArticles(sorted);
        setCanEdit(Boolean(res.can_edit));

        // Auto-select article only if explicit query param exists
        const requestedId = searchParams.get("article") || searchParams.get("topic");
        if (requestedId && sorted.some(a => a.id === requestedId)) {
          setSelectedArticleId(requestedId);
        } else {
          // If no param, land gracefully on Home landing view!
          setSelectedArticleId(null);
        }
      }
    } catch (err: any) {
      toast({
        title: "Could not load Knowledge Base",
        description: err.message || "Please check your network connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical Tree from flat articles
  const articleTree = useMemo(() => {
    const sorted = [...articles].sort((a, b) => compareSectionNumbers(a.section_number, b.section_number));
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create node wrappers
    sorted.forEach(art => {
      const sec = art.section_number || art.id;
      const depth = sec.includes(".") ? sec.split(".").length - 1 : 0;
      nodeMap.set(sec, {
        id: art.id,
        article: art,
        section_number: sec,
        title: art.title,
        depth,
        children: []
      });
    });

    // Link parent-children
    sorted.forEach(art => {
      const sec = art.section_number || art.id;
      const node = nodeMap.get(sec);
      if (!node) return;

      if (sec.includes(".")) {
        const parentSec = sec.substring(0, sec.lastIndexOf("."));
        const parentNode = nodeMap.get(parentSec);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [articles]);

  // Current Active Article
  const currentArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    return articles.find(a => a.id === selectedArticleId) || null;
  }, [articles, selectedArticleId]);

  // Select an article and update URL query
  const handleSelectArticle = (id: string | null) => {
    setSelectedArticleId(id);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) {
        next.set("article", id);
      } else {
        next.delete("article");
        next.delete("topic");
      }
      return next;
    });

    // Auto expand ancestors when an article is chosen
    if (id) {
      const art = articles.find(a => a.id === id);
      if (art?.section_number) {
        const parts = art.section_number.split(".");
        let accum = "";
        const nextExpanded = { ...expandedNodes };
        parts.forEach((p, idx) => {
          accum = idx === 0 ? p : `${accum}.${p}`;
          nextExpanded[accum] = true;
        });
        setExpandedNodes(nextExpanded);
      }
    }
  };

  // Toggle tree node expansion
  const toggleNodeExpand = (secNum: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [secNum]: !prev[secNum]
    }));
  };

  const handleExpandAll = () => {
    const all: Record<string, boolean> = {};
    articles.forEach(a => {
      if (a.section_number) {
        all[a.section_number] = true;
      }
    });
    setExpandedNodes(all);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Breadcrumbs calculation
  const breadcrumbs = useMemo(() => {
    if (!currentArticle) return [{ label: "Home", id: null }];

    const crumbs: { label: string; id: string | null; section?: string }[] = [
      { label: "Home", id: null }
    ];

    if (currentArticle.section_number) {
      const parts = currentArticle.section_number.split(".");
      let running = "";
      parts.forEach((p, i) => {
        running = i === 0 ? p : `${running}.${p}`;
        const match = articles.find(a => a.section_number === running);
        if (match) {
          crumbs.push({
            label: `${match.section_number} ${match.title}`,
            id: match.id,
            section: match.section_number
          });
        }
      });
    } else {
      crumbs.push({ label: currentArticle.title, id: currentArticle.id });
    }

    return crumbs;
  }, [currentArticle, articles]);

  // Next and Previous articles in flat sequence
  const { prevArticle, nextArticle } = useMemo(() => {
    if (!currentArticle) return { prevArticle: null, nextArticle: null };
    const idx = articles.findIndex(a => a.id === currentArticle.id);
    return {
      prevArticle: idx > 0 ? articles[idx - 1] : null,
      nextArticle: idx >= 0 && idx < articles.length - 1 ? articles[idx + 1] : null
    };
  }, [articles, currentArticle]);

  // Suggested next number for current article
  const suggestedNextForCurrent = useMemo(() => {
    if (!currentArticle?.section_number) {
      return { parent: null, nextNumber: calculateNextSection(articles, null), isSibling: false };
    }
    const sec = currentArticle.section_number;
    // If it's a 3-level leaf like "1.1.2", parent is "1.1", next is "1.1.3"
    if (sec.split(".").length >= 3) {
      const parent = sec.substring(0, sec.lastIndexOf("."));
      return { parent, nextNumber: calculateNextSection(articles, parent), isSibling: true };
    }
    // If it's a 2-level folder like "1.1", subtopic under it is "1.1.3"
    return { parent: sec, nextNumber: calculateNextSection(articles, sec), isSibling: false };
  }, [currentArticle, articles]);

  // Open Editor for Creating New Article with intelligent auto-numbering
  const handleOpenNewModal = (parentSec?: string) => {
    setIsNewArticle(true);
    const nextSec = calculateNextSection(articles, parentSec);

    // Find parent category if known
    let defaultCat = "getting_started";
    if (parentSec) {
      const parentArt = articles.find(a => a.section_number === parentSec);
      if (parentArt) defaultCat = parentArt.category;
    }

    setEditForm({
      id: "",
      section_number: nextSec,
      parent_id: parentSec || "",
      title: "",
      category: defaultCat,
      description: "",
      module_href: "",
      content: "<h3>1. Overview & Step-by-Step Instructions</h3>\n<p>Explain the process clearly here...</p>\n\n<p>Add screenshots or photos below each paragraph.</p>",
      is_published: false,
      change_summary: "Initial draft creation"
    });
    setEditorOpen(true);
  };

  // Open Editor for Modifying Current Article
  const handleOpenEditModal = (article: KBArticle) => {
    setIsNewArticle(false);
    setEditForm({
      id: article.id,
      section_number: article.section_number || "",
      parent_id: article.parent_id || "",
      title: article.title,
      category: article.category,
      description: article.description || "",
      module_href: article.module_href || "",
      content: article.content,
      is_published: article.is_published,
      change_summary: ""
    });
    setEditorOpen(true);
  };

  // Delete Article Handler
  const handleDeleteArticle = async (article: KBArticle, cascade: boolean = false) => {
    try {
      setDeleting(true);
      const url = cascade
        ? `/knowledge-base/articles/${article.id}?cascade=true`
        : `/knowledge-base/articles/${article.id}`;

      await apiFetch(url, { method: "DELETE" });

      toast({
        title: "Article Deleted",
        description: `"${article.title}" has been permanently removed.`
      });

      setDeleteConfirmOpen(false);
      setArticleToDelete(null);

      // If active article was deleted, return to Home
      if (selectedArticleId === article.id) {
        handleSelectArticle(null);
      }

      await fetchArticles();
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete article.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  // Save Article (Draft or Published)
  const handleSaveArticle = async (forcePublishState?: boolean) => {
    if (!editForm.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    try {
      setSavingArticle(true);
      const isPublished = forcePublishState !== undefined ? forcePublishState : editForm.is_published;

      if (isNewArticle) {
        const res = await apiFetch<{ success: boolean; article: KBArticle }>("/knowledge-base/articles", {
          method: "POST",
          data: {
            ...editForm,
            is_published: isPublished,
            change_summary: editForm.change_summary.trim() || (isPublished ? "Created and published article" : "Saved new draft")
          }
        });

        if (res.success) {
          toast({
            title: isPublished ? "Article Published Live!" : "Draft Saved",
            description: isPublished ? "This guide is now visible across your organization." : "Draft saved privately. You can resume writing anytime."
          });
          setEditorOpen(false);
          await fetchArticles();
          setSelectedArticleId(res.article.id);
        }
      } else {
        const res = await apiFetch<{ success: boolean; article: KBArticle }>(`/knowledge-base/articles/${editForm.id}`, {
          method: "PUT",
          data: {
            ...editForm,
            is_published: isPublished,
            change_summary: editForm.change_summary.trim() || (isPublished ? "Updated & published article" : "Saved draft update")
          }
        });

        if (res.success) {
          toast({
            title: isPublished ? "Guide Updated & Published" : "Draft Updated",
            description: isPublished ? "Live guide updated successfully." : "Draft progress saved."
          });
          setEditorOpen(false);
          await fetchArticles();
        }
      }
    } catch (err: any) {
      toast({
        title: "Failed to save article",
        description: err.message || "An error occurred while saving.",
        variant: "destructive"
      });
    } finally {
      setSavingArticle(false);
    }
  };

  // Quick Toggle Publish / Unpublish directly from Viewer
  const handleQuickTogglePublish = async (article: KBArticle) => {
    try {
      const targetState = !article.is_published;
      await apiFetch(`/knowledge-base/articles/${article.id}`, {
        method: "PUT",
        data: {
          is_published: targetState,
          change_summary: targetState ? "Published article live" : "Unpublished article back to draft"
        }
      });

      toast({
        title: targetState ? "Article Published" : "Article Unpublished",
        description: targetState
          ? "This guide is now accessible to all users."
          : "Article moved to draft mode. Only editors can view it."
      });

      await fetchArticles();
    } catch (err: any) {
      toast({
        title: "Status change failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Image Upload Handler
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);

      const res = await apiFetch<{ success: boolean; url: string }>("/knowledge-base/upload", {
        method: "POST",
        body: formData
      });

      if (res.success && res.url) {
        const snippet = `\n<figure class="my-4"><img src="${res.url}" alt="${file.name}" class="rounded-xl border border-slate-200 shadow-sm max-w-full cursor-zoom-in" /><figcaption class="text-xs text-slate-500 mt-1 italic">${file.name}</figcaption></figure>\n`;
        setEditForm(prev => ({
          ...prev,
          content: prev.content + snippet
        }));
        toast({ title: "Image Uploaded", description: "Image inserted into article." });
      }
    } catch (err: any) {
      toast({
        title: "Image Upload Failed",
        description: err.message || "Could not upload image.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Clipboard Paste for Images
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageUpload(file);
          toast({ title: "Pasting Image...", description: "Uploading image from clipboard." });
          return;
        }
      }
    }
  };

  // Load Revision History
  const handleOpenRevisions = async (articleId: string) => {
    try {
      setLoadingRevisions(true);
      setRevisionsOpen(true);
      const res = await apiFetch<{ success: boolean; revisions: KBRevision[] }>(`/knowledge-base/articles/${articleId}/revisions`);
      if (res.success) {
        setRevisions(res.revisions || []);
      }
    } catch (err: any) {
      toast({
        title: "Could not load revision logs",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Filter tree nodes if treeFilter is active
  const filterMatchesNode = (node: TreeNode, query: string): boolean => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    if (
      node.section_number.toLowerCase().includes(q) ||
      node.title.toLowerCase().includes(q) ||
      (node.article.description && node.article.description.toLowerCase().includes(q))
    ) {
      return true;
    }
    return node.children.some(child => filterMatchesNode(child, query));
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode) => {
    if (treeFilter && !filterMatchesNode(node, treeFilter)) {
      return null;
    }

    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = treeFilter ? true : Boolean(expandedNodes[node.section_number]);
    const isSelected = selectedArticleId === node.id;
    const isDraft = !node.article.is_published;

    return (
      <div key={node.section_number} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs cursor-pointer transition-all duration-150 relative",
            isSelected
              ? "bg-emerald-50 text-emerald-950 font-semibold border-l-2 border-emerald-600 shadow-sm"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
            node.depth === 0 && "font-medium text-slate-900 mt-1",
            node.depth === 1 && "pl-5",
            node.depth === 2 && "pl-8"
          )}
          onClick={() => handleSelectArticle(node.id)}
        >
          {/* Chevron expand/collapse toggle */}
          {hasChildren ? (
            <button
              type="button"
              className="p-0.5 -ml-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpand(node.section_number);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5 h-3.5 -ml-1 inline-flex items-center justify-center text-slate-300">
              •
            </span>
          )}

          {/* Folder or Document Icon */}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-emerald-600" : "text-amber-500")} />
            ) : (
              <Folder className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-emerald-600" : "text-amber-500")} />
            )
          ) : (
            <FileText className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-emerald-600" : "text-slate-400")} />
          )}

          {/* Section Number Badge */}
          <span
            className={cn(
              "font-mono text-[11px] shrink-0 px-1 py-0.2 rounded",
              node.depth === 0
                ? "bg-slate-200/80 font-bold text-slate-800"
                : "text-slate-500 font-semibold"
            )}
          >
            {node.section_number}
          </span>

          {/* Title */}
          <span className="truncate flex-1 text-[12px] leading-tight" title={node.title}>
            {node.title}
          </span>

          {/* Draft Tag if unpublished */}
          {isDraft && (
            <span className="shrink-0 text-[9px] uppercase px-1 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
              Draft
            </span>
          )}

          {/* Quick Hover Actions for Editors (Add subtopic, Delete) */}
          {canEdit && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-auto transition-opacity pl-1 bg-inherit">
              <button
                type="button"
                title={`Add subtopic under ${node.section_number}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenNewModal(node.section_number);
                }}
                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-200/80 rounded"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                title={`Delete ${node.section_number}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setArticleToDelete(node.article);
                  setDeleteCascade(hasChildren);
                  setDeleteConfirmOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Children sub-tree */}
        {hasChildren && isExpanded && (
          <div className="relative pl-1 border-l border-slate-200/70 ml-3.5 my-0.5 space-y-0.5">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Chapter cards for the clean Landing Page
  const chapterCards = useMemo(() => {
    return [
      {
        section: "1",
        title: "1. Set-up, Sign-up and Log-in",
        desc: "System requirements, account activation, staff invitations, and secure authentication.",
        icon: Laptop,
        color: "emerald",
        subtopics: ["1.1 Set-up", "1.2 Sign-up", "1.3 Log-in"],
        articleId: "kb-1-setup-signup-login"
      },
      {
        section: "2",
        title: "2. Front Office Executive (FOE) & Reception",
        desc: "Patient arrivals, UHID creation, practitioner calendar booking, and point-of-sale billing.",
        icon: CalendarDays,
        color: "teal",
        subtopics: ["2.1 Patient Intake", "2.2 Appointment Booking", "2.3 Fast Billing"],
        articleId: "kb-2-foe-reception"
      },
      {
        section: "3",
        title: "3. Clinical Case Sheet & Physical Therapy",
        desc: "Subjective pain scales, 2D/3D anatomical body mapping, ROM/MMT, and rehab protocols.",
        icon: Stethoscope,
        color: "blue",
        subtopics: ["3.1 Subjective Assessment", "3.2 Body Mapping & ROM", "3.3 Rehab Plans"],
        articleId: "kb-3-clinical-physio"
      },
      {
        section: "4",
        title: "4. Sports Science & Testing Batteries",
        desc: "Force plate countermovement jumps (CMJ), timing gate sprints, and dynamometry norms.",
        icon: Dumbbell,
        color: "indigo",
        subtopics: ["4.1 CMJ Force Plates", "4.2 Timing Gate Sprints", "4.3 Dynamometry"],
        articleId: "kb-4-sports-science"
      },
      {
        section: "5",
        title: "5. Athlete Management System (AMS)",
        desc: "Morning readiness traffic lights, session RPE load tracking, and ACWR injury risk monitoring.",
        icon: Activity,
        color: "purple",
        subtopics: ["5.1 Daily Readiness", "5.2 Training Load & ACWR", "5.3 Workout Builder"],
        articleId: "kb-5-ams-athlete-management"
      },
      {
        section: "6",
        title: "6. Sports Nutrition & Dietary Management",
        desc: "ISAK 8-site skinfold callipers, macronutrient distribution, and WADA compliance.",
        icon: Apple,
        color: "rose",
        subtopics: ["6.1 Body Composition", "6.2 Meal Planning & Supplements"],
        articleId: "kb-6-sports-nutrition"
      },
      {
        section: "7",
        title: "7. HRMS, Staff Attendance & Permissions",
        desc: "Digital duty clock-in/out, shift scheduling, leave approvals, and role permissions.",
        icon: Users,
        color: "amber",
        subtopics: ["7.1 Attendance Logs", "7.2 Leave Requests", "7.3 KB Editor Access"],
        articleId: "kb-7-hrms-attendance"
      },
      {
        section: "8",
        title: "8. OrbitFlow & Team Collaboration",
        desc: "Interdisciplinary task boards, clinical case handoffs, and secure team messaging.",
        icon: Orbit,
        color: "sky",
        subtopics: ["8.1 OrbitFlow Board", "8.2 TeamComms Messenger"],
        articleId: "kb-8-orbitflow-collaboration"
      },
      {
        section: "9",
        title: "9. Administration & Security",
        desc: "Multi-tenant clinic isolation, immutable audit logs, and version control revisions.",
        icon: ShieldCheck,
        color: "slate",
        subtopics: ["9.1 Tenant Setup", "9.2 KB Revisions & Audit Logs"],
        articleId: "kb-9-admin-security"
      }
    ];
  }, []);

  return (
    <div className="h-screen w-full overflow-y-auto scroll-smooth bg-slate-50/60 font-sans text-slate-800 flex flex-col">
      {/* 1. Global Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 cursor-pointer"
            onClick={() => handleSelectArticle(null)}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">ISHPO</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                Knowledge Base
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 leading-none hidden sm:block">
              Integrated Sports Health and Physio Operating System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Editor Action: Create Guide */}
          {canEdit && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-1.5 h-8 text-xs"
              onClick={() => handleOpenNewModal()}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Guide</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-slate-200 hover:bg-slate-100 text-slate-700 h-8 text-xs gap-1.5"
          >
            <Link to="/app-gallery">
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              <span>App Gallery</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* 2. Main Two-Column Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 gap-4 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Folder Directory Tree (Confluence/GitBook Style) */}
        {/* ========================================================= */}
        <aside className="w-72 lg:w-80 shrink-0 sticky top-16 bg-white border border-slate-200/90 rounded-2xl shadow-xs p-3 flex flex-col max-h-[calc(100vh-80px)] overflow-hidden">
          {/* Directory Title & Expand/Collapse controls */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <ListTree className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Directory
              </span>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {articles.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-slate-400 hover:text-slate-700"
                title="Expand All"
                onClick={handleExpandAll}
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-slate-400 hover:text-slate-700"
                title="Collapse All"
                onClick={handleCollapseAll}
              >
                <FolderMinus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Quick Filter Input */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={treeFilter}
              onChange={(e) => setTreeFilter(e.target.value)}
              placeholder="Filter topics (e.g. 1.1, FOE)..."
              className="pl-8 text-xs h-7.5 bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-emerald-500"
            />
            {treeFilter && (
              <button
                type="button"
                onClick={() => setTreeFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Home Link (Always available at top of directory) */}
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2.5 mb-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150",
              selectedArticleId === null
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            )}
            onClick={() => handleSelectArticle(null)}
          >
            <Home className={cn("w-3.5 h-3.5", selectedArticleId === null ? "text-white" : "text-emerald-600")} />
            <span>Knowledge Base Home</span>
          </div>

          {/* Scrollable Tree Items */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading directory...</div>
            ) : articleTree.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No guides found.</div>
            ) : (
              articleTree.map(node => renderTreeNode(node))
            )}
          </div>

          {/* Editor Status Footer */}
          {canEdit && (
            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Editor Mode Active
              </span>
              <button
                onClick={() => handleOpenNewModal()}
                className="hover:text-emerald-600 font-semibold cursor-pointer"
              >
                + Add Topic
              </button>
            </div>
          )}
        </aside>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Content Pane (Landing View or Article Detail) */}
        {/* ========================================================= */}
        <main className="flex-1 min-w-0 bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 lg:p-8 pb-32">
          {/* Breadcrumb Bar */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 flex-wrap pb-3 border-b border-slate-100">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                <button
                  type="button"
                  onClick={() => handleSelectArticle(crumb.id)}
                  className={cn(
                    "hover:text-emerald-600 hover:underline transition-colors text-left font-medium",
                    idx === breadcrumbs.length - 1 ? "text-slate-900 font-semibold" : "text-slate-500"
                  )}
                >
                  {crumb.label}
                </button>
              </div>
            ))}
          </nav>

          {/* ========================================================= */}
          {/* VIEW A: LANDING PAGE (Clean, Welcoming & Uncrowded)        */}
          {/* ========================================================= */}
          {selectedArticleId === null ? (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Welcoming Hero Header */}
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                  Home
                </h1>
                <p className="mt-1 text-base text-slate-600">
                  Welcome to the <strong className="text-slate-900">ISHPO Knowledge Base</strong>
                </p>
                <p className="mt-1 text-sm text-slate-500 max-w-2xl leading-relaxed">
                  Integrated Sports Health and Physio Operating System — Comprehensive operating manual, clinical documentation standards, athletic testing batteries, and workflow guides.
                </p>
              </div>

              {/* Welcoming Panoramic Cover Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-md aspect-video max-h-80 bg-slate-900">
                <img
                  src="/images/ishpo_kb_banner.jpg"
                  alt="ISHPO High-Performance Center"
                  className="w-full h-full object-cover brightness-95 hover:scale-101 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-white">
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white w-fit text-[11px] uppercase tracking-wider mb-2 font-bold">
                    Official System Guide
                  </Badge>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Central User Manual & Operational Protocols
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                    Select any topic from the directory on the left or click on a chapter below to inspect standard operating procedures and workflows.
                  </p>
                </div>
              </div>

              {/* Quick Search Bar */}
              <div className="relative max-w-xl">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all SOPs, workflows, or codes (e.g. 1.1 Set-up, FOE, CMJ)..."
                  className="pl-10 h-10 text-sm bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Live Search Quick Results (if user types in search bar) */}
              {searchQuery.trim() && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Search Results ({articles.filter(a =>
                      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (a.section_number && a.section_number.includes(searchQuery)) ||
                      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    ).length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {articles
                      .filter(a =>
                        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.section_number && a.section_number.includes(searchQuery)) ||
                        (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .slice(0, 6)
                      .map(a => (
                        <div
                          key={a.id}
                          onClick={() => handleSelectArticle(a.id)}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer transition-all shadow-xs"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            {a.section_number && (
                              <span className="font-mono text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded text-[11px]">
                                {a.section_number}
                              </span>
                            )}
                            <span className="truncate">{a.title}</span>
                          </div>
                          {a.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{a.description}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Chapter Directory Grid (Clean, Card-Based Navigation) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Browse by Chapter
                    </h2>
                    <p className="text-xs text-slate-500">
                      Structured hierarchical guide covering every operational aspect of ISHPO.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chapterCards.map(chap => {
                    const IconComponent = chap.icon;
                    return (
                      <Card
                        key={chap.section}
                        onClick={() => handleSelectArticle(chap.articleId)}
                        className="group border border-slate-200 hover:border-emerald-500/80 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden rounded-xl bg-white"
                      >
                        <CardContent className="p-4 flex flex-col h-full justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100">
                                <IconComponent className="w-4 h-4" />
                              </span>
                              <Badge variant="secondary" className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100">
                                Topic {chap.section}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                              {chap.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                              {chap.desc}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="flex flex-wrap gap-1 mb-2">
                              {chap.subtopics.map((st, i) => (
                                <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {st}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                              <span>Explore Chapter</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Quick-Start Essentials */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    New to ISHPO? Start with Topic 1
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Review hardware compatibility, clinic tenant profile configuration, user role provisioning, and authentication protocols in <strong>1. Set-up, Sign-up and Log-in</strong>.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSelectArticle("kb-1-setup-signup-login")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shrink-0 shadow-sm gap-1"
                >
                  <span>Open Topic 1</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* VIEW B: ARTICLE DETAIL VIEW                               */
            /* ========================================================= */
            currentArticle && (
              <article className="animate-in fade-in duration-150">
                {/* Article Header */}
                <div className="pb-5 mb-6 border-b border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentArticle.section_number && (
                        <Badge className="font-mono text-xs font-bold bg-emerald-600 text-white border-none px-2 py-0.5">
                          Section {currentArticle.section_number}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs uppercase font-bold tracking-wider text-slate-600 border-slate-200">
                        {currentArticle.category.replace("_", " ")}
                      </Badge>
                      {currentArticle.is_published ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Live Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Lock className="w-3 h-3 text-amber-600" />
                          Draft (Editor Only)
                        </span>
                      )}
                    </div>

                    {/* Action Bar (if user can edit) */}
                    {canEdit && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Intelligent + Add Subtopic button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenNewModal(suggestedNextForCurrent.parent || currentArticle.section_number)}
                          className="h-8 text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 gap-1.5 font-semibold"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+ Add {suggestedNextForCurrent.nextNumber} Next</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickTogglePublish(currentArticle)}
                          className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          <span>{currentArticle.is_published ? "Unpublish to Draft" : "Publish Live"}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditModal(currentArticle)}
                          className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Guide</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenRevisions(currentArticle.id)}
                          className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>History</span>
                        </Button>

                        {/* Delete Guide Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setArticleToDelete(currentArticle);
                            const hasChildren = articles.some(a => a.section_number?.startsWith(`${currentArticle.section_number}.`));
                            setDeleteCascade(hasChildren);
                            setDeleteConfirmOpen(true);
                          }}
                          className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 gap-1.5 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {currentArticle.title}
                  </h1>

                  {currentArticle.description && (
                    <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {currentArticle.description}
                    </p>
                  )}

                  {/* Metadata and Link to Live Module */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Author: {currentArticle.author_name || "System Admin"}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Last updated: {format(new Date(currentArticle.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </span>
                    </div>

                    {currentArticle.module_href && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-7 text-xs border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 font-semibold gap-1"
                      >
                        <Link to={currentArticle.module_href}>
                          <span>Open Live Screen</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Article Content Render */}
                <div
                  className="prose prose-slate max-w-none text-slate-800 leading-7 text-base space-y-4
                    prose-headings:font-bold prose-headings:text-slate-900 prose-headings:tracking-tight
                    prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h3:mt-6
                    prose-p:my-2 prose-p:leading-relaxed
                    prose-ul:list-disc prose-ul:pl-5 prose-li:my-1
                    prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1
                    prose-hr:my-6 prose-hr:border-slate-200
                    prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-emerald-800 prose-code:font-mono prose-code:text-sm
                    prose-table:w-full prose-table:border-collapse prose-table:my-4
                    prose-img:rounded-xl prose-img:border prose-img:border-slate-200 prose-img:shadow-sm prose-img:cursor-zoom-in"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG") {
                      setLightboxUrl((target as HTMLImageElement).src);
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: currentArticle.content }}
                />

                {/* Previous & Next Article Navigation Footer */}
                <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {prevArticle ? (
                    <Button
                      variant="outline"
                      onClick={() => handleSelectArticle(prevArticle.id)}
                      className="w-full sm:w-auto h-auto py-2.5 px-4 border-slate-200 hover:bg-slate-50 text-left flex items-center gap-3 rounded-xl"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Previous Topic</div>
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {prevArticle.section_number && `${prevArticle.section_number} `}{prevArticle.title}
                        </div>
                      </div>
                    </Button>
                  ) : <div />}

                  {nextArticle && (
                    <Button
                      variant="outline"
                      onClick={() => handleSelectArticle(nextArticle.id)}
                      className="w-full sm:w-auto h-auto py-2.5 px-4 border-slate-200 hover:bg-slate-50 text-right flex items-center gap-3 rounded-xl ml-auto"
                    >
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Next Topic</div>
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {nextArticle.section_number && `${nextArticle.section_number} `}{nextArticle.title}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </Button>
                  )}
                </div>

                {/* Helpful feedback card */}
                <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Was this guide helpful in operating ISHPO?</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toast({ title: "Thank you for your feedback!" })}
                      className="h-7 text-xs hover:bg-emerald-100 hover:text-emerald-800"
                    >
                      👍 Yes
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toast({ title: "Feedback noted", description: "Our editorial team will review this guide." })}
                      className="h-7 text-xs hover:bg-rose-100 hover:text-rose-800"
                    >
                      👎 No
                    </Button>
                  </div>
                </div>
              </article>
            )
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* 3. LIGHTBOX PREVIEW MODAL                                 */}
      {/* ========================================================= */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img src={lightboxUrl} alt="Enlarged view" className="max-h-[85vh] w-auto rounded-lg shadow-2xl object-contain mx-auto" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. REVISION HISTORY DRAWER DIALOG                        */}
      {/* ========================================================= */}
      <Dialog open={revisionsOpen} onOpenChange={setRevisionsOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="w-5 h-5 text-emerald-600" />
              <span>Guide Edit History & Audit Logs</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Every edit, publish toggle, and modification is immutably timestamped for regulatory compliance.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 my-4">
            {loadingRevisions ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading audit history...</div>
            ) : revisions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No revisions recorded yet.</div>
            ) : (
              revisions.map((rev) => (
                <div key={rev.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {rev.editor_name || "Staff Member"} ({rev.editor_role || "Staff"})
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {format(new Date(rev.created_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <p className="text-slate-600 italic">"{rev.change_summary || "Updated content"}"</p>
                  <div className="pt-1 flex items-center gap-2 text-[10px]">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded font-bold uppercase",
                      rev.is_published_state ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {rev.is_published_state ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRevisionsOpen(false)}>
              Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 5. IN-APP GUIDE AUTHORING & EDITING MODAL                */}
      {/* ========================================================= */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              <span>{isNewArticle ? "Create New Knowledge Base Guide" : "Edit User Guide & SOP"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Supports decimal folder codes (e.g. 1.1, 1.1.3), rich text instructions, step-by-step images, and draft saving.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-2 text-xs">
            {/* Quick Auto-Number Suggestions (When Creating New) */}
            {isNewArticle && (
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Quick suggestions:
                </span>
                {["1.1", "1.2", "1.3", "2", "3", "4", "5"].map((parentCode) => {
                  const calculated = calculateNextSection(articles, parentCode);
                  const parentArt = articles.find(a => a.section_number === parentCode);
                  return (
                    <button
                      key={parentCode}
                      type="button"
                      onClick={() => {
                        setEditForm(prev => ({
                          ...prev,
                          section_number: calculated,
                          parent_id: parentCode,
                          category: parentArt ? parentArt.category : prev.category
                        }));
                      }}
                      className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors"
                      title={parentArt ? `Add under ${parentArt.title}` : ""}
                    >
                      {calculated} (under {parentCode})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Section Number
                  <span className="text-[10px] font-normal text-slate-400 ml-1">(e.g. 1.1.3)</span>
                </label>
                <Input
                  value={editForm.section_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, section_number: e.target.value }))}
                  placeholder="e.g. 1.1.3"
                  className="font-mono h-8 text-xs font-bold text-emerald-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Guide Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Hardware & Browser Requirements"
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
                <Select
                  value={editForm.category}
                  onValueChange={(val) => setEditForm(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.id !== "all").map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Direct Module Link (Optional)</label>
                <Input
                  value={editForm.module_href}
                  onChange={(e) => setEditForm(prev => ({ ...prev, module_href: e.target.value }))}
                  placeholder="e.g. /admin/foe or /consultant"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Brief Summary</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="1-2 sentences summarizing the procedure..."
                className="h-8 text-xs"
              />
            </div>

            {/* Media Upload Helper Bar */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Add Step-by-Step Images</span>
                <span className="text-[11px] text-slate-500">
                  Upload screenshot files or paste directly from clipboard (Ctrl + V).
                </span>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs gap-1.5 border-slate-300"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                </Button>
              </div>
            </div>

            {/* Article Content Editor Area */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Article Body (HTML / Markdown supported)
              </label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                onPaste={handleEditorPaste}
                rows={12}
                placeholder="Write your guide instructions here... Paste images with Ctrl+V"
                className="font-mono text-xs leading-relaxed focus-visible:ring-emerald-500"
              />
            </div>

            {/* Audit Change Summary */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Change Summary Note (Recorded in Audit Log)
              </label>
              <Input
                value={editForm.change_summary}
                onChange={(e) => setEditForm(prev => ({ ...prev, change_summary: e.target.value }))}
                placeholder="e.g. Added section on browser GPU acceleration"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between w-full">
            <div>
              {!isNewArticle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditorOpen(false);
                    const art = articles.find(a => a.id === editForm.id);
                    if (art) {
                      setArticleToDelete(art);
                      setDeleteConfirmOpen(true);
                    }
                  }}
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete This Guide</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={savingArticle}
                onClick={() => handleSaveArticle(false)}
                className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                Save as Draft
              </Button>
              <Button
                size="sm"
                disabled={savingArticle}
                onClick={() => handleSaveArticle(true)}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                Publish Live
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 6. DELETE CONFIRMATION DIALOG                            */}
      {/* ========================================================= */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Knowledge Base Article?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900 font-semibold">
                {articleToDelete?.section_number ? `[${articleToDelete.section_number}] ` : ""}
                "{articleToDelete?.title}"
              </strong>?
              <br /><br />
              This action cannot be undone. An audit record will be logged with your account details.
            </DialogDescription>
          </DialogHeader>

          {/* Cascade checkbox if article has child subtopics */}
          {articles.some(a => articleToDelete?.section_number && a.section_number?.startsWith(`${articleToDelete.section_number}.`)) && (
            <div className="p-3 my-2 rounded-lg bg-amber-50 border border-amber-200 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteCascade}
                  onChange={(e) => setDeleteCascade(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-amber-900 font-medium">
                  Also delete all nested subtopics under {articleToDelete?.section_number}
                </span>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setArticleToDelete(null);
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleting}
              onClick={() => articleToDelete && handleDeleteArticle(articleToDelete, deleteCascade)}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? "Deleting..." : "Delete Permanently"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
