import { redirect } from 'next/navigation';

export default function LegacyNewVisualTemplatePage() {
  redirect('/dashboard/templates/new');
}
