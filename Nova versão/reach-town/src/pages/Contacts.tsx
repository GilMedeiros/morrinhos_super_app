import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Papa from 'papaparse';

interface Contact {
    id?: string;
    name: string;
    phone: string;
    tags: string[];
}

export default function ContactsPage() {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [rawText, setRawText] = useState('');
    const [preview, setPreview] = useState<Contact[]>([]);
    const [invalidRows, setInvalidRows] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Carregar contatos já cadastrados
    React.useEffect(() => {
        fetchContacts();
    }, []);
    async function fetchContacts() {
        const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
        setContacts(data || []);
    }

    // Pré-visualização a partir do csv
    function handleParseCSV(file: File) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const valid: Contact[] = [];
                const invalid: string[] = [];
                results.data.forEach((row: any, idx: number) => {
                    // Tags pode vir já como array ou string separada por vírgula
                    const rowTags =
                        typeof row.tags === 'string'
                            ? row.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
                            : Array.isArray(row.tags)
                                ? row.tags
                                : [];
                    if (row.name && row.phone) {
                        valid.push({ name: row.name, phone: row.phone, tags: rowTags });
                    } else {
                        invalid.push(`Linha ${idx + 2}`); // header + idx
                    }
                });
                setPreview(valid);
                setInvalidRows(invalid);
            },
            error: () => setInvalidRows(['Falha ao ler CSV'])
        });
    }

    // Pré-visualização via texto
    function handleParseTextArea() {
        const lines = rawText.trim().split(/\n|\r/).filter(Boolean);
        const valid: Contact[] = [];
        const invalid: string[] = [];
        lines.forEach((line, idx) => {
            // Formato: nome;telefone;tag1,tag2 OU só telefone
            const parts = line.split(';');
            if (parts.length === 1 && /^\+?\d+$/g.test(parts[0].replace(/\D/g, ''))) {
                valid.push({ name: '', phone: parts[0].replace(/\D/g, ''), tags: [] });
            } else if (parts.length >= 2 && parts[1]) {
                const tagArr = (parts[2] || '').split(',').map(t => t.trim()).filter(Boolean);
                valid.push({ name: parts[0] || '', phone: parts[1].replace(/\D/g, ''), tags: tagArr });
            } else {
                invalid.push(`Linha ${idx + 1}`);
            }
        });
        setPreview(valid);
        setInvalidRows(invalid);
    }

    async function handleSaveContacts() {
        if (preview.length === 0) return;
        setIsSaving(true);
        let hasError = false;
        for (const contact of preview) {
            // Garante que tags seja array de strings
            const { error } = await supabase.from('contacts').insert([
                { name: contact.name, phone: contact.phone, tags: contact.tags }
            ]);
            if (error) hasError = true;
        }
        setIsSaving(false);
        await fetchContacts();
        setPreview([]);
        setInvalidRows([]);
        setRawText('');
        setCsvFile(null);
        if (!hasError) alert('Contatos importados com sucesso!');
        else alert('Alguns contatos não foram salvos (já existentes ou erro).');
    }

    async function handleDeleteContact(id: string) {
        if (window.confirm('Remover contato?')) {
            await supabase.from('contacts').delete().eq('id', id);
            fetchContacts();
        }
    }
    async function handleDeleteAll() {
        if (window.confirm('Remover TODOS os contatos? (Esta ação não pode ser desfeita)')) {
            await supabase.from('contacts').delete().not('id', 'is', null);
            fetchContacts();
        }
    }

    return (
        <Layout>
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Importar Contatos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 md:flex-row md:gap-10">
                        <div>
                            <p className="font-medium mb-2">Upload de arquivo CSV</p>
                            <Input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={e => {
                                    const f = e.target.files?.[0] || null;
                                    setCsvFile(f);
                                    if (f) handleParseCSV(f);
                                }}
                            />
                            <div className="text-xs text-muted-foreground mt-2">Colunas: <b>nome</b>;<b>telefone</b>;<b>extra</b> (header obrigatório)</div>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium mb-2">Colar lista manualmente (nome;telefone;extra ou só telefone)</p>
                            <Textarea
                                rows={6}
                                placeholder={"João;61990001111;Observação\nMaria;62980002222;Vip\n(ou apenas o número em uma linha)"}
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                onBlur={handleParseTextArea}
                            />
                            <Button size="sm" className="mt-2" onClick={handleParseTextArea}>Pré-visualizar</Button>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="font-semibold">Pré-visualização de importação</h4>
                        {preview.length > 0 && (
                            <div className="border rounded-md p-2 my-2 text-sm bg-secondary">
                                {preview.map((c, i) => <div key={i} className="flex gap-2"><b>{c.nome || '-'}</b> <span>{c.telefone}</span> <i>{c.extra}</i></div>)}
                            </div>
                        )}
                        {invalidRows.length > 0 && (
                            <div className="text-sm text-destructive">Erros: {invalidRows.join(', ')}</div>
                        )}
                        <Button
                            className="mt-2"
                            onClick={handleSaveContacts}
                            disabled={preview.length === 0 || isSaving}
                            loading={isSaving}
                        >Salvar contatos</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Contatos cadastrados</CardTitle>
                    <Button size="sm" variant="destructive" onClick={handleDeleteAll}>Remover todos</Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full ">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 text-left">Nome</th>
                                    <th className="p-2 text-left">Telefone</th>
                                    <th className="p-2 text-left">Tags</th>
                                    <th className="p-2 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.map(c => (
                                    <tr key={c.id} className="border-b hover:bg-accent/40">
                                        <td className="p-2">{c.name}</td>
                                        <td className="p-2">{c.phone}</td>
                                        <td className="p-2">{Array.isArray(c.tags) ? c.tags.join(', ') : ''}</td>
                                        <td className="p-2 text-center">
                                            <Button size="sm" variant="ghost" onClick={() => handleDeleteContact(c.id!)}>
                                                Remover
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {contacts.length === 0 && <div className="text-center py-8 text-muted-foreground">Nenhum contato encontrado.</div>}
                    </div>
                </CardContent>
            </Card>
        </Layout>
    );
}
