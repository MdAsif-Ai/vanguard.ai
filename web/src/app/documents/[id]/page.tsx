"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataLabel } from "@/components/ui/DataLabel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { documentsApi } from "@/lib/api/documents";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Layers,
  FileText,
  History,
  AlertTriangle,
  Search,
  ExternalLink,
  Shield,
  Database,
  Calendar,
  Building,
} from "lucide-react";
import { formatDate, formatBytes } from "@/lib/utils";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";
import { SoftInput } from "@/components/ui/SoftInput";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "chunks" | "versions">("overview");
  const [chunkSearch, setChunkSearch] = useState("");

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
          <h2 className="text-base font-semibold text-[#0B132B]">Document Not Found</h2>
          <p className="text-xs text-[#8A95A5]">
            The document ID does not exist in your organization registry.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B132B] text-[#F4F1EA] text-xs font-medium hover:bg-[#1C2541]"
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
          <Link href="/documents">
            <TactileButton
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              <span>Back</span>
            </TactileButton>
          </Link>

          <TactileButton
            variant="secondary"
            size="sm"
            onClick={handleReindex}
            disabled={isReindexing || document.status === "processing"}
            isLoading={isReindexing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            <span>Reindex</span>
          </TactileButton>

          <TactileButton
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
          >
            <span>Delete</span>
          </TactileButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Document Status Header Card with physical report feel */}
        <PremiumCard variant="paper" className="p-6 relative overflow-hidden shadow-feature">
          {/* Subtle left report binding accent */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-[#0B132B] via-[#D4AF37] to-[#2A9D8F]" />

          <div className="pl-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3.5 rounded-xl bg-[#0B132B] border border-[#1C2541] text-[#D4AF37] shadow-xs flex-shrink-0">
                  <FileText className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-bold text-[#0B132B] tracking-tight font-serif">
                      {document.name}
                    </h2>
                    <StatusBadge status={document.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A95A5] mt-1 font-medium">
                    {document.company && (
                      <span className="flex items-center gap-1.5 font-semibold text-[#0B132B]">
                        <Building className="w-3.5 h-3.5 text-[#2A9D8F]" />
                        {document.company}
                      </span>
                    )}
                    {document.fiscal_year && (
                      <span className="flex items-center gap-1.5 font-semibold text-[#0B132B]">
                        <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                        FY {document.fiscal_year}
                      </span>
                    )}
                    <span>Uploaded {formatDate(document.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-mono bg-[#FFFFFF] p-3 rounded-xl border border-[#DDD6C4] shadow-xs self-start sm:self-auto">
                <div className="text-right">
                  <div className="text-[#8A95A5] font-bold uppercase text-[10px]">Chunks</div>
                  <div className="text-lg font-black text-[#0B132B]">{document.chunk_count ?? 0}</div>
                </div>
                <div className="w-px h-8 bg-[#DDD6C4]" />
                <div className="text-right">
                  <div className="text-[#8A95A5] font-bold uppercase text-[10px]">Pages</div>
                  <div className="text-lg font-black text-[#0B132B]">{document.page_count ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Failure Alert Banner */}
            {document.error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Ingestion Pipeline Failed:</span> {document.error}
                </div>
              </div>
            )}
          </div>
        </PremiumCard>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#DDD6C4] space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer font-mono ${
              activeTab === "overview"
                ? "border-[#D4AF37] text-[#0B132B] font-bold"
                : "border-transparent text-[#8A95A5] hover:text-[#0B132B]"
            }`}
          >
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <span>Metadata & Specifications</span>
          </button>

          <button
            onClick={() => setActiveTab("chunks")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer font-mono ${
              activeTab === "chunks"
                ? "border-[#D4AF37] text-[#0B132B] font-bold"
                : "border-transparent text-[#8A95A5] hover:text-[#0B132B]"
            }`}
          >
            <FileText className="w-4 h-4 text-[#2A9D8F]" />
            <span>Indexed Chunks ({document.chunk_count ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("versions")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer font-mono ${
              activeTab === "versions"
                ? "border-[#D4AF37] text-[#0B132B] font-bold"
                : "border-transparent text-[#8A95A5] hover:text-[#0B132B]"
            }`}
          >
            <History className="w-4 h-4 text-[#8A95A5]" />
            <span>Version Ledger</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <PremiumCard variant="paper" className="p-6 space-y-6 shadow-card">
            <h3 className="text-sm font-bold text-[#0B132B] flex items-center gap-2 font-serif">
              <Shield className="w-4 h-4 text-[#2A9D8F]" />
              <span>Document Audit & Storage Attributes</span>
            </h3>

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

            <div className="pt-4 border-t border-[#DDD6C4] flex items-center justify-between text-xs text-[#8A95A5] font-medium font-mono">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#2A9D8F]" />
                Vectorized in Qdrant collection: financerag_documents
              </span>
              <Link
                href={`/ask`}
                className="text-[#0B132B] hover:text-[#D4AF37] font-bold flex items-center gap-1.5 transition-colors group"
              >
                <span>Query document in AI Research</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#D4AF37]" />
              </Link>
            </div>
          </PremiumCard>
        )}

        {/* Chunks Tab */}
        {activeTab === "chunks" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <SoftInput
                  value={chunkSearch}
                  onChange={(e) => setChunkSearch(e.target.value)}
                  placeholder="Filter chunk text..."
                  icon={<Search className="w-4 h-4 text-[#2A9D8F]" />}
                />
              </div>
              <span className="text-xs text-[#8A95A5] font-medium font-mono">
                {filteredChunks.length} chunks indexed
              </span>
            </div>

            {chunksLoading ? (
              <div className="py-16 text-center">
                <LoadingSpinner size="md" label="Loading chunks from Qdrant vector store..." />
              </div>
            ) : filteredChunks.length === 0 ? (
              <PremiumCard variant="paper" className="py-12 text-center text-xs text-[#8A95A5]">
                No chunks found matching search query or document has not completed embedding pipeline.
              </PremiumCard>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredChunks.map((chunk) => (
                  <PremiumCard
                    key={chunk.id || chunk.chunk_index}
                    variant="paper"
                    className="p-4 space-y-2.5 shadow-card hover:shadow-card-hover transition-all"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] font-mono text-[11px] font-bold">
                          Chunk #{chunk.chunk_index}
                        </span>
                        {chunk.page !== null && chunk.page !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-[#2A9D8F]/10 text-[#2A9D8F] border border-[#2A9D8F]/30 text-[11px] font-mono font-semibold">
                            Page {chunk.page}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8A95A5] font-mono">ID: {chunk.id}</span>
                    </div>

                    <p className="text-xs text-[#0B132B] font-mono leading-relaxed whitespace-pre-wrap bg-[#FFFFFF] p-3.5 rounded-xl border border-[#DDD6C4]">
                      {chunk.text}
                    </p>
                  </PremiumCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === "versions" && (
          <PremiumCard variant="paper" padded="none" className="overflow-hidden shadow-feature">
            {versionsLoading ? (
              <div className="py-16 text-center">
                <LoadingSpinner size="md" label="Loading version history..." />
              </div>
            ) : !versionsData?.items?.length ? (
              <div className="py-12 text-center text-xs text-[#8A95A5] font-medium">
                No previous versions recorded for this document.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B132B] text-[#F4F1EA] font-mono text-[10px] uppercase border-b border-[#1C2541]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Version</th>
                      <th className="py-3 px-4 font-bold">Checksum (SHA-256)</th>
                      <th className="py-3 px-4 font-bold">Storage Key</th>
                      <th className="py-3 px-4 font-bold">Recorded Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD6C4]">
                    {versionsData.items.map((v) => (
                      <tr key={v.id} className="hover:bg-[#EAE5D9]/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#D4AF37]">v{v.version}</td>
                        <td className="py-3.5 px-4 font-mono text-[#0B132B]">{v.checksum}</td>
                        <td className="py-3.5 px-4 font-mono text-[#8A95A5]">{v.storage_key}</td>
                        <td className="py-3.5 px-4 text-[#0B132B] font-medium">{formatDate(v.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PremiumCard>
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
