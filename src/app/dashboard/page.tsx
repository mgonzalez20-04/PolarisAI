"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search, Mail, MailOpen, ChevronLeft, ChevronRight, Trash2, CheckCircle, Circle, Tag, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TagBadge } from "@/components/tag-badge";
import { TagsManager } from "@/components/tags-manager";
import { useViewer } from "@/contexts/viewer-context";
import { useTheme } from "@/contexts/theme-context";
import { useAlert } from "@/contexts/alert-context";
import { useDebounce } from "@/hooks/use-debounce";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Email {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  receivedAt: string;
  bodyPreview: string;
  isRead: boolean;
  status: string;
  priority?: string;
  tags?: Array<{
    tag: Tag;
  }>;
  threadCount?: number;
  isThread?: boolean;
  threadEmails?: Email[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function InboxPage() {
  const { setViewerOpen, setSelectedEmailId } = useViewer();
  const { theme } = useTheme();
  const { showAlert, showConfirm } = useAlert();
  const searchParams = useSearchParams();
  const currentFolderId = searchParams.get("folderId");

  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300); // Debounce search for 300ms
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [hoveredEmailId, setHoveredEmailId] = useState<string | null>(null);
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>("Todas las carpetas");
  const [draggingEmailId, setDraggingEmailId] = useState<string | null>(null);

  // Theme-based text colors
  const getTextColors = () => {
    switch (theme) {
      case "light":
        return {
          title: "text-gray-900",
          subtitle: "text-gray-600",
          emailSubject: "text-gray-900",
          emailFrom: "text-gray-700",
          emailPreview: "text-gray-600",
          emailDate: "text-gray-500",
          loading: "text-gray-600",
          emptyText: "text-gray-700",
          emptySubtext: "text-gray-500",
          checkboxLabel: "text-gray-600",
        };
      case "dark":
        return {
          title: "text-gray-100",
          subtitle: "text-gray-400",
          emailSubject: "text-gray-100",
          emailFrom: "text-gray-300",
          emailPreview: "text-gray-400",
          emailDate: "text-gray-500",
          loading: "text-gray-400",
          emptyText: "text-gray-200",
          emptySubtext: "text-gray-400",
          checkboxLabel: "text-gray-400",
        };
      default: // starry
        return {
          title: "text-white",
          subtitle: "text-blue-200/70",
          emailSubject: "text-white",
          emailFrom: "text-blue-200/70",
          emailPreview: "text-blue-200/60",
          emailDate: "text-blue-200/60",
          loading: "text-blue-200/70",
          emptyText: "text-white",
          emptySubtext: "text-blue-200/70",
          checkboxLabel: "text-blue-200/70",
        };
    }
  };

  const textColors = getTextColors();

  // Theme-based button styles
  const getButtonStyles = () => {
    switch (theme) {
      case "light":
        return {
          outline: "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900",
          outlineDisabled: "bg-gray-100 border-gray-200 text-gray-400",
          primary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-blue-500/50",
          active: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg",
          cancel: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
          delete: "bg-white border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300",
          searchInput: "pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20",
          searchIcon: "text-gray-400",
        };
      case "dark":
        return {
          outline: "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white",
          outlineDisabled: "bg-gray-800 border-gray-700 text-gray-500",
          primary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-blue-500/50",
          active: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg",
          cancel: "text-gray-300 hover:bg-gray-700 hover:text-white",
          delete: "bg-gray-800 border-gray-600 text-gray-200 hover:bg-red-900/20 hover:text-red-300 hover:border-red-500/30",
          searchInput: "pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-400 focus:ring-blue-400/20",
          searchIcon: "text-gray-500",
        };
      default: // starry
        return {
          outline: "bg-white/5 border-white/10 text-blue-100/90 hover:bg-white/10 hover:text-white backdrop-blur-sm",
          outlineDisabled: "bg-white/5 border-white/10 text-blue-100/90 disabled:opacity-50 backdrop-blur-sm",
          primary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-blue-500/50",
          active: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg",
          cancel: "text-blue-100/90 hover:bg-white/10 hover:text-white",
          delete: "bg-white/5 border-white/10 text-blue-100/90 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400/30 disabled:opacity-50 backdrop-blur-sm",
          searchInput: "pl-10 bg-slate-800/60 border-blue-400/30 text-white placeholder:text-blue-200/50 focus:border-blue-400 focus:ring-blue-400/30 backdrop-blur-md",
          searchIcon: "text-blue-300/70",
        };
    }
  };

  const buttonStyles = getButtonStyles();

  // Theme-based card styles
  const getCardStyles = (email: Email) => {
    const isSelected = selectedEmails.has(email.id);
    const isUnread = !email.isRead;

    switch (theme) {
      case "light":
        return {
          base: `border shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden ${
            isUnread
              ? "border-l-[6px] border-l-blue-600 bg-gradient-to-r from-blue-50/90 to-white border-blue-200 hover:from-blue-100/90 hover:to-blue-50/50"
              : "border-gray-200 bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:border-gray-300"
          } ${isSelected ? "bg-blue-100 border-blue-400 ring-2 ring-blue-300 shadow-lg shadow-blue-200/50" : ""} hover:scale-[1.01] hover:-translate-y-0.5`,
          checkbox: "border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2",
          checkboxContainer: "bg-white border border-gray-200 rounded hover:border-blue-400",
        };
      case "dark":
        return {
          base: `border shadow-sm hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden ${
            isUnread
              ? "border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-950/40 to-gray-900/90 border-gray-700 hover:from-blue-950/50 hover:to-gray-800"
              : "border-gray-700 bg-gray-800/70 hover:bg-gradient-to-r hover:from-gray-800 hover:to-gray-700/90 hover:border-gray-600"
          } ${isSelected ? "bg-blue-900/40 border-blue-500/50 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/20" : ""} hover:scale-[1.01] hover:-translate-y-0.5`,
          checkbox: "border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-2",
          checkboxContainer: "bg-gray-800 border border-gray-700 rounded hover:border-blue-500",
        };
      default: // starry
        return {
          base: `border transition-all duration-300 rounded-xl overflow-hidden border-white/20 bg-white/10 backdrop-blur-lg hover:bg-white/15 hover:shadow-2xl hover:shadow-blue-500/40 ${
            isUnread ? "border-l-[6px] border-l-blue-400 shadow-xl shadow-blue-500/30 bg-gradient-to-r from-blue-500/15 to-white/10" : ""
          } ${isSelected ? "bg-blue-500/25 border-blue-400/50 ring-2 ring-blue-400/30 shadow-xl shadow-blue-400/40" : ""} hover:scale-[1.01] hover:-translate-y-0.5`,
          checkbox: "border-blue-400/50 text-blue-400 focus:ring-blue-400 focus:ring-2",
          checkboxContainer: "bg-white/5 border border-white/20 rounded hover:border-blue-400",
        };
    }
  };

  const fetchEmails = async (page = 1, skipLoadingState = false) => {
    if (!skipLoadingState) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (currentFolderId) params.set("folderId", currentFolderId);
      params.set("page", page.toString());
      params.set("pageSize", "10");

      const res = await fetch(`/api/emails?${params.toString()}`);
      const data = await res.json();
      setEmails(data.emails || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      if (!skipLoadingState) setLoading(false);
    }
  };

  const loadCurrentFolderName = async () => {
    if (!currentFolderId) {
      setCurrentFolderName("Todas las carpetas");
      return;
    }

    try {
      const res = await fetch("/api/folders");
      const data = await res.json();

      if (data.folders) {
        const folder = data.folders.find((f: any) => f.folderId === currentFolderId);
        if (folder) {
          setCurrentFolderName(folder.displayName);
        } else {
          setCurrentFolderName("Todas las carpetas");
        }
      }
    } catch (error) {
      console.error("Error loading folder name:", error);
      setCurrentFolderName("Todas las carpetas");
    }
  };

  // Initial data load - all fetches in parallel
  // Using debouncedSearch instead of search to avoid excessive fetches while typing
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Fetch emails, tags, and folder name in parallel for faster loading
        await Promise.all([
          fetchEmails(1, true), // Skip loading state since we handle it here
          fetchAvailableTags(),
          loadCurrentFolderName()
        ]);
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [filter, debouncedSearch, currentFolderId]);

  // Reload folder name when folderId changes (already loaded above, but kept for folder changes)
  useEffect(() => {
    if (currentFolderId) {
      loadCurrentFolderName();
    }
  }, [currentFolderId]);

  // Listen for email moved events
  useEffect(() => {
    const handleEmailMoved = (e: CustomEvent) => {
      const { emailId } = e.detail;
      // Remove email from local state
      setEmails((prevEmails) => prevEmails.filter((email) => email.id !== emailId));
      // Update pagination total
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    };

    window.addEventListener("emailMoved", handleEmailMoved as EventListener);
    return () => {
      window.removeEventListener("emailMoved", handleEmailMoved as EventListener);
    };
  }, []);

  const handlePreviousPage = () => {
    if (pagination && pagination.page > 1) {
      fetchEmails(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchEmails(pagination.page + 1);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setAvailableTags(data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const toggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const toggleAllEmailsSelection = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const deleteEmail = async (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening email viewer

    const confirmed = await showConfirm(
      "Eliminar Correo",
      "¿Estás seguro de que quieres eliminar este correo?",
      "warning"
    );

    if (!confirmed) {
      return;
    }

    setDeletingEmailId(emailId);
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove email from local state
        setEmails(emails.filter((email) => email.id !== emailId));
        // Update pagination total
        if (pagination) {
          setPagination({
            ...pagination,
            total: pagination.total - 1,
          });
        }
      } else {
        await showAlert("Error", "Error al eliminar el correo", "error");
      }
    } catch (error) {
      console.error("Error deleting email:", error);
      await showAlert("Error", "Error al eliminar el correo", "error");
    } finally {
      setDeletingEmailId(null);
    }
  };

  const handleBulkToggleRead = async () => {
    const selectedEmailsData = emails.filter(e => selectedEmails.has(e.id));

    // Check if majority are read - we want to toggle to the opposite
    const readCount = selectedEmailsData.filter(e => e.isRead).length;
    const shouldMarkAsRead = readCount < selectedEmailsData.length / 2;

    try {
      await Promise.all(
        Array.from(selectedEmails).map(emailId =>
          fetch(`/api/emails/${emailId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: shouldMarkAsRead }),
          })
        )
      );

      // Update local state without full reload
      setEmails(emails.map(email =>
        selectedEmails.has(email.id) ? { ...email, isRead: shouldMarkAsRead } : email
      ));
      // Don't deselect - keep selection active
    } catch (error) {
      console.error("Error marking emails:", error);
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await showConfirm(
      "Eliminar Correos",
      `¿Estás seguro de que quieres eliminar ${selectedEmails.size} correo(s)?`,
      "warning"
    );

    if (!confirmed) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedEmails).map(emailId =>
          fetch(`/api/emails/${emailId}`, {
            method: "DELETE",
          })
        )
      );

      // Update local state without full reload
      setEmails(emails.filter(email => !selectedEmails.has(email.id)));
      setPagination(prev => ({ ...prev, total: prev.total - selectedEmails.size }));
      // Clear selection after delete since emails are gone
      setSelectedEmails(new Set());
    } catch (error) {
      console.error("Error deleting emails:", error);
    }
  };

  const handleBulkToggleTag = async (tagId: string) => {
    // Get selected emails data
    const selectedEmailsData = emails.filter(e => selectedEmails.has(e.id));

    // Check if ALL selected emails have this tag
    const allHaveTag = selectedEmailsData.every(email =>
      email.tags?.some(et => et.tag.id === tagId)
    );

    // Find the tag object
    const tagObj = availableTags.find(t => t.id === tagId);
    if (!tagObj) return;

    try {
      if (allHaveTag) {
        // Remove tag from all
        await Promise.all(
          Array.from(selectedEmails).map(emailId =>
            fetch(`/api/emails/${emailId}/tags/${tagId}`, {
              method: "DELETE",
            })
          )
        );

        // Update local state
        setEmails(emails.map(email =>
          selectedEmails.has(email.id)
            ? { ...email, tags: email.tags?.filter(et => et.tag.id !== tagId) }
            : email
        ));
      } else {
        // Add tag to all that don't have it
        await Promise.all(
          selectedEmailsData
            .filter(email => !email.tags?.some(et => et.tag.id === tagId))
            .map(email =>
              fetch(`/api/emails/${email.id}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tagId }),
              })
            )
        );

        // Update local state
        setEmails(emails.map(email => {
          if (selectedEmails.has(email.id) && !email.tags?.some(et => et.tag.id === tagId)) {
            return {
              ...email,
              tags: [...(email.tags || []), { tag: tagObj }]
            };
          }
          return email;
        }));
      }
    } catch (error) {
      console.error("Error toggling tag:", error);
    }
  };

  const handleOpenEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
    setViewerOpen(true);
    setSelectedEmails(new Set()); // Deselect all emails when opening viewer
  };

  const handleDragStart = (e: React.DragEvent, emailId: string) => {
    setDraggingEmailId(emailId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("emailId", emailId);
    // Add a visual indicator
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.6";
      e.currentTarget.style.transform = "scale(0.98)";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingEmailId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
      e.currentTarget.style.transform = "scale(1)";
    }
  };

  return (
    <div className="h-full overflow-auto p-8 pb-16 custom-scrollbar">
      <div className="mb-8 flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className={`text-4xl font-bold mb-2 ${textColors.title} tracking-tight`}>
            {currentFolderName}
          </h1>
          <p className={`text-lg ${textColors.subtitle}`}>
            {pagination && pagination.total !== undefined
              ? `${pagination.total} correo${pagination.total !== 1 ? "s" : ""} en total`
              : "Cargando..."}
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-4 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
        <div className="relative flex-1 group">
          <Search className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${buttonStyles.searchIcon} transition-colors group-focus-within:text-blue-500`} />
          <Input
            placeholder="Buscar correos..."
            className={`${buttonStyles.searchInput} h-11 text-base transition-all duration-200`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={`${filter === "all" ? buttonStyles.active : buttonStyles.outline} transition-all duration-200 hover:scale-105`}
          >
            Todos
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className={`${filter === "unread" ? buttonStyles.active : buttonStyles.outline} transition-all duration-200 hover:scale-105`}
          >
            No leídos
          </Button>
          <Button
            variant={filter === "withCase" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("withCase")}
            className={`${filter === "withCase" ? buttonStyles.active : buttonStyles.outline} transition-all duration-200 hover:scale-105`}
          >
            Con Caso
          </Button>
        </div>
      </div>

      {/* Bulk actions bar - always visible */}
      <div className={`mb-6 rounded-xl border p-4 shadow-lg animate-fade-in-up backdrop-blur-sm transition-all duration-200 ${
        theme === "light"
          ? "border-gray-200 bg-gray-50/90"
          : theme === "dark"
          ? "border-gray-700 bg-gray-800/90"
          : "border-white/10 bg-white/5"
      }`} style={{animationDelay: '0.2s'}}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-medium whitespace-nowrap ${textColors.title}`}>
              {selectedEmails.size > 0 ? (
                `${selectedEmails.size} correo${selectedEmails.size !== 1 ? "s" : ""} seleccionado${selectedEmails.size !== 1 ? "s" : ""}`
              ) : (
                "Acciones rápidas"
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleBulkToggleRead}
                variant="outline"
                size="sm"
                disabled={selectedEmails.size === 0}
                className={selectedEmails.size === 0 ? buttonStyles.outlineDisabled : buttonStyles.outline}
              >
                {selectedEmails.size > 0 && emails.filter(e => selectedEmails.has(e.id)).filter(e => e.isRead).length < selectedEmails.size / 2 ? (
                  <>
                    <Circle className="mr-2 h-4 w-4" />
                    Marcar no leído
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar leído
                  </>
                )}
              </Button>

              {/* Tags dropdown */}
              <div className="relative">
                <Button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  variant="outline"
                  size="sm"
                  className={buttonStyles.outline}
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Etiquetas
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>

                {showTagDropdown && (
                  <>
                    {/* Overlay to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-[100]"
                      onClick={() => setShowTagDropdown(false)}
                    />

                    {/* Dropdown menu */}
                    <div className={`absolute left-0 top-full z-[101] mt-2 w-64 rounded-md border shadow-2xl ${
                      theme === "light"
                        ? "border-gray-200 bg-white"
                        : theme === "dark"
                        ? "border-gray-700 bg-gray-800"
                        : "border-white/10 bg-slate-900/95 backdrop-blur-xl"
                    }`}>
                      <div className="max-h-80 overflow-auto p-2">
                        {selectedEmails.size > 0 ? (
                          // Show tags with checkboxes when emails are selected
                          availableTags.length === 0 ? (
                            <p className={`p-2 text-sm ${textColors.subtitle}`}>
                              No hay etiquetas disponibles
                            </p>
                          ) : (
                            availableTags.map((tag) => {
                              const selectedEmailsData = emails.filter(e => selectedEmails.has(e.id));
                              const allHaveTag = selectedEmailsData.every(email =>
                                email.tags?.some(et => et.tag.id === tag.id)
                              );
                              const someHaveTag = selectedEmailsData.some(email =>
                                email.tags?.some(et => et.tag.id === tag.id)
                              );

                              return (
                                <label
                                  key={tag.id}
                                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 ${
                                    theme === "light"
                                      ? "hover:bg-gray-100"
                                      : theme === "dark"
                                      ? "hover:bg-gray-700"
                                      : "hover:bg-white/10"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={allHaveTag}
                                    ref={(input) => {
                                      if (input) {
                                        input.indeterminate = someHaveTag && !allHaveTag;
                                      }
                                    }}
                                    onChange={() => handleBulkToggleTag(tag.id)}
                                    className="h-4 w-4 cursor-pointer rounded border-gray-300"
                                  />
                                  <TagBadge name={tag.name} color={tag.color} />
                                </label>
                              );
                            })
                          )
                        ) : (
                          // Show tags list (read-only) when no emails are selected
                          <>
                            <div className={`mb-2 pb-2 ${
                              theme === "light"
                                ? "border-b border-gray-200"
                                : theme === "dark"
                                ? "border-b border-gray-700"
                                : "border-b border-white/10"
                            }`}>
                              <p className={`px-2 text-xs font-semibold ${textColors.subtitle}`}>
                                Gestión de Etiquetas
                              </p>
                            </div>
                            {availableTags.length === 0 ? (
                              <p className={`p-2 text-sm ${textColors.subtitle}`}>
                                No hay etiquetas. Crea una para empezar.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {availableTags.map((tag) => (
                                  <div
                                    key={tag.id}
                                    className="flex items-center gap-2 rounded px-2 py-2"
                                  >
                                    <TagBadge name={tag.name} color={tag.color} />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className={`mt-2 pt-2 ${
                              theme === "light"
                                ? "border-t border-gray-200"
                                : theme === "dark"
                                ? "border-t border-gray-700"
                                : "border-t border-white/10"
                            }`}>
                              <TagsManager onTagsChange={fetchAvailableTags} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={handleBulkDelete}
                variant="outline"
                size="sm"
                disabled={selectedEmails.size === 0}
                className={selectedEmails.size === 0 ? buttonStyles.outlineDisabled : buttonStyles.delete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>
          {selectedEmails.size > 0 && (
            <Button
              onClick={() => setSelectedEmails(new Set())}
              variant="ghost"
              size="sm"
              className={buttonStyles.cancel}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-32 rounded-xl ${
              theme === "light" ? "bg-gray-200" : theme === "dark" ? "bg-gray-800" : "bg-white/10"
            } animate-shimmer`}></div>
          ))}
        </div>
      ) : emails.length === 0 ? (
        <Card className="p-16 text-center border-white/10 bg-white/5 backdrop-blur-sm shadow-xl rounded-2xl animate-scale-in">
          <div className="animate-bounce-subtle">
            <Mail className="mx-auto mb-6 h-16 w-16 text-blue-400/60" />
          </div>
          <h3 className={`mb-3 text-2xl font-bold ${textColors.emptyText}`}>No se encontraron correos</h3>
          <p className={`text-base ${textColors.emptySubtext} max-w-md mx-auto`}>
            Los correos se sincronizan automáticamente cada 5 minutos desde tu buzón
          </p>
        </Card>
      ) : (
        <>
          {/* Select all checkbox */}
          <div className="mb-3 flex items-center gap-3 px-2">
            <label className="relative flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedEmails.size === emails.length && emails.length > 0}
                onChange={toggleAllEmailsSelection}
                className="peer sr-only"
              />
              <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center
                transition-all duration-200 ease-in-out
                ${theme === "light"
                  ? "border-gray-300 bg-white group-hover:border-blue-500"
                  : theme === "dark"
                  ? "border-gray-600 bg-gray-800 group-hover:border-blue-400"
                  : "border-blue-400/50 bg-white/5 group-hover:border-blue-400"}
                peer-checked:bg-blue-600 peer-checked:border-blue-600
                peer-checked:scale-100
                peer-focus:ring-2 peer-focus:ring-blue-500/50
              `}>
                {(selectedEmails.size === emails.length && emails.length > 0) && (
                  <svg className="w-3 h-3 text-white animate-in zoom-in duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </label>
            <span className={`text-sm font-medium ${textColors.checkboxLabel}`}>
              {selectedEmails.size === emails.length && emails.length > 0
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </span>
          </div>

          <div className="space-y-2">
            {emails.map((email) => {
              const cardStyles = getCardStyles(email);
              return (
                <Card
                  key={email.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, email.id)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredEmailId(email.id)}
                  onMouseLeave={() => setHoveredEmailId(null)}
                  className={`p-4 ${cardStyles.base} cursor-move transition-all duration-200`}
                >
                  <div className="flex items-start gap-3">
                    {/* Custom Checkbox */}
                    <label className="relative flex items-center cursor-pointer group mt-1">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(email.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleEmailSelection(email.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="peer sr-only"
                      />
                      <div className={`
                        w-5 h-5 rounded-md border-2 flex items-center justify-center
                        transition-all duration-200 ease-in-out
                        ${theme === "light"
                          ? "border-gray-300 bg-white group-hover:border-blue-500"
                          : theme === "dark"
                          ? "border-gray-600 bg-gray-800 group-hover:border-blue-400"
                          : "border-blue-400/50 bg-white/5 group-hover:border-blue-400"}
                        peer-checked:bg-blue-600 peer-checked:border-blue-600
                        peer-checked:scale-100
                        peer-focus:ring-2 peer-focus:ring-blue-500/50
                      `}>
                        {selectedEmails.has(email.id) && (
                          <svg className="w-3 h-3 text-white animate-in zoom-in duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </label>

                  {/* Email content - clickable */}
                  <div
                    onClick={() => handleOpenEmail(email.id)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {/* Unread indicator dot */}
                          {!email.isRead && (
                            <div className="relative flex items-center justify-center">
                              <div className={`w-2.5 h-2.5 rounded-full ${
                                theme === "light"
                                  ? "bg-blue-600"
                                  : theme === "dark"
                                  ? "bg-blue-500"
                                  : "bg-blue-400"
                              } animate-pulse`}></div>
                              <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                            </div>
                          )}
                          {email.isRead ? (
                            <MailOpen className="h-4 w-4 text-blue-300/70" />
                          ) : (
                            <Mail className="h-4 w-4 text-blue-500 font-bold" />
                          )}
                          <h3 className={`font-semibold ${textColors.emailSubject} ${!email.isRead ? 'font-bold' : ''}`}>{email.subject}</h3>
                          {email.threadCount && email.threadCount > 1 && (
                            <Badge variant="outline" className={`gap-1 ${
                              theme === "light"
                                ? "bg-blue-100 border-blue-400 text-blue-700 font-medium"
                                : theme === "dark"
                                ? "bg-blue-900/50 border-blue-500/50 text-blue-300"
                                : "bg-white/5 border-white/20 text-blue-200"
                            }`}>
                              {email.threadCount} mensajes
                            </Badge>
                          )}
                          {(email.priority === "high" || email.priority === "urgent") && (
                            <Badge variant="destructive" className="bg-red-500/80 text-white border-0">{email.priority === "urgent" ? "Urgente" : "Alta"}</Badge>
                          )}
                          {email.status !== "New" && (
                            <Badge variant="secondary" className="bg-white/10 text-blue-200 border-0">{email.status}</Badge>
                          )}
                        </div>
                        <p className={`text-sm ${textColors.emailFrom}`}>
                          De: {email.from} &lt;{email.fromEmail}&gt;
                        </p>
                        <p className={`text-sm ${textColors.emailPreview} line-clamp-2`}>
                          {email.bodyPreview}
                        </p>
                        {email.tags && email.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {email.tags.map((emailTag) => (
                              <TagBadge
                                key={emailTag.tag.id}
                                name={emailTag.tag.name}
                                color={emailTag.tag.color}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right min-w-[120px]">
                        {hoveredEmailId === email.id ? (
                          <button
                            onClick={(e) => deleteEmail(email.id, e)}
                            disabled={deletingEmailId === email.id}
                            className="group flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 hover:bg-red-500/20 border border-transparent hover:border-red-400/30"
                          >
                            <Trash2 className={`h-4 w-4 ${textColors.emailDate} group-hover:text-red-300 transition-colors duration-200`} />
                            <span className={`text-sm ${textColors.emailDate} group-hover:text-red-300 transition-colors duration-200`}>
                              {deletingEmailId === email.id ? "Eliminando..." : "Eliminar"}
                            </span>
                          </button>
                        ) : (
                          <p className={`text-sm ${textColors.emailDate} transition-opacity duration-200`}>
                            {format(new Date(email.receivedAt), "d MMMM, HH:mm'h'", { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
            })}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 mb-8 flex items-center justify-between">
              <p className={`text-sm ${textColors.subtitle}`}>
                Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{" "}
                {pagination.total} resultados
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={pagination.page === 1}
                  className={pagination.page === 1 ? buttonStyles.outlineDisabled : buttonStyles.outline}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(
                      (pageNum) =>
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        Math.abs(pageNum - pagination.page) <= 1
                    )
                    .map((pageNum, index, array) => (
                      <div key={pageNum} className="flex items-center">
                        {index > 0 && array[index - 1] !== pageNum - 1 && (
                          <span className={`px-2 ${textColors.subtitle}`}>...</span>
                        )}
                        <Button
                          variant={pageNum === pagination.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchEmails(pageNum)}
                          className={pageNum === pagination.page ? buttonStyles.active : buttonStyles.outline}
                        >
                          {pageNum}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={pagination.page === pagination.totalPages}
                  className={pagination.page === pagination.totalPages ? buttonStyles.outlineDisabled : buttonStyles.outline}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
