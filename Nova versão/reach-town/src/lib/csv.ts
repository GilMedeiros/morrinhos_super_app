// Pequeno utilitário para ler o CSV de contatos (async)
export function parseContactsCsv(file: File): Promise<Array<{ name: string; phone: string }>> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = reader.result as string;
                // Espera: nome,telefone (cabeçalho opcional)
                const lines = text.trim().split(/[\n\r]+/).filter(Boolean);
                let items = lines.map(line =>
                    line.split(',').map(s => s.trim())
                );
                // Remove cabeçalho se for string 'nome' ou 'name'
                if (items[0][0].toLowerCase().startsWith('nome') || items[0][0].toLowerCase().startsWith('name')) {
                    items = items.slice(1);
                }
                const out = items
                    .map(([name, phone]) => ({ name, phone }))
                    .filter(x => x.name && x.phone);
                resolve(out);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = err => reject(err);
        reader.readAsText(file);
    });
}
