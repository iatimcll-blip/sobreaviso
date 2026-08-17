import { BellRing, X } from 'lucide-react';
import { useState } from 'react';
import type { Dupla } from '@shared/types/dupla';
import type { Equipe } from '@shared/types/equipe';
import type { Localidade } from '@shared/types/localidade';
import type { SobreavisoEntrada } from '@shared/types/sobreaviso';
import { ApiError, api } from '../../lib/api-client';
import type { ColaboradorResumo } from '../../lib/useReferencias';
import { useToast } from '../../app/layout/ToastProvider';

type TipoAlvo = 'colaborador' | 'equipe';

interface Props {
  colaboradores: ColaboradorResumo[];
  equipes: Equipe[];
  duplas: Dupla[];
  localidades: Localidade[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function SobreavisoFormModal({ colaboradores, equipes, duplas, localidades, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [tipoAlvo, setTipoAlvo] = useState<TipoAlvo>('equipe');
  const [colaboradorId, setColaboradorId] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const [duplaId, setDuplaId] = useState('');
  const [localidadeId, setLocalidadeId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(forcar: boolean) {
    setErro(null);
    if (!inicio || !fim) {
      setErro('Informe início e fim do plantão.');
      return;
    }
    const dado: SobreavisoEntrada = {
      colaboradorId: tipoAlvo === 'colaborador' && colaboradorId ? Number(colaboradorId) : null,
      equipeId: tipoAlvo === 'equipe' && equipeId ? Number(equipeId) : null,
      duplaId: duplaId ? Number(duplaId) : null,
      localidadeId: localidadeId ? Number(localidadeId) : null,
      inicio,
      fim,
      observacoes: observacoes || null,
      forcar,
    };
    setSalvando(true);
    try {
      await api.post('/sobreaviso', dado);
      notificar('Sobreaviso lançado com sucesso.', 'sucesso');
      aoSalvar();
    } catch (erroCapturado) {
      if (erroCapturado instanceof ApiError && erroCapturado.status === 409) {
        const conflitos = erroCapturado.detalhes as { colaboradorNome: string | null; equipeNome: string | null; inicio: string; fim: string }[] | undefined;
        const resumo = conflitos?.map((cf) => `${cf.colaboradorNome ?? cf.equipeNome} (${cf.inicio} — ${cf.fim})`).join('; ');
        if (confirm(`Já existe sobreposição de sobreaviso: ${resumo ?? erroCapturado.message}.\n\nDeseja lançar mesmo assim?`)) {
          await enviar(true);
          return;
        }
        setErro('Lançamento cancelado por conflito de sobreaviso.');
      } else {
        setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível lançar o sobreaviso.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <button className="modal-x" onClick={aoFechar} aria-label="Fechar">
          <X />
        </button>
        <span className="modal-icon">
          <BellRing />
        </span>
        <h2>Novo sobreaviso</h2>
        <p>Lance um plantão de sobreaviso individual ou por equipe.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <label className="field">
          Lançar para
          <select value={tipoAlvo} onChange={(e) => setTipoAlvo(e.target.value as TipoAlvo)}>
            <option value="equipe">Equipe</option>
            <option value="colaborador">Colaborador</option>
          </select>
        </label>

        {tipoAlvo === 'equipe' ? (
          <label className="field">
            Equipe
            <select value={equipeId} onChange={(e) => setEquipeId(e.target.value)}>
              <option value="">Selecione</option>
              {equipes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nome}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            Colaborador
            <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="field-grid-2">
          <label className="field">
            Dupla (opcional)
            <select value={duplaId} onChange={(e) => setDuplaId(e.target.value)}>
              <option value="">Nenhuma</option>
              {duplas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome ?? `Dupla #${d.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Localidade (opcional)
            <select value={localidadeId} onChange={(e) => setLocalidadeId(e.target.value)}>
              <option value="">Não informada</option>
              {localidades.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-grid-2">
          <label className="field">
            Início
            <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label className="field">
            Fim
            <input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
          </label>
        </div>

        <label className="field">
          Observações
          <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </label>

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void enviar(false)} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Lançar sobreaviso'}
          </button>
        </div>
      </div>
    </div>
  );
}
