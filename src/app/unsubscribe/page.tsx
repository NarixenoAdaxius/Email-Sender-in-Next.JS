import UnsubscribeClient from './UnsubscribeClient';

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  return <UnsubscribeClient token={params.token} />;
}
