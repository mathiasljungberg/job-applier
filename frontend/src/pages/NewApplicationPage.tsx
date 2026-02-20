import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import JobInput from "@/components/jobs/JobInput";
import JobDetails from "@/components/jobs/JobDetails";
import SkillMatch from "@/components/matching/SkillMatch";
import GeneratePanel from "@/components/generate/GeneratePanel";
import DocumentPreview from "@/components/generate/DocumentPreview";
import ChatWindow from "@/components/chat/ChatWindow";
import type { MatchResponse } from "@/components/matching/SkillMatch";
import { api } from "@/api/client";
import type { JobPosting } from "@/types";

interface GeneratedDoc {
  applicationId: string;
  docType: string;
  html: string;
}

export default function NewApplicationPage() {
  const [job, setJob] = useState<JobPosting | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);

  const matchMutation = useMutation({
    mutationFn: (jobId: string) =>
      api.post<MatchResponse>("/match", { job_id: jobId }),
    onSuccess: setMatchResult,
  });

  const handleGenerated = (appId: string, docType: string, html: string) => {
    setApplicationId(appId);
    setGeneratedDocs((prev) => {
      const filtered = prev.filter((d) => d.docType !== docType);
      return [...filtered, { applicationId: appId, docType, html }];
    });
  };

  const handleDocumentUpdated = (docType: string, html: string) => {
    setGeneratedDocs((prev) =>
      prev.map((d) =>
        d.docType === docType ? { ...d, html } : d
      )
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Application</h1>

      {/* Step 1: Job Input */}
      {!job ? (
        <JobInput onJobExtracted={setJob} />
      ) : (
        <>
          <JobDetails job={job} />

          {/* Step 2: Match Skills */}
          {!matchResult && !matchMutation.isPending && (
            <Button onClick={() => matchMutation.mutate(job.id)}>
              Run Skill Matching
            </Button>
          )}

          <SkillMatch
            matchResult={matchResult}
            isLoading={matchMutation.isPending}
          />

          {/* Step 3: Generate Documents */}
          {matchResult && (
            <GeneratePanel
              jobId={job.id}
              applicationId={applicationId}
              onGenerated={handleGenerated}
            />
          )}

          {/* Step 4: Preview + Chat */}
          {generatedDocs.length > 0 && applicationId && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {generatedDocs.map((doc) => (
                  <DocumentPreview
                    key={doc.docType}
                    applicationId={doc.applicationId}
                    docType={doc.docType}
                    html={doc.html}
                  />
                ))}
              </div>
              <ChatWindow
                applicationId={applicationId}
                onDocumentUpdated={handleDocumentUpdated}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
