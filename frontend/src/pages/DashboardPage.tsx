import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { FileText, Plus, BookOpen, Target, Briefcase, Activity } from "lucide-react";
import type { Document, SkillLibrary, Application } from "@/types";

interface ApplicationWithJob {
  application: Application;
  job_title: string;
  company: string;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<string>("checking...");
  const [llmStatus, setLlmStatus] = useState<string>("unknown");

  useEffect(() => {
    api
      .healthCheck()
      .then((res) => {
        setHealth(`${res.status} (v${res.version})`);
        if (!res.llm_configured) {
          setLlmStatus(`no API key for ${res.llm_provider}`);
        } else {
          setLlmStatus(`${res.llm_provider} key configured`);
        }
      })
      .catch(() => setHealth("offline"));
  }, []);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get<Document[]>("/library/documents"),
  });

  const { data: skillsData } = useQuery({
    queryKey: ["skills"],
    queryFn: () => api.get<SkillLibrary>("/skills"),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.get<ApplicationWithJob[]>("/applications"),
  });

  const { data: usageSummary } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => api.getUsageSummary(),
  });

  const skills = skillsData?.skills ?? [];
  const activeApps = applications.filter(
    (a) => !["rejected", "withdrawn"].includes(a.application.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Backend: {health} &middot; LLM: {llmStatus}
          </p>
        </div>
        <Link to="/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/library">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-xs text-muted-foreground">CVs & cover letters</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/skills">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skills</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{skills.length}</p>
              <p className="text-xs text-muted-foreground">In your library</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/tracking">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeApps.length}</p>
              <p className="text-xs text-muted-foreground">Active applications</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/tracking">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{applications.length}</p>
              <p className="text-xs text-muted-foreground">All applications</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Applications */}
      {applications.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Applications</h2>
          <div className="space-y-2">
            {applications.slice(0, 5).map(({ application: app, job_title, company }) => (
              <Link to="/tracking" key={app.id}>
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{job_title || "Untitled"}</p>
                      <p className="text-sm text-muted-foreground">{company}</p>
                    </div>
                    <Badge variant="outline">{app.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* LLM Usage */}
      {usageSummary && usageSummary.total_calls > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">LLM Usage</h2>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usage Summary</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 grid-cols-3">
                <div>
                  <p className="text-2xl font-bold">{usageSummary.total_calls}</p>
                  <p className="text-xs text-muted-foreground">API calls</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {((usageSummary.total_input_tokens + usageSummary.total_output_tokens) / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-muted-foreground">Total tokens</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">${usageSummary.total_cost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">Estimated cost</p>
                </div>
              </div>
              {Object.keys(usageSummary.by_model).length > 0 && (
                <div className="text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="text-muted-foreground text-xs">
                        <th className="text-left font-medium pb-1">Model</th>
                        <th className="text-right font-medium pb-1">Calls</th>
                        <th className="text-right font-medium pb-1">Tokens</th>
                        <th className="text-right font-medium pb-1">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(usageSummary.by_model).map(([model, stats]) => (
                        <tr key={model}>
                          <td className="py-0.5">{model}</td>
                          <td className="text-right">{stats.calls}</td>
                          <td className="text-right">
                            {((stats.input_tokens + stats.output_tokens) / 1000).toFixed(1)}k
                          </td>
                          <td className="text-right">${stats.cost.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
