import { businessService } from '@/services/businessService';
import CheckoutClient from './CheckoutClient';

export const revalidate = 0; // Evita cache

export default async function CheckoutPage() {
  const businessConfig = await businessService.getConfig();

  return <CheckoutClient businessConfig={businessConfig} />;
}
