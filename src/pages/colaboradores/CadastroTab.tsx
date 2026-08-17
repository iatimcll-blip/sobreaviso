import { Plus, Trash2, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SITUACAO_CADASTRAL_LABEL, type ColaboradorDetalhado } from '@shared/types/colaborador';
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
  const [modalAberto, setModalAberto] = useState(false);
  const [colaboradorEmEdicao, setColaboradorEmEdicao] = useState<ColaboradorDetalhado | null>(null);

  const podeCriar = temPermissao(usuario, permissoes, 'colaboradores', 'criar');
  const podeEditar = temPermissao(usuario, permissoes, 'colaboradores', 'editar');
  const podeExcluir = temPermissao(usuario, permissoes, 'colaboradores', 'excluir');
  const podeImportar = temPermissao(usuario, permissoes, 'colaboradores', 'importar');
  const podeExportar = temPermissao(usuario, permissoes, 'colaboradores', 'exportar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const query = busca ? `?busca=${encodeURIComponent(busca)}` : '';
      const resposta = await api.get<{ colaboradores: ColaboradorDetalhado[] }>(`/colaboradores${query}`);
      setColaboradores(resposta.colaboradores);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar os colaboradores.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [busca, notificar]);

  useEffect(() => {
    const debounce = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(debounce);
  }, [carregar]);

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

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
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
