"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataLabel } from "@/components/ui/DataLabel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { documentsApi } from "@/lib/api/documents";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Files,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Layers,
  FileText,
  History,
  CheckCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Shield,
  Hash,
  Database,
  Calendar,
  Building,
} from "lucide-react";
import { formatDate, formatBytes } from "@/lib/utils";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "chunks" | "versions">("overview");
  const [chunkSearch, setChunkSearch] = useState("");
  const [selectedChunk, setSelectedChunk] = useState<any | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  // Document metadata query
  const {
    data: document,
    isLoading: docLoading,
    error: docError,
    refetch: refetchDoc,
  } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentsApi.get(documentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "uploaded" || status === "processing" ? 3000 : false;
    },
  });

  // Chunks query
  const { data: chunksData, isLoading: chunksLoading } = useQuery({
    queryKey: ["documentChunks", documentId],
    queryFn: () => documentsApi.getChunks(documentId),
    enabled: activeTab === "chunks",
  });

  // Versions query
  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ["documentVersions", documentId],
    queryFn: () => documentsApi.getVersions(documentId),
    enabled: activeTab === "versions",
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await documentsApi.delete(documentId);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push("/documents");
    } catch (err: any) {
      alert("Failed to delete document: " + (err.response?.data?.detail || err.message));
      setIsDeleting(false);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      await documentsApi.reindex(documentId);
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      refetchDoc();
    } catch (err: any) {
      alert("Reindexing failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsReindexing(false);
    }
  };

  const chunks = chunksData?.items || [];
  const filteredChunks = chunks.filter((c) =>
    chunkSearch ? c.text.toLowerCase().includes(chunkSearch.toLowerCase()) : true
  );

  if (docLoading) {
    return (
      <AppShell title="Document Details">
        <div className="py-24 text-center">
          <LoadingSpinner size="lg" label="Loading document details..." />
        </div>
      </AppShell>
    );
  }

  if (docError || !document) {
    return (
      <AppShell title="Document Not Found">
        <div className="py-16 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-semibold text-white">Document Not Found</h2>
          <p className="text-xs text-slate-400">
            The document ID does not exist in your organization registry.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Documents</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={document.name}
      description={`Document ID: ${document.id}`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/documents"
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#CBF3F0]/50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-[#CBF3F0] shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back</span>
          </Link>

          <button
            onClick={handleReindex}
            disabled={isReindexing || document.status === "processing"}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#CBF3F0]/50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-[#CBF3F0] shadow-sm disabled:opacity-40 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isReindexing ? "animate-spin text-[#FF9F1C]" : ""}`} />
            <span>Reindex</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-rose-200 shadow-sm active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Document Status Header Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#CBF3F0] border border-[#2EC4B6]/30 text-[#2EC4B6]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{document.name}</h2>
                  <StatusBadge status={document.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                  {document.company && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-[#2EC4B6]" />
                      {document.company}
                    </span>
                  )}
                  {document.fiscal_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#FF9F1C]" />
                      FY {document.fiscal_year}
                    </span>
                  )}
                  <span>Uploaded {formatDate(document.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono">
              <div className="text-right">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Chunks</div>
                <div className="text-base font-black text-slate-900">{document.chunk_count ?? 0}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Pages</div>
                <div className="text-base font-black text-slate-900">{document.page_count ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Failure Alert Banner */}
          {document.error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Ingestion Pipeline Failed:</span> {document.error}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#CBF3F0] space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-[#FF9F1C] text-[#FF9F1C] font-bold"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Metadata & Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("chunks")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "chunks"
                ? "border-[#FF9F1C] text-[#FF9F1C] font-bold"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Indexed Chunks ({document.chunk_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("versions")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "versions"
                ? "border-[#FF9F1C] text-[#FF9F1C] font-bold"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Version History</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Document Specifications</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DataLabel label="Document UUID" value={document.id} isMono />
              <DataLabel label="Organization ID" value={document.organization_id} isMono />
              <DataLabel label="Document Type" value={document.document_type || "Unspecified"} />
              <DataLabel label="Company / Issuer" value={document.company || "Not specified"} />
              <DataLabel
                label="Fiscal Reporting Period"
                value={document.fiscal_year ? `FY ${document.fiscal_year}` : "N/A"}
              />
              <DataLabel label="Storage Key" value={document.storage_key} isMono />
              <DataLabel label="SHA-256 Checksum" value={document.checksum} isMono />
              <DataLabel
                label="File Size"
                value={formatBytes(document.file_size)}
              />
              <DataLabel label="Ingested Timestamp" value={formatDate(document.created_at)} />
            </div>

            <div className="pt-4 border-t border-[#CBF3F0]/60 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#2EC4B6]" />
                Vectorized in Qdrant collection: financerag_documents
              </span>
              <Link
                href={`/ask`}
                className="text-[#FF9F1C] hover:text-[#FFBF69] font-bold flex items-center gap-1 transition-colors"
              >
                <span>Query document with AI</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Chunks Tab */}
        {activeTab === "chunks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2EC4B6]" />
                <input
                  type="text"
                  value={chunkSearch}
                  onChange={(e) => setChunkSearch(e.target.value)}
                  placeholder="Filter chunk text..."
                  className="w-full bg-white border border-[#CBF3F0] rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 shadow-sm font-medium transition-all"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {filteredChunks.length} chunks available
              </span>
            </div>

            {chunksLoading ? (
              <div className="py-16 text-center">
                <LoadingSpinner size="md" label="Loading chunks from Qdrant..." />
              </div>
            ) : filteredChunks.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-[#CBF3F0] text-xs text-slate-500 shadow-sm">
                No chunks found matching search query or document has not finished embedding.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredChunks.map((chunk) => (
                  <div
                    key={chunk.id || chunk.chunk_index}
                    className="bg-white rounded-2xl p-4 border border-[#CBF3F0] hover:border-[#2EC4B6] shadow-sm hover:shadow-clay transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-[#CBF3F0] text-[#157A70] border border-[#2EC4B6]/30 font-mono text-[11px] font-bold">
                          Chunk #{chunk.chunk_index}
                        </span>
                        {chunk.page !== null && chunk.page !== undefined && (
                          <span className="px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-[#CBF3F0] text-[11px] font-mono font-semibold">
                            Page {chunk.page}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">ID: {chunk.id}</span>
                    </div>

                    <p className="text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap bg-[#CBF3F0]/15 p-3.5 rounded-xl border border-[#CBF3F0]/40">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === "versions" && (
          <div className="bg-white rounded-3xl border border-[#CBF3F0] overflow-hidden shadow-clay">
            {versionsLoading ? (
              <div className="py-16 text-center">
                <LoadingSpinner size="md" label="Loading version history..." />
              </div>
            ) : !versionsData?.items?.length ? (
              <div className="py-12 text-center text-xs text-slate-500 font-medium">
                No previous versions recorded for this document.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#CBF3F0]/30 text-slate-600 font-mono text-[10px] uppercase border-b border-[#CBF3F0]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Version</th>
                      <th className="py-3 px-4 font-bold">Checksum (SHA-256)</th>
                      <th className="py-3 px-4 font-bold">Storage Key</th>
                      <th className="py-3 px-4 font-bold">Recorded Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CBF3F0]/50">
                    {versionsData.items.map((v) => (
                      <tr key={v.id} className="hover:bg-[#CBF3F0]/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FF9F1C]">v{v.version}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{v.checksum}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{v.storage_key}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(v.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Document"
        description={`Permanently purge "${document.name}" and all associated vectors?`}
        confirmLabel="Confirm Delete"
        isLoading={isDeleting}
      />
    </AppShell>
  );
}
