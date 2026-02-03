

import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { Play, Pause, Pencil, Trash } from 'lucide-react';
import CreateCampaignModal from '@/components/campaigns/CreateCampaignModal';
import DispatchCampaignModal from '@/components/campaigns/DispatchCampaignModal';
import { supabase } from '@/integrations/supabase/client';

type Campaign = {
  id: string;
  name: string;
  type: string;
  created_at: string;
  contacts?: any;
};

export default function Campaigns() {
  // Campanhas reais
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedCampaignForDispatch, setSelectedCampaignForDispatch] = useState<Campaign | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [loading, setLoading] = useState(false);

  // Buscar campanhas do Supabase
  async function fetchCampaigns() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setCampaigns((data as Campaign[]) || []);
    setLoading(false);
  }
  useEffect(() => { fetchCampaigns(); }, []);

  // Ao criar nova campanha
  async function handleCampaignCreated() {
    await fetchCampaigns();
    setModalOpen(false);
  }

  async function handleDeleteCampaign(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;
    const { error } = await (supabase as any).from('campaigns').delete().eq('id', id);
    if (!error) await fetchCampaigns();
    else alert('Erro ao excluir campanha: ' + (error.message || ''));
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Campanhas</h2>
            <p className="text-muted-foreground">
              Gerencie campanhas de comunicação
            </p>
          </div>
          <Button variant="default" onClick={() => { setModalOpen(true); setModalMode('create'); setEditCampaign(null); }}>
            Nova campanha
          </Button>
          <CreateCampaignModal
            open={modalOpen}
            onOpenChange={(open) => { setModalOpen(open); if (!open) setEditCampaign(null); }}
            campaign={editCampaign}
            mode={modalMode}
            onCreated={handleCampaignCreated}
          />
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando campanhas...</div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left font-medium">Nome</th>
                    <th className="px-6 py-4 text-left font-medium">Tipo</th>
                    <th className="px-6 py-4 text-left font-medium">Data de criação</th>
                    <th className="px-6 py-4 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-border hover:bg-accent/30">
                      <td className="px-6 py-4">{c.name}</td>
                      <td className="px-6 py-4">{c.type}</td>
                      <td className="px-6 py-4">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</td>
                      <td className="px-6 py-4 flex gap-2 justify-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Disparar"
                          onClick={() => {
                            setSelectedCampaignForDispatch(c);
                            setDispatchModalOpen(true);
                          }}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          onClick={() => {
                            setEditCampaign(c);
                            setModalMode('edit');
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          onClick={() => handleDeleteCampaign(c.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && campaigns.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">Nenhuma campanha encontrada.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCampaignModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditCampaign(null);
        }}
        campaign={editCampaign}
        mode={modalMode}
        onCreated={handleCampaignCreated}
      />

      <DispatchCampaignModal
        open={dispatchModalOpen}
        onOpenChange={setDispatchModalOpen}
        campaignId={selectedCampaignForDispatch?.id || ''}
        campaignName={selectedCampaignForDispatch?.name || ''}
        onDispatchComplete={() => {
          fetchCampaigns();
          setSelectedCampaignForDispatch(null);
        }}
      />
    </Layout>
  );
}