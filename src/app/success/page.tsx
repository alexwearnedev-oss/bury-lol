import { Suspense } from 'react';
import SuccessContent from './SuccessContent';

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <p className="text-stone">Digging...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
