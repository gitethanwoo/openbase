"use client";

import {
  FileText,
  Globe,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";

interface Citation {
  chunkId: Id<"chunks">;
  sourceId: Id<"sources">;
  sourceName: string;
  sourceType: string;
  contentSnippet: string;
  url?: string;
  pageNumber?: number;
}

interface JudgeEvaluation {
  passed: boolean;
  safetyScore: number;
  groundednessScore: number;
  brandAlignmentScore: number;
  reasoning: string;
  flagged: boolean;
  originalContent?: string;
}

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  judgeEvaluation?: JudgeEvaluation;
}

interface SourcesPanelProps {
  message: Message | null;
}

const sourceTypeIcons: Record<string, typeof FileText> = {
  file: FileText,
  url: Globe,
  faq: MessageSquare,
  text: FileText,
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = Math.round(score * 100);
  const color =
    score >= 0.8
      ? "bg-green-500"
      : score >= 0.5
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function SourcesPanel({ message }: SourcesPanelProps) {
  if (!message || message.role !== "assistant") {
    return (
      <Card className="w-80 shrink-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm font-medium">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          <p>Select an assistant message to view retrieved sources and evaluation details.</p>
        </CardContent>
      </Card>
    );
  }

  const hasCitations = message.citations && message.citations.length > 0;
  const hasEvaluation = message.judgeEvaluation;

  return (
    <Card className="flex w-80 shrink-0 flex-col overflow-hidden">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm font-medium">Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {/* Citations Section */}
        <div className="border-b p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <FileText className="h-3 w-3" />
            Retrieved Sources ({message.citations?.length ?? 0})
          </h4>
          {hasCitations ? (
            <div className="space-y-3">
              {message.citations!.map((citation, index) => {
                const Icon = sourceTypeIcons[citation.sourceType] || FileText;
                return (
                  <div
                    key={`${citation.chunkId}-${index}`}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="mb-2 flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {citation.sourceName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {citation.sourceType}
                          {citation.pageNumber && ` - Page ${citation.pageNumber}`}
                        </p>
                      </div>
                      {citation.url && (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {citation.contentSnippet}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sources were retrieved for this response.
            </p>
          )}
        </div>

        {/* Evaluation Section */}
        <div className="p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            {hasEvaluation && message.judgeEvaluation!.passed ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : hasEvaluation ? (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            ) : (
              <X className="h-3 w-3" />
            )}
            Safety Evaluation
          </h4>
          {hasEvaluation ? (
            <div className="space-y-4">
              {/* Status */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg p-2 text-sm",
                  message.judgeEvaluation!.passed
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                )}
              >
                {message.judgeEvaluation!.passed ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Response passed safety checks</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>Response modified by safety filter</span>
                  </>
                )}
              </div>

              {/* Scores */}
              <div className="space-y-3">
                <ScoreBar
                  label="Safety"
                  score={message.judgeEvaluation!.safetyScore}
                />
                <ScoreBar
                  label="Groundedness"
                  score={message.judgeEvaluation!.groundednessScore}
                />
                <ScoreBar
                  label="Brand Alignment"
                  score={message.judgeEvaluation!.brandAlignmentScore}
                />
              </div>

              {/* Reasoning */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Reasoning
                </p>
                <p className="text-xs text-muted-foreground">
                  {message.judgeEvaluation!.reasoning}
                </p>
              </div>

              {/* Original content if modified */}
              {message.judgeEvaluation!.originalContent && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                    Original Response (before safety filter)
                  </p>
                  <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs dark:border-amber-800 dark:bg-amber-900/20">
                    {message.judgeEvaluation!.originalContent}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No evaluation data available for this response.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
