import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/api/client";
import type { GenerationConfig } from "@/types";

interface GenerateResponse {
  application_id: string;
  doc_type: string;
  html: string;
}

interface GeneratePanelProps {
  jobId: string;
  applicationId: string | null;
  onGenerated: (appId: string, docType: string, html: string) => void;
}

export default function GeneratePanel({
  jobId,
  applicationId,
  onGenerated,
}: GeneratePanelProps) {
  const [config, setConfig] = useState<GenerationConfig>({
    template: "default",
    char_limit: null,
    language: "en",
    tone: "professional",
  });

  const generateMutation = useMutation({
    mutationFn: (docType: string) =>
      api.post<GenerateResponse>(`/generate/${docType}`, {
        job_id: jobId,
        application_id: applicationId,
        config,
      }),
    onSuccess: (data) => {
      onGenerated(data.application_id, data.doc_type, data.html);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Tone</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value })}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="formal">Formal</option>
            </select>
          </div>
          <div>
            <Label>Language</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="da">Danish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div>
            <Label>Character Limit</Label>
            <Input
              type="number"
              placeholder="No limit"
              value={config.char_limit ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  char_limit: e.target.value ? parseInt(e.target.value) : null,
                })
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => generateMutation.mutate("cv")}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate CV
          </Button>
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate("letter")}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate Cover Letter
          </Button>
        </div>

        {generateMutation.isError && (
          <p className="text-sm text-destructive">
            {generateMutation.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
