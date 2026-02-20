import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/api/client";
import type { Document } from "@/types";

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [uploadType, setUploadType] = useState<"cv" | "letter">("cv");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get<Document[]>("/library/documents"),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      api.upload<Document>("/library/upload", file, { doc_type: uploadType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/library/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedDoc(null);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      for (const file of files) {
        uploadMutation.mutate(file);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
  });

  const cvs = documents.filter((d) => d.type === "cv");
  const letters = documents.filter((d) => d.type === "letter");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Document Library</h1>

      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <Button
              variant={uploadType === "cv" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadType("cv")}
            >
              Upload CV
            </Button>
            <Button
              variant={uploadType === "letter" ? "default" : "outline"}
              size="sm"
              onClick={() => setUploadType("letter")}
            >
              Upload Letter
            </Button>
          </div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {uploadMutation.isPending ? (
              <p className="text-muted-foreground">Uploading and extracting text...</p>
            ) : isDragActive ? (
              <p className="text-muted-foreground">Drop files here...</p>
            ) : (
              <p className="text-muted-foreground">
                Drag & drop files here, or click to select (PDF, DOCX, TXT)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        {/* Document List */}
        <div>
          <Tabs defaultValue="cvs">
            <TabsList>
              <TabsTrigger value="cvs">CVs ({cvs.length})</TabsTrigger>
              <TabsTrigger value="letters">Letters ({letters.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="cvs" className="space-y-2">
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : cvs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No CVs uploaded yet.</p>
              ) : (
                cvs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    selected={selectedDoc?.id === doc.id}
                    onSelect={() => setSelectedDoc(doc)}
                    onDelete={() => deleteMutation.mutate(doc.id)}
                  />
                ))
              )}
            </TabsContent>
            <TabsContent value="letters" className="space-y-2">
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : letters.length === 0 ? (
                <p className="text-muted-foreground text-sm">No letters uploaded yet.</p>
              ) : (
                letters.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    selected={selectedDoc?.id === doc.id}
                    onSelect={() => setSelectedDoc(doc)}
                    onDelete={() => deleteMutation.mutate(doc.id)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        <div>
          {selectedDoc ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedDoc.filename}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground max-h-96 overflow-y-auto">
                  {selectedDoc.extracted_text || "No text extracted."}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-48 border rounded-lg text-muted-foreground">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Select a document to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentCard({
  doc,
  selected,
  onSelect,
  onDelete,
}: {
  doc: Document;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${selected ? "border-primary" : "hover:bg-accent"}`}
      onClick={onSelect}
    >
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{doc.filename}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(doc.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={doc.skills_extracted ? "default" : "secondary"}>
            {doc.skills_extracted ? "Skills extracted" : "Pending"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
