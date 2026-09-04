import PreviewClient from './preview-client';

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreviewClient projectId={id} />;
}
