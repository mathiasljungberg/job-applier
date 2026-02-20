import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/api/client";
import type { Application, ApplicationStatus } from "@/types";

interface ApplicationWithJob {
  application: Application;
  job_title: string;
  company: string;
}

const STATUS_VARIANTS: Record<ApplicationStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  ready: "bg-blue-100 text-blue-800",
  applied: "bg-indigo-100 text-indigo-800",
  interview: "bg-purple-100 text-purple-800",
  offer: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-yellow-100 text-yellow-800",
};

const STATUSES: ApplicationStatus[] = [
  "draft", "ready", "applied", "interview", "offer", "rejected", "withdrawn",
];

export default function TrackingPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [followUpType, setFollowUpType] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.get<ApplicationWithJob[]>("/applications"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      status?: ApplicationStatus;
      notes?: string;
    }) => api.put(`/applications/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  const followUpMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; type: string; notes: string }) =>
      api.post(`/applications/${id}/follow-up`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setFollowUpType("");
      setFollowUpNotes("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/applications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setSelectedId(null);
    },
  });

  const selected = applications.find((a) => a.application.id === selectedId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Application Tracking</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : applications.length === 0 ? (
        <p className="text-muted-foreground">
          No applications yet. Generate documents from the New Application page to start tracking.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* List */}
          <div className="space-y-2">
            {applications.map(({ application: app, job_title, company }) => (
              <Card
                key={app.id}
                className={`cursor-pointer transition-colors ${
                  selectedId === app.id ? "border-primary" : "hover:bg-accent"
                }`}
                onClick={() => setSelectedId(app.id)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {job_title || "Untitled Position"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {company || "Unknown Company"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(app.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge className={STATUS_VARIANTS[app.status]}>
                      {app.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail */}
          {selected ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selected.job_title || "Untitled"}</CardTitle>
                  <p className="text-muted-foreground">{selected.company}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div>
                    <Label>Status</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={selected.application.status}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: selected.application.id,
                          status: e.target.value as ApplicationStatus,
                        })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={selected.application.notes}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: selected.application.id,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  {/* Documents */}
                  <div className="flex gap-2">
                    {selected.application.cv_path && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/generate/download/${selected.application.id}/cv`}>
                          Download CV
                        </a>
                      </Button>
                    )}
                    {selected.application.letter_path && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/generate/download/${selected.application.id}/letter`}>
                          Download Letter
                        </a>
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selected.application.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Application
                  </Button>
                </CardContent>
              </Card>

              {/* Follow-ups */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Follow-ups</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.application.follow_ups.map((fu, i) => (
                    <div key={i} className="flex gap-3 text-sm border-b pb-2">
                      <Badge variant="outline">{fu.type || "note"}</Badge>
                      <div>
                        <p>{fu.notes}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(fu.date), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 items-end">
                    <div className="w-24">
                      <Label>Type</Label>
                      <Input
                        placeholder="email"
                        value={followUpType}
                        onChange={(e) => setFollowUpType(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Notes</Label>
                      <Input
                        placeholder="Follow-up notes..."
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        followUpMutation.mutate({
                          id: selected.application.id,
                          type: followUpType,
                          notes: followUpNotes,
                        })
                      }
                      disabled={!followUpNotes.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 border rounded-lg text-muted-foreground">
              <p className="text-sm">Select an application to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
