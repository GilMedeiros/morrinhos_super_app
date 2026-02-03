import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import { parseContactsCsv } from '@/lib/csv';



type Campaign = {
    id: string;
    name: string;
    type: string;
    contacts?: any;
};
interface CreateCampaignModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: () => void;
    campaign?: Campaign | null;
    mode?: 'create' | 'edit';
}

import { supabase } from '@/integrations/supabase/client';

export default function CreateCampaignModal({ open, onOpenChange, onCreated, campaign, mode = 'create' }: CreateCampaignModalProps) {
    const [name, setName] = useState(campaign?.name || '');
    const [type, setType] = useState<string>(campaign?.type || 'unique');
    const [contactOption, setContactOption] = useState<'select' | 'upload'>('select');
    const [contacts, setContacts] = useState<Array<{ id: string, name: string, phone: string, tags?: string | null }>>([]);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingContacts, setUploadingContacts] = useState(false);
    const [uploadResult, setUploadResult] = useState<null | { success: number; fail: number }>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    // Helper: importa contatos do CSV, salva no Supabase, retorna array de ids criados
    async function importContactsCsvToSupabase(): Promise<string[]> {
        if (!csvFile) return [];
        setUploadingContacts(true);
        try {
            const parsed = await parseContactsCsv(csvFile);
            if (!parsed.length) throw new Error('Nenhum contato válido encontrado no arquivo.');
            // @ts-expect-error motivo: types do supabase client podem não conter contacts
            const { error: insertErr, data: insertData } = await supabase.from('contacts').insert(parsed).select();
            setUploadingContacts(false);
            if (insertErr) throw new Error(insertErr.message || 'Erro ao salvar contatos.');
            // Retornar os ids dos inseridos
            return Array.isArray(insertData) ? insertData.map((c: any) => c.id) : [];
        } catch (err: any) {
            setUploadingContacts(false);
            setError('Erro ao importar contatos do CSV: ' + (err.message || ''));
            throw err;
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCsvFile(e.target.files?.[0] || null);
        setSelectedContacts([]);
    }

    function handleSelectContact(id: string) {
        setSelectedContacts(cur =>
            cur.includes(id) ? cur.filter(cid => cid !== id) : [...cur, id]
        );
        setCsvFile(null);
    }

    // Preenche estado ao abrir para editar
    // Carrega contatos reais ao abrir o modal
    React.useEffect(() => {
        async function fetchContacts() {
            // @ts-expect-error
            const { data, error } = await supabase.from('contacts').select('*').order('name');
            setContacts(!error && Array.isArray(data) ? data : []);
        }
        if (open && contactOption === 'select') fetchContacts();
    }, [open, contactOption]);

    React.useEffect(() => {
        if (open && campaign && mode === 'edit') {
            setName(campaign.name || '');
            setType(campaign.type || 'unique');
            if (Array.isArray(campaign.contacts)) {
                setSelectedContacts(campaign.contacts.map(String));
            } else {
                setSelectedContacts([]);
            }
        }
        if (open && mode === 'create') {
            setName(''); setType('unique'); setSelectedContacts([]); setCsvFile(null);
        }
    }, [open, campaign, mode]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        let contactData;
        try {
            if (contactOption === 'select') {
                contactData = selectedContacts; // ids dos contatos reais
            } else if (contactOption === 'upload' && csvFile) {
                // Realiza upload do CSV automaticamente
                const createdIds = await importContactsCsvToSupabase();
                contactData = createdIds; // salva array de ids
            }
            if (mode === 'create') {
                const insertObj = { name, type, contacts: contactData };
                // @ts-expect-error - campaigns pode não estar no dts gerado
                const { error: err } = await supabase.from('campaigns').insert([insertObj]);
                setSaving(false);
                if (!err) {
                    onOpenChange(false);
                    if (onCreated) onCreated();
                } else {
                    setError(err.message || 'Erro ao criar campanha.');
                }
            } else if (mode === 'edit' && campaign?.id) {
                // @ts-expect-error - campaigns pode não estar no dts gerado
                const { error: err } = await supabase.from('campaigns').update({ name, type, contacts: contactData }).eq('id', campaign.id);
                setSaving(false);
                if (!err) {
                    onOpenChange(false);
                    if (onCreated) onCreated();
                } else {
                    setError(err.message || 'Erro ao editar campanha.');
                }
            }
        } catch (err: any) {
            setSaving(false);
            setError('Falha ao salvar contatos/campanha: ' + (err.message || ''));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Editar campanha' : 'Nova campanha'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                        <Label htmlFor="campaign-name">Nome da campanha</Label>
                        <Input id="campaign-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>

                    <div>
                        <Label htmlFor="type">Tipo de campanha</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unique">Disparo único</SelectItem>
                                <SelectItem value="scheduled">Recorrente/Agendada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Contatos</Label>
                        <div className="flex items-center gap-4 mb-2">
                            <Button type="button" variant={contactOption === 'select' ? 'default' : 'outline'} onClick={() => setContactOption('select')}>Selecionar</Button>
                            <Button type="button" variant={contactOption === 'upload' ? 'default' : 'outline'} onClick={() => setContactOption('upload')}>Fazer upload (CSV)</Button>
                        </div>
                        {contactOption === 'select' ? (
                            <>
                                <Input
                                    placeholder="Filtrar por nome, telefone ou tags..."
                                    value={filter}
                                    onChange={e => setFilter(e.target.value)}
                                    className="mb-2"
                                />
                                <div className="space-y-1 max-h-52 overflow-y-auto">
                                    {contacts.length === 0 && <span className="text-muted-foreground">Nenhum contato encontrado. Importe ou cadastre contatos!</span>}
                                    {contacts
                                        .filter(c => {
                                            const f = filter.trim().toLowerCase();
                                            if (!f) return true;
                                            return (
                                                c.name?.toLowerCase().includes(f) ||
                                                c.phone?.toLowerCase().includes(f) ||
                                                (c.tags && c.tags.toLowerCase().includes(f))
                                            );
                                        })
                                        .map(c => (
                                            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={selectedContacts.includes(c.id)} onChange={() => handleSelectContact(c.id)} />
                                                {c.name} <span className="text-xs text-muted-foreground">({c.phone})</span>
                                                {c.tags && <span className="ml-2 text-xs text-blue-600 bg-blue-50 rounded px-1">{c.tags}</span>}
                                            </label>
                                        ))}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <input id="csv-file" className="hidden" type="file" accept=".csv" onChange={handleFileChange} />
                                <label htmlFor="csv-file" className="inline-flex items-center gap-2 px-2.5 py-1.5 border rounded cursor-pointer">
                                    <FileText className="h-4 w-4" />
                                    {csvFile?.name || 'Escolher arquivo .csv'}
                                </label>
                                {/* Botão "Salvar contatos no banco" removido; upload agora ocorre ao criar a campanha */}
                                {error && <div className="text-destructive mt-2 whitespace-pre-line text-xs">{error}</div>}
                                {csvFile && <div className="text-xs text-muted-foreground">O arquivo precisa ter colunas: nome, telefone (ou name, phone)</div>}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                        <Button type="submit" disabled={saving || !name || (contactOption === 'select' ? selectedContacts.length === 0 : !csvFile)}>
                            {saving ? 'Salvando...' : (mode === 'edit' ? 'Salvar' : 'Criar')}
                        </Button>
                    </DialogFooter>
                    {error && <div className="text-destructive text-sm mt-2">{error}</div>}
                </form>
            </DialogContent>
        </Dialog>
    );
}
