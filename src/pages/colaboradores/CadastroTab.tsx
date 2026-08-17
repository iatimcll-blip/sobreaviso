import { Plus, Trash2, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SITUACAO_CADASTRAL_LABEL, SITUACOES_CADASTRAIS, type ColaboradorDetalhado } from '@shared/types/colaborador';
import type { ColaboradorImportado } from '@shared/import/colaboradoresDefinicao';
import { ExportButton } from '../../components/ExportButton';
import { ImportButton } from '../../components/ImportButton';
import { useToast } from '../../app/layout/ToastProvider';
import { useAuth } from '../../lib/auth-context';
import { ApiError, api } from '../../lib/api-client';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { ColaboradorFormModal } from './ColaboradorFormModal';

export function CadastroTab() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [colaboradores, setColaboradores] = useState<ColaboradorDetalhado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const [ufSigla, setUfSigla] = useState('');
  const [localidadeId, setLocalidadeId] = useState('');
  const [situacaoCadastral, setSituacaoCadastral] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [colaboradorEmEdicao, setColaboradorEmEdicao] = useState<ColaboradorDetalhado | null>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [equipeEmLote, setEquipeEmLote] = useState('');
  const [atribuindo, setAtribuindo] = useState(false);

  const podeCriar = temPermissao(usuario, permissoes, 'colaboradores', 'criar');
  const podeEditar = temPermissao(usuario, permissoes, 'colaboradores', 'editar');
  const podeExcluir = temPermissao(usuario, permissoes, 'colaboradores', 'excluir');
  const podeImportar = temPermissao(usuario, permissoes, 'colaboradores', 'importar');
  const podeExportar = temPermissao(usuario, permissoes, 'colaboradores', 'exportar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.set('busca', busca);
      if (equipeId) params.set('equipeId', equipeId);
      if (ufSigla) params.set('ufSigla', ufSigla);
      if (localidadeId) params.set('localidadeId', localidadeId);
      if (situacaoCadastral) params.set('situacaoCadastral', situacaoCadastral);
      const resposta = await api.get<{ colaboradores: ColaboradorDetalhado[] }>(`/colaboradores?${params.toString()}`);
      setColaboradores(resposta.colaboradores);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar os colaboradores.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [busca, equipeId, ufSigla, localidadeId, situacaoCadastral, notificar]);

  useEffect(() => {
    const debounce = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(debounce);
  }, [carregar]);

  function aoMudarUf(novaUf: string) {
    setUfSigla(novaUf);
    setLocalidadeId('');
  }

  function limparFiltros() {
    setBusca('');
    setEquipeId('');
    setUfSigla('');
    setLocalidadeId('');
    setSituacaoCadastral('');
  }

  const localidadesDaUf = ufSigla ? referencias.localidades.filter((l) => l.ufSigla === ufSigla) : referencias.localidades;
  const filtrosAtivos = Boolean(busca || equipeId || ufSigla || localidadeId || situacaoCadastral);

  useEffect(() => {
    const idsVisiveis = new Set(colaboradores.map((c) => c.id));
    setSelecionados((atual) => atual.filter((id) => idsVisiveis.has(id)));
  }, [colaboradores]);

  function alternarSelecao(id: number) {
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  }

  function alternarSelecaoTodos() {
    setSelecionados((atual) => (atual.length === colaboradores.length ? [] : colaboradores.map((c) => c.id)));
  }

  async function atribuirEquipeEmLote() {
    if (selecionados.length === 0) return;
    setAtribuindo(true);
    try {
      await api.patch('/colaboradores/atribuir-equipe', {
        colaboradorIds: selecionados,
        equipeId: equipeEmLote ? Number(equipeEmLote) : null,
      });
      notificar(`Equipe atualizada para ${selecionados.length} colaborador(es).`, 'sucesso');
      setSelecionados([]);
      setEquipeEmLote('');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível atualizar a equipe em lote.', 'erro');
    } finally {
      setAtribuindo(false);
    }
  }

  function abrirNovo() {
    setColaboradorEmEdicao(null);
    setModalAberto(true);
  }

  function abrirEdicao(colaborador: ColaboradorDetalhado) {
    if (!podeEditar) return;
    setColaboradorEmEdicao(colaborador);
    setModalAberto(true);
  }

  async function desativar(colaborador: ColaboradorDetalhado, evento: React.MouseEvent) {
    evento.stopPropagation();
    if (!confirm(`Desativar o colaborador "${colaborador.nome}"?`)) return;
    try {
      await api.patch(`/colaboradores/${colaborador.id}/situacao`, { situacaoCadastral: 'inativo' });
      notificar('Colaborador desativado.', 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível desativar o colaborador.', 'erro');
    }
  }

  async function excluir(colaborador: ColaboradorDetalhado, evento: React.MouseEvent) {
    evento.stopPropagation();
    if (!confirm(`Excluir definitivamente o colaborador "${colaborador.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/colaboradores/${colaborador.id}`);
      notificar('Colaborador excluído.', 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível excluir o colaborador.', 'erro');
    }
  }

  return (
    <>
      <div className="card card-padded">
        <div className="table-toolbar">
          <input placeholder="Buscar por nome ou função…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={equipeId} onChange={(e) => setEquipeId(e.target.value)}>
            <option value="">Todas as equipes</option>
            {referencias.equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </option>
            ))}
          </select>
          <select value={ufSigla} onChange={(e) => aoMudarUf(e.target.value)}>
            <option value="">Todas as UFs</option>
            {referencias.uf.map((item) => (
              <option key={item.sigla} value={item.sigla}>
                {item.sigla} — {item.nome}
              </option>
            ))}
          </select>
          <select value={localidadeId} onChange={(e) => setLocalidadeId(e.target.value)}>
            <option value="">Todas as localidades</option>
            {localidadesDaUf.map((localidade) => (
              <option key={localidade.id} value={localidade.id}>
                {localidade.nome}
              </option>
            ))}
          </select>
          <select value={situacaoCadastral} onChange={(e) => setSituacaoCadastral(e.target.value)}>
            <option value="">Todas as situações</option>
            {SITUACOES_CADASTRAIS.map((situacao) => (
              <option key={situacao} value={situacao}>
                {SITUACAO_CADASTRAL_LABEL[situacao]}
              </option>
            ))}
          </select>
          {filtrosAtivos && (
            <button className="link-button" onClick={limparFiltros}>
              Limpar filtros
            </button>
          )}
          <div className="table-toolbar-actions">
            {podeExportar && <ExportButton tipo="colaboradores" />}
            {podeImportar && (
              <ImportButton<ColaboradorImportado>
                tipo="colaboradores"
                titulo="Importar colaboradores"
                instrucoes={
                  <>
                    Aba <b>SOBREAVISO</b>, dados a partir da 3ª linha, colunas COLABORADOR / FUNÇÃO / EQUIPE / UF / LOCALIDADE / G.A / G.O.
                  </>
                }
                colunaPrincipal={(dado) => dado.nome ?? ''}
                aoConcluir={() => void carregar()}
              />
            )}
            {podeCriar && (
              <button className="primary" onClick={abrirNovo}>
                <Plus size={18} />
                Novo colaborador
              </button>
            )}
          </div>
        </div>

        {podeEditar && selecionados.length > 0 && (
          <div className="bulk-action-bar">
            <span>{selecionados.length} colaborador(es) selecionado(s)</span>
            <select value={equipeEmLote} onChange={(e) => setEquipeEmLote(e.target.value)}>
              <option value="">Sem equipe</option>
              {referencias.equipes.map((equipe) => (
                <option key={equipe.id} value={equipe.id}>
                  {equipe.nome}
                </option>
              ))}
            </select>
            <button className="primary" disabled={atribuindo} onClick={() => void atribuirEquipeEmLote()}>
              Atribuir equipe
            </button>
            <button onClick={() => setSelecionados([])}>Cancelar</button>
          </div>
        )}

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {podeEditar && (
                  <th className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={colaboradores.length > 0 && selecionados.length === colaboradores.length}
                      onChange={alternarSelecaoTodos}
                      aria-label="Selecionar todos"
                    />
                  </th>
                )}
                <th>Colaborador</th>
                <th>Função</th>
                <th>Equipe</th>
                <th>UF / Localidade</th>
                <th>G.A / G.O</th>
                <th>Situação</th>
                {(podeEditar || podeExcluir) && <th className="col-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((colaborador) => (
                <tr key={colaborador.id} onClick={() => abrirEdicao(colaborador)}>
                  {podeEditar && (
                    <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selecionados.includes(colaborador.id)}
                        onChange={() => alternarSelecao(colaborador.id)}
                        aria-label={`Selecionar ${colaborador.nome}`}
                      />
                    </td>
                  )}
                  <td>
                    <b>{colaborador.nome}</b>
                    {colaborador.matricula && <div><small>{colaborador.matricula}</small></div>}
                  </td>
                  <td>{colaborador.funcao}</td>
                  <td>{colaborador.equipeNome ?? '—'}</td>
                  <td>
                    {colaborador.localidadeNome}, {colaborador.ufSigla}
                  </td>
                  <td>
                    {colaborador.gestorAdministrativoNome ?? colaborador.gaNomeImportado ?? '—'} /{' '}
                    {colaborador.gestorOperacionalNome ?? colaborador.goNomeImportado ?? '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${colaborador.situacaoCadastral}`}>
                      {SITUACAO_CADASTRAL_LABEL[colaborador.situacaoCadastral]}
                    </span>
                  </td>
                  {(podeEditar || podeExcluir) && (
                    <td className="col-acoes">
                      {podeEditar && colaborador.situacaoCadastral !== 'inativo' && (
                        <button onClick={(e) => void desativar(colaborador, e)} title="Desativar">
                          <UserX size={16} />
                        </button>
                      )}
                      {podeExcluir && (
                        <button onClick={(e) => void excluir(colaborador, e)} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && colaboradores.length === 0 && <div className="data-table-empty">Nenhum colaborador encontrado.</div>}
        </div>
      </div>

      {modalAberto && (
        <ColaboradorFormModal
          colaborador={colaboradorEmEdicao}
          uf={referencias.uf}
          localidades={referencias.localidades}
          equipes={referencias.equipes}
          colaboradoresDisponiveis={colaboradores}
          aoFechar={() => setModalAberto(false)}
          aoSalvar={() => {
            setModalAberto(false);
            void carregar();
          }}
        />
      )}
    </>
  );
}
