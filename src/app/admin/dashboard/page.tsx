import { businessService } from '@/services/businessService';
import AdminDashboardClient from './AdminDashboardClient';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  // Puxar estado global inicialmente via Servidor para garantir hidratacao correta do estado KDS
  const businessConfig = await businessService.getConfig();

  return <AdminDashboardClient initialBusinessConfig={businessConfig} />;
}
