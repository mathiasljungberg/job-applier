import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertCircle, XCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";

interface SkillMatchItem {
  requirement: string;
  matched_skill_id: string;
  matched_skill_name: string;
  match_quality: string;
  explanation: string;
}

interface MatchResponse {
  job_id: string;
  job_title: string;
  matches: SkillMatchItem[];
  match_rate: number;
  strong_matches: number;
  partial_matches: number;
  gaps: number;
}

interface SkillMatchProps {
  matchResult: MatchResponse | null;
  isLoading: boolean;
}

const qualityIcons = {
  strong: <CheckCircle className="h-4 w-4 text-green-600" />,
  partial: <AlertCircle className="h-4 w-4 text-yellow-600" />,
  none: <XCircle className="h-4 w-4 text-red-500" />,
};

const qualityColors = {
  strong: "bg-green-50 border-green-200",
  partial: "bg-yellow-50 border-yellow-200",
  none: "bg-red-50 border-red-200",
};

export default function SkillMatch({
  matchResult,
  isLoading,
}: SkillMatchProps) {
  const queryClient = useQueryClient();

  const addSkillMutation = useMutation({
    mutationFn: (name: string) =>
      api.post("/skills", { name, status: "aspirational" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  if (!matchResult && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Analyzing skill matches...</p>
        </CardContent>
      </Card>
    );
  }

  if (!matchResult) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Skill Match Analysis</span>
          <Badge variant="outline" className="text-base">
            {Math.round(matchResult.match_rate * 100)}% match
          </Badge>
        </CardTitle>
        <div className="flex gap-3 text-sm">
          <span className="text-green-600">
            {matchResult.strong_matches} strong
          </span>
          <span className="text-yellow-600">
            {matchResult.partial_matches} partial
          </span>
          <span className="text-red-500">
            {matchResult.gaps} gaps
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {matchResult.matches.map((match, i) => (
          <div
            key={i}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              qualityColors[match.match_quality as keyof typeof qualityColors] ?? ""
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {qualityIcons[match.match_quality as keyof typeof qualityIcons]}
              <div>
                <p className="text-sm font-medium">{match.requirement}</p>
                {match.matched_skill_name ? (
                  <p className="text-xs text-muted-foreground">
                    Matched: {match.matched_skill_name}
                  </p>
                ) : (
                  <p className="text-xs text-red-500">No match found</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {match.explanation}
                </p>
              </div>
            </div>
            {match.match_quality === "none" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addSkillMutation.mutate(match.requirement)}
                title="Add as aspirational skill"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export type { MatchResponse };
