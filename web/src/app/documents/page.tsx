"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
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
  AlertCircle,
  Clock,
  Filter,
  CheckCircle,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".txt", ".csv", ".md"];
const MAX_SIZE_MB = 50;

export default function DocumentsPage() {
  const queryClient = useQueryClient();

  // Search and pagination state
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [searchQuery, setSearchQuery] = useState("");

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
      title="Financial Document Repository"
      description="Manage SEC 10-K, 10-Q filings, transcripts, and financial PDF disclosures with chunk vectorization"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white hover:bg-[#CBF3F0]/50 text-slate-600 hover:text-slate-800 border border-[#CBF3F0] transition-all shadow-sm active:scale-95"
            title="Refresh table"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#FF9F1C] hover:bg-[#FFBF69] text-white text-xs font-bold shadow-clay-btn flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Upload Drawer / Modal */}
        {showUploadModal && (
          <div className="bg-white rounded-3xl p-6 border-2 border-[#CBF3F0] shadow-clay space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#CBF3F0]/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#FF9F1C]" />
                  Upload Financial Filing or Document
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Accepted: PDF, DOCX, XLSX, TXT, CSV, MD (max 50 MB)
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
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
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#2EC4B6] bg-[#CBF3F0]/60 shadow-clay scale-[1.01]"
                    : selectedFile
                    ? "border-[#2EC4B6] bg-[#CBF3F0]/20"
                    : "border-[#CBF3F0] hover:border-[#2EC4B6] bg-slate-50/50 hover:bg-[#CBF3F0]/20"
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
                    <FileCheck className="w-10 h-10 text-[#2EC4B6] mx-auto" />
                    <div className="text-sm font-bold text-slate-800">{selectedFile.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {formatBytes(selectedFile.size)} • Ready for ingestion
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-[#FF9F1C] mx-auto" />
                    <div className="text-sm font-semibold text-slate-700">
                      Drag & drop your financial report here, or{" "}
                      <span className="text-[#FF9F1C] font-bold underline">browse files</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Documents are hashed via SHA-256 to prevent duplicate storage
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Display Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Google-2025-10K.pdf"
                    className="w-full bg-white border border-[#CBF3F0] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Company / Entity</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Alphabet Inc."
                    className="w-full bg-white border border-[#CBF3F0] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Document Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full bg-white border border-[#CBF3F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 transition-all font-medium"
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Fiscal Year</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={fiscalYear}
                    onChange={(e) =>
                      setFiscalYear(e.target.value ? parseInt(e.target.value, 10) : "")
                    }
                    placeholder="2025"
                    className="w-full bg-white border border-[#CBF3F0] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#CBF3F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2EC4B6] transition-all duration-200"
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
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 rounded-xl bg-[#FF9F1C] hover:bg-[#FFBF69] text-white text-xs font-bold shadow-clay-btn disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-all"
                >
                  {isUploading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Ingesting Document...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Ingest</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2EC4B6] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name, company, or document type..."
              className="w-full bg-white border border-[#CBF3F0] rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 shadow-sm font-medium transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              Showing {filteredDocs.length} of {totalDocuments} documents
            </span>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-3xl border border-[#CBF3F0] overflow-hidden shadow-clay">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <LoadingSpinner size="md" label="Loading documents..." />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Files className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No documents found</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "No files matched your filter query. Try a different search term."
                  : "Start by uploading your first financial report to enable AI Q&A."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF9F1C] hover:bg-[#FFBF69] text-white text-xs font-bold shadow-clay-btn inline-flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#CBF3F0]/30 text-slate-600 uppercase tracking-wider font-mono text-[10px] border-b border-[#CBF3F0]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Document Name</th>
                    <th className="py-3.5 px-4 font-bold">Company</th>
                    <th className="py-3.5 px-4 font-bold">Type</th>
                    <th className="py-3.5 px-4 font-bold">FY</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Chunks</th>
                    <th className="py-3.5 px-4 font-bold text-right">Pages</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBF3F0]/50">
                  {filteredDocs.map((doc) => {
                    const isReindexing = reindexingId === doc.id;

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-[#CBF3F0]/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="hover:text-[#FF9F1C] flex items-center gap-2 group-hover:underline transition-colors"
                          >
                            <Files className="w-4 h-4 text-[#2EC4B6] group-hover:text-[#FF9F1C] flex-shrink-0 transition-colors" />
                            <span className="truncate max-w-[220px] font-bold">
                              {doc.name}
                            </span>
                          </Link>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">
                            SHA: {doc.checksum.slice(0, 16)}…
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {doc.company || <span className="text-slate-300">—</span>}
                        </td>

                        <td className="py-3.5 px-4">
                          {doc.document_type ? (
                            <span className="px-2 py-0.5 rounded-lg bg-[#CBF3F0]/60 border border-[#2EC4B6]/30 text-[#157A70] font-mono text-[11px] font-semibold">
                              {doc.document_type}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono font-medium">
                          {doc.fiscal_year ? `FY${doc.fiscal_year}` : <span className="text-slate-300">—</span>}
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={doc.status} />
                          {doc.error && (
                            <div className="text-[10px] text-rose-500 truncate max-w-[150px] mt-0.5" title={doc.error}>
                              {doc.error}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-semibold">
                          {doc.chunk_count !== null && doc.chunk_count !== undefined ? (
                            doc.chunk_count
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-semibold">
                          {doc.page_count !== null && doc.page_count !== undefined ? (
                            doc.page_count
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Detail Link */}
                            <Link
                              href={`/documents/${doc.id}`}
                              className="p-1.5 rounded-lg hover:bg-[#CBF3F0] text-slate-400 hover:text-[#2EC4B6] transition-colors"
                              title="Inspect document & chunks"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            {/* Reindex Button */}
                            <button
                              type="button"
                              onClick={() => handleReindex(doc.id)}
                              disabled={isReindexing || doc.status === "processing"}
                              className="p-1.5 rounded-lg hover:bg-[#CBF3F0] text-slate-400 hover:text-[#FF9F1C] transition-colors disabled:opacity-40"
                              title="Re-run parsing and chunk indexing"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isReindexing ? "animate-spin text-[#FF9F1C]" : ""}`}
                              />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(doc)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
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
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#CBF3F0] flex items-center justify-between text-xs text-slate-500 font-medium">
              <div>
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#CBF3F0]/40 border border-[#CBF3F0] disabled:opacity-40 text-slate-700 font-semibold shadow-sm transition-all active:scale-95"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#CBF3F0]/40 border border-[#CBF3F0] disabled:opacity-40 text-slate-700 font-semibold shadow-sm transition-all active:scale-95"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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
