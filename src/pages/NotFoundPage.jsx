import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-4 text-blue-500">
          <FileQuestion size={48} />
        </div>

        <h1 className="m-0 mb-2 text-3xl font-bold text-gray-800">404</h1>
        <p className="m-0 mb-6 text-sm text-gray-500">
          Bunday sahifa topilmadi. Manzilni tekshiring yoki bosh sahifaga qayting.
        </p>

        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate(-1)} variant="secondary">
            Orqaga
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            Bosh sahifa
          </Button>
        </div>
      </div>
    </div>
  );
}
