import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/api/client";
import type { Skill, SkillLibrary, SkillCategory } from "@/types";

const CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: "programming_languages", label: "Languages" },
  { value: "frameworks", label: "Frameworks" },
  { value: "devops", label: "DevOps" },
  { value: "tools", label: "Tools" },
  { value: "soft_skills", label: "Soft Skills" },
  { value: "domain_knowledge", label: "Domain" },
  { value: "certifications", label: "Certs" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  aspirational: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
};

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<SkillCategory | "all">("all");
  const [adding, setAdding] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", category: "other" as SkillCategory });

  const { data, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => api.get<SkillLibrary>("/skills"),
  });

  const skills = data?.skills ?? [];
  const filtered = filter === "all" ? skills : skills.filter((s) => s.category === filter);

  const createMutation = useMutation({
    mutationFn: (skill: { name: string; category: SkillCategory }) =>
      api.post("/skills", skill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setAdding(false);
      setNewSkill({ name: "", category: "other" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/skills/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string }) =>
      api.put(`/skills/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    skills: filtered.filter((s) => s.category === cat.value),
  })).filter((g) => g.skills.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Skills Library</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Skill
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({skills.length})
        </Button>
        {CATEGORIES.map((cat) => {
          const count = skills.filter((s) => s.category === cat.value).length;
          if (count === 0) return null;
          return (
            <Button
              key={cat.value}
              variant={filter === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat.value)}
            >
              {cat.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Add Skill Form */}
      {adding && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Skill Name</Label>
                <Input
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="e.g. Python"
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={newSkill.category}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, category: e.target.value as SkillCategory })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={() => createMutation.mutate(newSkill)}
                disabled={!newSkill.name.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Display */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading skills...</p>
      ) : grouped.length === 0 ? (
        <p className="text-muted-foreground">
          No skills yet. Upload a document and extract skills, or add them manually.
        </p>
      ) : (
        grouped.map((group) => (
          <div key={group.value}>
            <h2 className="text-lg font-semibold mb-2">{group.label}</h2>
            <div className="flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <SkillChip
                  key={skill.id}
                  skill={skill}
                  onDelete={() => deleteMutation.mutate(skill.id)}
                  onToggleStatus={() => {
                    const next = skill.status === "confirmed" ? "aspirational" : "confirmed";
                    updateMutation.mutate({ id: skill.id, status: next });
                  }}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SkillChip({
  skill,
  onDelete,
  onToggleStatus,
}: {
  skill: Skill;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border cursor-default ${
        STATUS_COLORS[skill.status] ?? ""
      }`}
    >
      <span
        className="cursor-pointer"
        onClick={onToggleStatus}
        title={`Status: ${skill.status} (click to toggle)`}
      >
        {skill.name}
      </span>
      {skill.proficiency && (
        <span className="text-xs opacity-60">({skill.proficiency})</span>
      )}
      <button
        onClick={onDelete}
        className="ml-1 opacity-40 hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
