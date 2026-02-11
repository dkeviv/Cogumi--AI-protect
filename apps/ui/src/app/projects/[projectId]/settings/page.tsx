import { ProjectSettings } from '@/components/project/ProjectSettings';

export default function SettingsPage({ params }: { params: { projectId: string } }) {
  return <ProjectSettings projectId={params.projectId} embedded={false} />;
}

