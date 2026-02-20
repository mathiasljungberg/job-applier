import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import JobInput from "@/components/jobs/JobInput";
import JobDetails from "@/components/jobs/JobDetails";
import SkillMatch from "@/components/matching/SkillMatch";
import GeneratePanel from "@/components/generate/GeneratePanel";
import DocumentPreview from "@/components/generate/DocumentPreview";
import ChatWindow from "@/components/chat/ChatWindow";
import type { MatchResponse } from "@/components/matching/SkillMatch";
import { api } from "@/api/client";
import type { JobPosting, Application } from "@/types";

interface ApplicationWithJob {
  application: Application;
  job_title: string;
  company: string;
}

interface GeneratedDoc {
  applicationId: string;
  docType: string;
  html: string;
}

interface DocHtmlResponse {
  html: string;
  doc_type: string;
}

export default function ApplicationPage() {
  const { id: appId } = useParams<{ id: string }>();
  const isResuming = !!appId;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(appId ?? null);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load existing application data when resuming
  const { data: appData, isLoading: isLoadingApp } = useQuery({
    queryKey: ["application", appId],
    queryFn: () => api.get<ApplicationWithJob>(`/applications/${appId}`),
    enabled: isResuming,
  });

  // Load job when we have a job_id from the application
  const jobId = appData?.application.job_id;
  const { data: jobData, isLoading: isLoadingJob } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.get<JobPosting>(`/jobs/${jobId}`),
    enabled: !!jobId,
  });

  // Set job once loaded
  useEffect(() => {
    if (jobData && !job) {
      setJob(jobData);
    }
  }, [jobData, job]);

  // Load existing generated docs
  useEffect(() => {
    if (!appId || !appData) return;
    const app = appData.application;
    const docsToLoad: Promise<DocHtmlResponse>[] = [];

    if (app.cv_path) {
      docsToLoad.push(api.get<DocHtmlResponse>(`/generate/html/${appId}/cv`));
    }
    if (app.letter_path) {
      docsToLoad.push(api.get<DocHtmlResponse>(`/generate/html/${appId}/letter`));
    }

    if (docsToLoad.length > 0) {
      Promise.all(docsToLoad)
        .then((results) => {
          setGeneratedDocs(
            results.map((r) => ({
              applicationId: appId,
              docType: r.doc_type,
              html: r.html,
            }))
          );
        })
        .catch(() => setLoadError("Failed to load generated documents"));
    }
  }, [appId, appData]);

  // New application flow
  const createAppMutation = useMutation({
    mutationFn: (jId: string) =>
      api.post<Application>("/applications", { job_id: jId }),
    onSuccess: (app) => setApplicationId(app.id),
  });

  const handleJobExtracted = (extractedJob: JobPosting) => {
    setJob(extractedJob);
    createAppMutation.mutate(extractedJob.id);
  };

  const matchMutation = useMutation({
    mutationFn: (jId: string) =>
      api.post<MatchResponse>("/match", { job_id: jId }),
    onSuccess: setMatchResult,
  });

  const handleGenerated = (appIdResult: string, docType: string, html: string) => {
    setApplicationId(appIdResult);
    setGeneratedDocs((prev) => {
      const filtered = prev.filter((d) => d.docType !== docType);
      return [...filtered, { applicationId: appIdResult, docType, html }];
    });
  };

  const handleDocumentUpdated = (docType: string, html: string) => {
    setGeneratedDocs((prev) =>
      prev.map((d) => (d.docType === docType ? { ...d, html } : d))
    );
  };

  // Loading state for resumed applications
  if (isResuming && (isLoadingApp || isLoadingJob)) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading application...</span>
      </div>
    );
  }

  if (loadError) {
    return <p className="text-destructive">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {isResuming ? "Continue Application" : "New Application"}
      </h1>

      {/* Step 1: Job Input (only for new applications) */}
      {!job ? (
        <JobInput onJobExtracted={handleJobExtracted} />
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
          {(matchResult || generatedDocs.length > 0) && (
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
