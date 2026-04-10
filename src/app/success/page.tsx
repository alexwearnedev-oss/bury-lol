import { parseSuccessToken } from '@/lib/success-token';
import SuccessContent from './SuccessContent';

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function SuccessPage({ searchParams }: Props) {
  const raw = searchParams.t;
  const tokenStr = typeof raw === 'string' ? raw : null;

  const grave = tokenStr
    ? await parseSuccessToken(tokenStr, process.env.STRIPE_SECRET_KEY ?? '')
    : null;

  return <SuccessContent grave={grave} />;
}
