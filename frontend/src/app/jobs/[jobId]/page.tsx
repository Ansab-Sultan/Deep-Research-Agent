import { ResearchWorkspace } from "@/components/research-workspace";

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return <ResearchWorkspace initialJobId={jobId} />;
}
