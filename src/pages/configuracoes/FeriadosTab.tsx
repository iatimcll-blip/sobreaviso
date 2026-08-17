import { CalendarPlus, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { FeriadoImportado } from '@shared/import/feriadosDefinicao';
import { TIPO_FERIADO_LABEL, type FeriadoDetalhado } from '@shared/types/feriado';
import { ImportButton } from '../../components/ImportButton';
import { useToast } from '../../app/layout/ToastProvider';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { FeriadoFormModal } from './FeriadoFormModal';

const ANO_ATUAL = new Date().getFullYear();

export function FeriadosTab() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [feriados, setFeriados] = useState<FeriadoDetalhado[]>([]);
  const [ano, setAno] = useState(ANO_ATUAL);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  const podeCriar = temPermissao(usuario, permissoes, 'feriados', 'criar');
  const podeExcluir = temPermissao(usuario, permissoes, 'feriados', 'excluir');
  const podeImportar = temPermissao(usuario, permissoes, 'feriados', 'importar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.get<{ feriados: FeriadoDetalhado[] }>(`/feriados?ano=${ano}`);
      setFeriados(resposta.feriados);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar os feriados.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [ano, notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerarNacionais() {
    try {
      const resposta = await api.post<{ resumo: { inseridos: number; jaExistentes: number } }>('/feriados/gerar-nacionais', { ano });
      notificar(`${resposta.resumo.inseridos} feriados nacionais gerados (${resposta.resumo.jaExistentes} já existiam).`, 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível gerar os feriados nacionais.', 'erro');
    }
  }

  async function excluir(feriado: FeriadoDetalhado) {
    if (!confirm(`Excluir o feriado "${feriado.nome}"?`)) return;
    try {
      await api.delete(`/feriados/${feriado.id}`);
      notificar('Feriado excluído.', 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível excluir o feriado.', 'erro');
    }
  }

  return (
    <>
      <div className="card card-padded">
        <div className="table-toolbar">
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1, ANO_ATUAL + 2].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <div className="table-toolbar-actions">
            {podeCriar && (
              <button className="outline" onClick={() => void gerarNacionais()}>
                <CalendarPlus size={16} />
                Gerar feriados nacionais de {ano}
              </button>
            )}
            {podeImportar && (
              <ImportButton<FeriadoImportado>
                tipo="feriados"
                titulo="Importar feriados estaduais/municipais"
                instrucoes={
                  <>
                    Aba <b>FERIADOS</b>, dados a partir da 2ª linha, colunas DATA / NOME / ABRANGENCIA / UF / LOCALIDADE / TIPO.
                  </>
                }
                colunaPrincipal={(dado) => dado.nome ?? ''}
                aoConcluir={() => void carregar()}
              />
            )}
            {podeCriar && (
              <button className="primary" onClick={() => setModalAberto(true)}>
                <Plus size={18} />
                Novo feriado
              </button>
            )}
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>Abrangência</th>
                <th>Tipo</th>
                {podeExcluir && <th className="col-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {feriados.map((feriado) => (
                <tr key={feriado.id}>
                  <td>{feriado.data}</td>
                  <td>{feriado.nome}</td>
                  <td>
                    {feriado.abrangencia === 'nacional' && 'Nacional'}
                    {feriado.abrangencia === 'estadual' && `Estadual (${feriado.ufSigla})`}
                    {feriado.abrangencia === 'municipal' && `Municipal (${feriado.localidadeNome ?? feriado.ufSigla})`}
                  </td>
                  <td>{TIPO_FERIADO_LABEL[feriado.tipo]}</td>
                  {podeExcluir && (
                    <td className="col-acoes">
                      <button onClick={() => void excluir(feriado)} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && feriados.length === 0 && <div className="data-table-empty">Nenhum feriado cadastrado para {ano}.</div>}
        </div>
      </div>

      {modalAberto && (
        <FeriadoFormModal
          uf={referencias.uf}
          localidades={referencias.localidades}
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
