import { Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UfInfo } from '@shared/constants/ufs';
import { SITUACAO_CADASTRAL_LABEL, SITUACOES_CADASTRAIS, type ColaboradorDetalhado, type ColaboradorEntrada } from '@shared/types/colaborador';
import type { Equipe } from '@shared/types/equipe';
import type { Localidade } from '@shared/types/localidade';
import { ApiError, api } from '../../lib/api-client';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  colaborador: ColaboradorDetalhado | null;
  uf: UfInfo[];
  localidades: Localidade[];
  equipes: Equipe[];
  colaboradoresDisponiveis: ColaboradorDetalhado[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

const VAZIO: ColaboradorEntrada = {
  nome: '',
  matricula: '',
  funcao: '',
  equipeId: null,
  ufSigla: '',
  localidadeId: 0,
  gestorAdministrativoId: null,
  gestorOperacionalId: null,
  situacaoCadastral: 'ativo',
};

export function ColaboradorFormModal({ colaborador, uf, localidades, equipes, colaboradoresDisponiveis, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [form, setForm] = useState<ColaboradorEntrada>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (colaborador) {
      setForm({
        nome: colaborador.nome,
        matricula: colaborador.matricula ?? '',
        funcao: colaborador.funcao,
        equipeId: colaborador.equipeId,
        ufSigla: colaborador.ufSigla,
        localidadeId: colaborador.localidadeId,
        gestorAdministrativoId: colaborador.gestorAdministrativoId,
        gestorOperacionalId: colaborador.gestorOperacionalId,
        situacaoCadastral: colaborador.situacaoCadastral,
      });
    } else {
      setForm(VAZIO);
    }
    setErro(null);
  }, [colaborador]);

  const localidadesDaUf = localidades.filter((l) => !form.ufSigla || l.ufSigla === form.ufSigla);
  const outrosColaboradores = colaboradoresDisponiveis.filter((c) => c.id !== colaborador?.id);

  async function aoSubmeter() {
    setErro(null);
    if (!form.nome.trim() || !form.funcao.trim() || !form.ufSigla || !form.localidadeId) {
      setErro('Preencha nome, função, UF e localidade.');
      return;
    }
    setSalvando(true);
    try {
      if (colaborador) {
        await api.put(`/colaboradores/${colaborador.id}`, form);
        notificar('Cadastro do colaborador atualizado.', 'sucesso');
      } else {
        await api.post('/colaboradores', form);
        notificar('Colaborador cadastrado com sucesso.', 'sucesso');
      }
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar o colaborador.');
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
          <Users />
        </span>
        <h2>{colaborador ? 'Editar colaborador' : 'Novo colaborador'}</h2>
        <p>Atualize os dados do cadastro e sua estrutura de gestão.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <label className="field">
          Nome
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </label>
        <div className="field-grid-2">
          <label className="field">
            Matrícula
            <input value={form.matricula ?? ''} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
          </label>
          <label className="field">
            Função
            <input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} />
          </label>
        </div>

        <div className="field-grid-2">
          <label className="field">
            UF
            <select
              value={form.ufSigla}
              onChange={(e) => setForm({ ...form, ufSigla: e.target.value, localidadeId: 0 })}
            >
              <option value="">Selecione</option>
              {uf.map((item) => (
                <option key={item.sigla} value={item.sigla}>
                  {item.sigla} — {item.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Localidade
            <select value={form.localidadeId || ''} onChange={(e) => setForm({ ...form, localidadeId: Number(e.target.value) })}>
              <option value="">Selecione</option>
              {localidadesDaUf.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          Equipe
          <select
            value={form.equipeId ?? ''}
            onChange={(e) => setForm({ ...form, equipeId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Sem equipe</option>
            {equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="field-grid-2">
          <label className="field">
            Gestor Administrativo (G.A)
            <select
              value={form.gestorAdministrativoId ?? ''}
              onChange={(e) => setForm({ ...form, gestorAdministrativoId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Não definido</option>
              {outrosColaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Gestor Operacional (G.O)
            <select
              value={form.gestorOperacionalId ?? ''}
              onChange={(e) => setForm({ ...form, gestorOperacionalId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Não definido</option>
              {outrosColaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          Situação cadastral
          <select
            value={form.situacaoCadastral}
            onChange={(e) => setForm({ ...form, situacaoCadastral: e.target.value as ColaboradorEntrada['situacaoCadastral'] })}
          >
            {SITUACOES_CADASTRAIS.map((situacao) => (
              <option key={situacao} value={situacao}>
                {SITUACAO_CADASTRAL_LABEL[situacao]}
              </option>
            ))}
          </select>
        </label>

        <p>
          <small>Tipo de escala e jornada/horário são configurados na tela Escalas (Fase 2).</small>
        </p>

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando}>
            {salvando ? 'Salvando…' : colaborador ? 'Salvar alterações' : 'Cadastrar colaborador'}
          </button>
        </div>
      </div>
    </div>
  );
}
