import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentPreviewProps {
  applicationId: string;
  docType: string;
  html: string;
}

export default function DocumentPreview({
  applicationId,
  docType,
  html,
}: DocumentPreviewProps) {
  const previewUrl = `/api/generate/preview/${applicationId}/${docType}`;
  const downloadUrl = `/api/generate/download/${applicationId}/${docType}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{docType === "cv" ? "CV" : "Cover Letter"} Preview</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Full Preview
              </a>
            </Button>
            <Button size="sm" asChild>
              <a href={downloadUrl}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download PDF
              </a>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none border rounded-lg p-4 max-h-[600px] overflow-y-auto bg-white text-black"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardContent>
    </Card>
  );
}
