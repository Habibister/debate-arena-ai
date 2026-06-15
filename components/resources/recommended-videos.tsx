import { ExternalLink, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recommendedResources, type StudyOrganization } from "@/lib/study-content";

type RecommendedVideosProps = {
  organization?: StudyOrganization;
  skillTags?: string[];
  title?: string;
  limit?: number;
};

export function RecommendedVideos({ organization, skillTags, title = "Recommended videos", limit = 3 }: RecommendedVideosProps) {
  const resources = recommendedResources({ organization, skillTags, limit });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant="outline">External resources</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{resource.sourceName}</p>
                <h3 className="mt-1 font-semibold leading-6">{resource.title}</h3>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.topic}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{resource.estimatedDuration}</Badge>
              <Badge variant="outline">{resource.followUp}</Badge>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
