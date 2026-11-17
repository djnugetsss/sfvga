import { redirect } from 'next/navigation';

export default function LegacyBootstrapPage() {
  redirect('/session');
}
