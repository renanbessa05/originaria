import { Suspense } from 'react';
import { productService } from '@/services/productService';
import { businessService } from '@/services/businessService';
import MenuClient from '@/components/shared/MenuClient';
import { Skeleton } from '@/components/ui/skeleton';

export const revalidate = 0; // Evita cache persistente do Next.js nesta etapa para o menu

function MenuSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
           <Skeleton className="h-10 w-64 mb-2" />
           <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <div className="flex space-x-2 mb-8">
         <Skeleton className="h-9 w-20 rounded-full" />
         <Skeleton className="h-9 w-24 rounded-full" />
         <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border border-neutral-200 rounded-2xl overflow-hidden">
             <Skeleton className="h-48 w-full" />
             <div className="p-5">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex justify-between items-center">
                   <Skeleton className="h-6 w-20" />
                   <Skeleton className="h-10 w-10 rounded-full" />
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Data Fetcher Server Component
async function MenuData() {
  const [products, categories, businessConfig] = await Promise.all([
    productService.getProducts(),
    productService.getCategories(),
    businessService.getConfig()
  ]);

  return (
    <MenuClient 
      products={products} 
      categories={categories} 
      businessConfig={businessConfig} 
    />
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <Suspense fallback={<MenuSkeleton />}>
        <MenuData />
      </Suspense>
    </main>
  );
}
