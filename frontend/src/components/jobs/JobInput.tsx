import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Globe, FileImage, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/api/client";
import type { JobPosting } from "@/types";

interface JobInputProps {
  onJobExtracted: (job: JobPosting) => void;
}

export default function JobInput({ onJobExtracted }: JobInputProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const extractMutation = useMutation({
    mutationFn: (data: { url?: string; text?: string }) =>
      api.post<JobPosting>("/jobs/extract", data),
    onSuccess: onJobExtracted,
  });

  const imageMutation = useMutation({
    mutationFn: (file: File) =>
      api.upload<JobPosting>("/jobs/extract/image", file),
    onSuccess: onJobExtracted,
  });

  const isLoading = extractMutation.isPending || imageMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Posting</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="url">
          <TabsList>
            <TabsTrigger value="url">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text">
              <Link className="mr-1.5 h-3.5 w-3.5" />
              Text
            </TabsTrigger>
            <TabsTrigger value="image">
              <FileImage className="mr-1.5 h-3.5 w-3.5" />
              Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3">
            <Input
              placeholder="https://example.com/job-posting"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              onClick={() => extractMutation.mutate({ url })}
              disabled={!url.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Extract from URL
            </Button>
          </TabsContent>

          <TabsContent value="text" className="space-y-3">
            <Textarea
              placeholder="Paste the job posting text here..."
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              onClick={() => extractMutation.mutate({ text })}
              disabled={!text.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Extract from Text
            </Button>
          </TabsContent>

          <TabsContent value="image" className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) imageMutation.mutate(file);
              }}
            />
            {isLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting text from image...
              </p>
            )}
          </TabsContent>
        </Tabs>

        {(extractMutation.isError || imageMutation.isError) && (
          <p className="text-sm text-destructive mt-3">
            {(extractMutation.error || imageMutation.error)?.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
