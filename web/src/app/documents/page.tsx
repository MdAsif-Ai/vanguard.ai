"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";
import { DocumentCard } from "@/components/ui/DocumentCard";
import { SoftInput } from "@/components/ui/SoftInput";
import { documentsApi } from "@/lib/api/documents";
import { DocumentResponse } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Files,
  Upload,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  Plus,
  FileCheck,
  LayoutGrid,
  List,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".txt", ".csv", ".md"];
const MAX_SIZE_MB = 50;

export default function DocumentsPage() {
  const queryClient = useQueryClient();

  // Search, pagination and view mode state
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Upload modal / section state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const [company, setCompany] = useState("");
  const [documentType, setDocumentType] = useState("10-K");
  const [fiscalYear, setFiscalYear] = useState<number | "">(2025);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<DocumentResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reindex state
  const [reindexingId, setReindexingId] = useState<string | null>(null);

  // Query documents with periodic refetch if any document is processing
  const {
    data: documentsData,
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["documents", page, pageSize],
    queryFn: () => documentsApi.list(page * pageSize, pageSize),
    refetchInterval: (query) => {
      const items = query.state.data?.items;
      const hasProcessing = items?.some(
        (doc) => doc.status === "uploaded" || doc.status === "processing"
      );
      return hasProcessing ? 4000 : false;
    },
  });

  const documents = documentsData?.items || [];
  const totalDocuments = documentsData?.total || 0;
  const totalPages = Math.ceil(totalDocuments / pageSize);

  // Filtered documents by search
  const filteredDocs = documents.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      (doc.company && doc.company.toLowerCase().includes(q)) ||
      (doc.document_type && doc.document_type.toLowerCase().includes(q))
    );
  });

  // Handle file selection
  const handleFileChange = (file: File) => {
    setUploadError(null);
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Unsupported file extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File exceeds maximum size of ${MAX_SIZE_MB} MB.`);
      return;
    }

    setSelectedFile(file);
    if (!customName) {
      setCustomName(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      await documentsApi.upload({
        file: selectedFile,
        name: customName || undefined,
        company: company || undefined,
        document_type: documentType || undefined,
        fiscal_year: typeof fiscalYear === "number" ? fiscalYear : undefined,
        onUploadProgress: (progress) => {
          if (progress.total) {
            setUploadProgress(Math.round((progress.loaded * 100) / progress.total));
          }
        },
      });

      // Reset & refresh
      setSelectedFile(null);
      setCustomName("");
      setCompany("");
      setFiscalYear(2025);
      setUploadProgress(null);
      setShowUploadModal(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Upload failed. Check file constraints.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await documentsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      alert("Failed to delete document: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Reindex Action
  const handleReindex = async (docId: string) => {
    setReindexingId(docId);
    try {
      await documentsApi.reindex(docId);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      alert("Failed to start reindexing: " + (err.response?.data?.detail || err.message));
    } finally {
      setReindexingId(null);
    }
  };

  return (
    <AppShell
      title="Financial Document Archive"
      description="SEC 10-K, 10-Q filings, transcripts, and financial disclosures with Qdrant vector chunk embeddings"
      actions={
        <div className="flex items-center gap-2">
          <TactileButton
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Refresh repository"
          />
          <TactileButton
            variant="primary"
            size="sm"
            onClick={() => setShowUploadModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            <span>Upload Filing</span>
          </TactileButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Upload Drawer / Ingestion Desk */}
        {showUploadModal && (
          <PremiumCard variant="paper" className="p-6 space-y-5 shadow-feature animate-reveal">
            <div className="flex items-center justify-between border-b border-[#DDD6C4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B132B] flex items-center gap-2 font-serif">
                  <Upload className="w-4 h-4 text-[#D4AF37]" />
                  Upload Financial Filing or Disclosure
                </h3>
                <p className="text-xs text-[#8A95A5] font-medium">
                  Accepted formats: PDF, DOCX, XLSX, TXT, CSV, MD (max 50 MB)
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-xs font-semibold text-[#8A95A5] hover:text-[#0B132B] transition-colors"
              >
                Close
              </button>
            </div>

            <ErrorDisplay message={uploadError} />

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-[#D4AF37] bg-[#EAE5D9]/60 scale-[1.005]"
                    : selectedFile
                    ? "border-[#2A9D8F] bg-[#2A9D8F]/5"
                    : "border-[#DDD6C4] hover:border-[#D4AF37] bg-[#FFFFFF] hover:bg-[#F4F1EA]"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.txt,.csv,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <FileCheck className="w-10 h-10 text-[#2A9D8F] mx-auto" />
                    <div className="text-sm font-bold text-[#0B132B]">{selectedFile.name}</div>
                    <div className="text-xs text-[#8A95A5] font-mono">
                      {formatBytes(selectedFile.size)} • Ready for vector ingestion
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-[#D4AF37] mx-auto" />
                    <div className="text-sm font-semibold text-[#0B132B]">
                      Drag & drop your financial report here, or{" "}
                      <span className="text-[#D4AF37] font-bold underline">browse files</span>
                    </div>
                    <div className="text-xs text-[#8A95A5]">
                      Files are cryptographically verified via SHA-256 for duplicate elimination
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <SoftInput
                  label="Display Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. NVIDIA-2025-Annual-Report.pdf"
                />

                <SoftInput
                  label="Company / Entity"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. NVIDIA Corporation"
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#0B132B] uppercase tracking-wider font-mono">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DDD6C4] rounded-xl px-3 py-2.5 text-xs text-[#0B132B] focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 font-medium transition-all"
                  >
                    <option value="10-K">10-K (Annual Report)</option>
                    <option value="10-Q">10-Q (Quarterly Report)</option>
                    <option value="8-K">8-K (Current Report)</option>
                    <option value="Earnings">Earnings Release</option>
                    <option value="Transcript">Earnings Transcript</option>
                    <option value="Proxy">DEF 14A (Proxy)</option>
                    <option value="Other">Other Financial Document</option>
                  </select>
                </div>

                <SoftInput
                  label="Fiscal Year"
                  type="number"
                  min="1900"
                  max="2100"
                  value={fiscalYear}
                  onChange={(e) =>
                    setFiscalYear(e.target.value ? parseInt(e.target.value, 10) : "")
                  }
                  placeholder="2025"
                />
              </div>

              {/* Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#8A95A5] font-medium font-mono">
                    <span>Ingesting and vectorizing chunks...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#EAE5D9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2A9D8F] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-[#8A95A5] hover:text-[#0B132B] transition-colors"
                >
                  Cancel
                </button>
                <TactileButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!selectedFile || isUploading}
                  isLoading={isUploading}
                  icon={<Upload className="w-4 h-4" />}
                >
                  <span>{isUploading ? "Ingesting Document..." : "Upload & Ingest"}</span>
                </TactileButton>
              </div>
            </form>
          </PremiumCard>
        )}

        {/* Search, Filter & View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <SoftInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filing title, company ticker, or report type..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === "cards"
                    ? "bg-[#0B132B] text-[#D4AF37] font-bold shadow-xs"
                    : "text-[#8A95A5] hover:text-[#0B132B]"
                }`}
                title="Physical Report Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                  viewMode === "table"
                    ? "bg-[#0B132B] text-[#D4AF37] font-bold shadow-xs"
                    : "text-[#8A95A5] hover:text-[#0B132B]"
                }`}
                title="Ledger Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Ledger</span>
              </button>
            </div>

            <span className="text-xs text-[#8A95A5] font-medium font-mono">
              Showing {filteredDocs.length} of {totalDocuments} filings
            </span>
          </div>
        </div>

        {/* Content Presentation: Cards Grid OR Ledger Table */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-[#8A95A5]">
            <LoadingSpinner size="md" label="Loading document archive..." />
          </div>
        ) : filteredDocs.length === 0 ? (
          <PremiumCard variant="paper" className="py-20 text-center space-y-3">
            <Files className="w-12 h-12 text-[#DDD6C4] mx-auto" />
            <div className="text-sm font-bold text-[#0B132B]">No documents found</div>
            <p className="text-xs text-[#8A95A5] max-w-sm mx-auto">
              {searchQuery
                ? "No institutional filings matched your query. Try a different search term."
                : "Upload company 10-Ks, 10-Qs, or quarterly filings to begin vector reasoning."}
            </p>
            {!searchQuery && (
              <TactileButton
                variant="primary"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                icon={<Upload className="w-3.5 h-3.5" />}
              >
                <span>Upload Document</span>
              </TactileButton>
            )}
          </PremiumCard>
        ) : viewMode === "cards" ? (
          /* INSTITUTIONAL FINANCIAL REPORT CARDS GRID */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onReindex={handleReindex}
                  onDelete={(target) => setDeleteTarget(target)}
                  isReindexing={reindexingId === doc.id}
                />
              ))}
            </div>

            {/* Pagination for Card View */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-[#8A95A5] font-medium pt-2 font-mono">
                <div>Page {page + 1} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <TactileButton
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </TactileButton>
                  <TactileButton
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </TactileButton>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* WORKSTATION LEDGER TABLE */
          <PremiumCard variant="paper" padded="none" className="overflow-hidden shadow-feature">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B132B] text-[#F4F1EA] uppercase tracking-wider font-mono text-[10px] border-b border-[#1C2541]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Document Name</th>
                    <th className="py-3.5 px-4 font-bold">Issuer / Entity</th>
                    <th className="py-3.5 px-4 font-bold">Type</th>
                    <th className="py-3.5 px-4 font-bold">FY</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Chunks</th>
                    <th className="py-3.5 px-4 font-bold text-right">Pages</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD6C4]">
                  {filteredDocs.map((doc) => {
                    const isReindexing = reindexingId === doc.id;

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-[#EAE5D9]/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-[#0B132B]">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="hover:text-[#D4AF37] flex items-center gap-2 transition-colors"
                          >
                            <Files className="w-4 h-4 text-[#2A9D8F] group-hover:text-[#D4AF37] flex-shrink-0 transition-colors" />
                            <span className="truncate max-w-[240px] font-bold">
                              {doc.name}
                            </span>
                          </Link>
                          <div className="text-[10px] text-[#8A95A5] font-mono mt-0.5 truncate max-w-[240px]">
                            SHA: {doc.checksum.slice(0, 16)}…
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#0B132B] font-medium">
                          {doc.company || <span className="text-[#8A95A5]">—</span>}
                        </td>

                        <td className="py-3.5 px-4">
                          {doc.document_type ? (
                            <span className="px-2 py-0.5 rounded-md bg-[#0B132B] text-[#D4AF37] font-mono text-[11px] font-bold border border-[#1C2541]">
                              {doc.document_type}
                            </span>
                          ) : (
                            <span className="text-[#8A95A5]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#0B132B] font-mono font-medium">
                          {doc.fiscal_year ? `FY${doc.fiscal_year}` : <span className="text-[#8A95A5]">—</span>}
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={doc.status} />
                          {doc.error && (
                            <div className="text-[10px] text-rose-600 truncate max-w-[150px] mt-0.5" title={doc.error}>
                              {doc.error}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-[#0B132B] font-semibold">
                          {doc.chunk_count ?? <span className="text-[#8A95A5]">—</span>}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-[#0B132B] font-semibold">
                          {doc.page_count ?? <span className="text-[#8A95A5]">—</span>}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/documents/${doc.id}`}
                              className="p-1.5 rounded-lg hover:bg-[#EAE5D9] text-[#8A95A5] hover:text-[#0B132B] transition-colors"
                              title="Inspect document & chunks"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleReindex(doc.id)}
                              disabled={isReindexing || doc.status === "processing"}
                              className="p-1.5 rounded-lg hover:bg-[#EAE5D9] text-[#8A95A5] hover:text-[#D4AF37] transition-colors disabled:opacity-40"
                              title="Re-run parsing and chunk indexing"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isReindexing ? "animate-spin text-[#D4AF37]" : ""}`}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(doc)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-[#8A95A5] hover:text-rose-600 transition-colors"
                              title="Delete document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[#DDD6C4] flex items-center justify-between text-xs text-[#8A95A5] font-medium font-mono">
                <div>Page {page + 1} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <TactileButton
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </TactileButton>
                  <TactileButton
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </TactileButton>
                </div>
              </div>
            )}
          </PremiumCard>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All database rows, vector points in Qdrant, and storage files will be removed.`}
        confirmLabel="Delete Document"
        isLoading={isDeleting}
      />
    </AppShell>
  );
}
