import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { EscalaVinculo } from '@shared/types/escala';
import type { Equipe } from '@shared/types/equipe';
import type { Localidade } from '@shared/types/localidade';
import { ApiError, api } from '../../lib/api-client';
import type { ColaboradorResumo } from '../../lib/useReferencias';
import { useToast } from '../../app/layout/ToastProvider';

type TipoAlvo = 'colaborador' | 'equipe' | 'localidade';

interface Props {
  escalaModeloId: number;
  vinculos: EscalaVinculo[];
  colaboradores: ColaboradorResumo[];
  equipes: Equipe[];
  localidades: Localidade[];
  onVinculosChange: (vinculos: EscalaVinculo[]) => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export function EscalaVinculosManager({ escalaModeloId, vinculos, colaboradores, equipes, localidades, onVinculosChange }: Props) {
  const { notificar } = useToast();
  const [tipoAlvo, setTipoAlvo] = useState<TipoAlvo>('equipe');
  const [alvoId, setAlvoId] = useState('');
  const [dataInicio, setDataInicio] = useState(hoje());

  const opcoes = tipoAlvo === 'colaborador' ? colaboradores : tipoAlvo === 'equipe' ? equipes : localidades;

  async function adicionar() {
    if (!alvoId) return;
    try {
      const dado = {
        colaboradorId: tipoAlvo === 'colaborador' ? Number(alvoId) : null,
        equipeId: tipoAlvo === 'equipe' ? Number(alvoId) : null,
        localidadeId: tipoAlvo === 'localidade' ? Number(alvoId) : null,
        dataInicio,
      };
      const resposta = await api.post<{ vinculos: EscalaVinculo[] }>(`/escalas/${escalaModeloId}/vinculos`, dado);
      onVinculosChange(resposta.vinculos);
      setAlvoId('');
      notificar('Vínculo adicionado.', 'sucesso');
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível adicionar o vínculo.', 'erro');
    }
  }

  async function remover(vinculoId: number) {
    try {
      await api.delete(`/escalas/vinculos/${vinculoId}`);
      onVinculosChange(vinculos.filter((v) => v.id !== vinculoId));
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível remover o vínculo.', 'erro');
    }
  }

  return (
    <div className="field">
      Vínculos (colaboradores, equipes ou localidades que seguem esta escala)
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vínculo</th>
              <th>Início</th>
              <th>Fim</th>
              <th className="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vinculos.map((vinculo) => (
              <tr key={vinculo.id}>
                <td>{vinculo.colaboradorNome ?? vinculo.equipeNome ?? vinculo.localidadeNome}</td>
                <td>{vinculo.dataInicio}</td>
                <td>{vinculo.dataFim ?? 'indeterminado'}</td>
                <td className="col-acoes">
                  <button onClick={() => void remover(vinculo.id)} title="Remover vínculo">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {vinculos.length === 0 && (
              <tr>
                <td colSpan={4} className="data-table-empty">
                  Nenhum vínculo cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-toolbar mt-10">
        <select
          value={tipoAlvo}
          onChange={(e) => {
            setTipoAlvo(e.target.value as TipoAlvo);
            setAlvoId('');
          }}
        >
          <option value="colaborador">Colaborador</option>
          <option value="equipe">Equipe</option>
          <option value="localidade">Localidade</option>
        </select>
        <select value={alvoId} onChange={(e) => setAlvoId(e.target.value)}>
          <option value="">Selecione…</option>
          {opcoes.map((op) => (
            <option key={op.id} value={op.id}>
              {op.nome}
            </option>
          ))}
        </select>
        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <button className="outline" onClick={() => void adicionar()} disabled={!alvoId}>
          Vincular
        </button>
      </div>
    </div>
  );
}
