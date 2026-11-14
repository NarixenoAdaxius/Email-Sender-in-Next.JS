import { redirect } from 'next/navigation';

export default async function LegacyEditVisualTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/templates/${id}`);
}
