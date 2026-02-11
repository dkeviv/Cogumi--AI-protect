import { SetupWizard } from '@/components/project/SetupWizard';

export default function SetupPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;
  return <SetupWizard projectId={projectId} baseHref={`/projects/${projectId}/setup`} embedded={false} />;
}

