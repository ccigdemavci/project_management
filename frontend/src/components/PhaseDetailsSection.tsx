import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface PhaseDetail {
  id: number;
  phase_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PhaseDetailsSectionProps {
  phaseId: number | null;
  isActive: boolean;
}

export default function PhaseDetailsSection({ phaseId, isActive }: PhaseDetailsSectionProps) {
  const [details, setDetails] = useState<PhaseDetail[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch details when phase changes
  useEffect(() => {
    if (!phaseId || !isActive) return;
    
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<PhaseDetail[]>(`/api/phase-details/phase/${phaseId}`);
        setDetails(data);
      } catch (err) {
        setError('Ayrıntılar yüklenirken bir hata oluştu.');
        console.error('Error fetching phase details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [phaseId, isActive]);

  const handleAddDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !phaseId) return;

    try {
      const newDetail = await apiFetch<PhaseDetail>('/api/phase-details/', {
        method: 'POST',
        body: JSON.stringify({
          phase_id: phaseId,
          title: newTitle.trim(),
          sort_order: details.length,
        }),
      });

      setDetails(prevDetails => [...prevDetails, newDetail]);
      setNewTitle('');
    } catch (err) {
      setError('Ayrıntı eklenirken bir hata oluştu.');
      console.error('Error adding phase detail:', err);
    }
  };

  const handleDeleteDetail = async (id: number) => {
    if (!confirm('Bu ayrıntıyı silmek istediğinize emin misiniz?')) return;

    try {
      await apiFetch(`/api/phase-details/${id}`, {
        method: 'DELETE',
      });
      setDetails(prevDetails => prevDetails.filter(detail => detail.id !== id));
    } catch (err) {
      setError('Ayrıntı silinirken bir hata oluştu.');
      console.error('Error deleting phase detail:', err);
    }
  };

  if (!isActive) return null;

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Aşama Detayları</h3>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleAddDetail} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Yeni başlık ekle"
          className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </button>
      </form>

      {isLoading && details.length === 0 ? (
        <div className="flex items-center justify-center p-4 text-gray-500">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
          Yükleniyor...
        </div>
      ) : details.length === 0 ? (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          Henüz ayrıntı eklenmemiş.
        </div>
      ) : (
        <ul className="space-y-2">
          {details.map((detail) => (
            <li
              key={detail.id}
              className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm hover:shadow"
            >
              <div>
                <h4 className="font-medium text-gray-900">{detail.title}</h4>
                {detail.description && (
                  <p className="mt-1 text-sm text-gray-500">{detail.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteDetail(detail.id)}
                className="p-1 text-gray-400 rounded-full hover:text-red-500 hover:bg-red-50"
                title="Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
