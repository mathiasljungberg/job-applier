import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { FileText, Plus, BookOpen, Target, Briefcase } from "lucide-react";
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
    </div>
  );
}
