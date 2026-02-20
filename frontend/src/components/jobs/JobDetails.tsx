import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobPosting } from "@/types";

interface JobDetailsProps {
  job: JobPosting;
}

export default function JobDetails({ job }: JobDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{job.title || "Untitled Position"}</CardTitle>
          {job.company && (
            <p className="text-muted-foreground">{job.company}</p>
          )}
          {job.location && (
            <p className="text-sm text-muted-foreground">{job.location}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.description && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Description</h3>
            <p className="text-sm text-muted-foreground">{job.description}</p>
          </div>
        )}

        {job.required_skills.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.map((s, i) => (
                <Badge key={i} variant="default">{s.name}</Badge>
              ))}
            </div>
          </div>
        )}

        {job.preferred_skills.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Preferred Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.preferred_skills.map((s, i) => (
                <Badge key={i} variant="secondary">{s.name}</Badge>
              ))}
            </div>
          </div>
        )}

        {job.qualifications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Qualifications</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {job.qualifications.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {job.responsibilities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Responsibilities</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {job.responsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {(job.salary || job.deadline) && (
          <div className="flex gap-4 text-sm">
            {job.salary && (
              <span className="text-muted-foreground">Salary: {job.salary}</span>
            )}
            {job.deadline && (
              <span className="text-muted-foreground">Deadline: {job.deadline}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
