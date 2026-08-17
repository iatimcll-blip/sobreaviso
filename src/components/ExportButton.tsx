import { Download } from 'lucide-react';
import { useState } from 'react';
import type { FiltroRelatorio, TipoExportacao } from '@shared/types/exportacao';
import { ApiError, api } from '../lib/api-client';
import { useToast } from '../app/layout/ToastProvider';

interface Props {
  tipo: TipoExportacao;
  filtro?: FiltroRelatorio;
  label?: string;
}

/** Botão de exportação Excel reutilizado por todas as telas — respeita os mesmos filtros aplicados na tela. */
export function ExportButton({ tipo, filtro, label = 'Exportar' }: Props) {
  const { notificar } = useToast();
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const params = new URLSearchParams();
      if (filtro?.ciclo) params.set('ciclo', filtro.ciclo);
      if (filtro?.colaboradorId) params.set('colaboradorId', String(filtro.colaboradorId));
      if (filtro?.equipeId) params.set('equipeId', String(filtro.equipeId));
      if (filtro?.ufSigla) params.set('uf', filtro.ufSigla);
      if (filtro?.localidadeId) params.set('localidadeId', String(filtro.localidadeId));

      const query = params.toString();
      await api.baixarArquivo(`/exportacoes/${tipo}${query ? `?${query}` : ''}`);
      notificar('Exportação gerada com sucesso.', 'sucesso');
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível exportar.', 'erro');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <button className="export" onClick={() => void baixar()} disabled={baixando}>
      <Download size={18} />
      {baixando ? 'Gerando…' : label}
    </button>
  );
}
