import { Ban, Check, Paperclip, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { STATUS_AFASTAMENTO_LABEL, TIPO_AFASTAMENTO_LABEL, type AfastamentoDetalhado } from '@shared/types/afastamento';
import { useToast } from '../../app/layout/ToastProvider';
import { ExportButton } from '../../components/ExportButton';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { AfastamentoFormModal } from './AfastamentoFormModal';

export function AfastamentosTab() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [afastamentos, setAfastamentos] = useState<AfastamentoDetalhado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const anexoInputRef = useRef<HTMLInputElement>(null);
  const [afastamentoParaAnexo, setAfastamentoParaAnexo] = useState<number | null>(null);

  const podeCriar = temPermissao(usuario, permissoes, 'afastamentos', 'criar');
  const podeEditar = temPermissao(usuario, permissoes, 'afastamentos', 'editar');
  const podeExportar = temPermissao(usuario, permissoes, 'afastamentos', 'exportar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.get<{ afastamentos: AfastamentoDetalhado[] }>('/afastamentos');
      setAfastamentos(resposta.afastamentos);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar os afastamentos.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function definirStatus(id: number, status: 'aprovado' | 'rejeitado') {
    try {
      await api.patch(`/afastamentos/${id}/status`, { status });
      notificar(`Afastamento ${status === 'aprovado' ? 'aprovado' : 'rejeitado'}.`, 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível atualizar o status.', 'erro');
    }
  }

  function abrirSeletorAnexo(id: number) {
    setAfastamentoParaAnexo(id);
    anexoInputRef.current?.click();
  }

  async function aoSelecionarAnexo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo || !afastamentoParaAnexo) return;
    try {
      const form = new FormData();
      form.append('file', arquivo);
      await api.postForm(`/afastamentos/${afastamentoParaAnexo}/documento`, form);
      notificar('Documento anexado.', 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível anexar o documento.', 'erro');
    }
  }

  return (
    <>
      <input ref={anexoInputRef} className="file-input" type="file" onChange={(e) => void aoSelecionarAnexo(e)} />

      <div className="card card-padded">
        <div className="table-toolbar">
          <p>Férias, atestados, faltas, licenças e demais ocorrências.</p>
          {(podeExportar || podeCriar) && (
            <div className="table-toolbar-actions">
              {podeExportar && <ExportButton tipo="afastamentos" />}
              {podeCriar && (
                <button className="primary" onClick={() => setModalAberto(true)}>
                  <Plus size={18} />
                  Novo afastamento
                </button>
              )}
            </div>
          )}
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Anexo</th>
                <th>Status</th>
                {podeEditar && <th className="col-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {afastamentos.map((afastamento) => (
                <tr key={afastamento.id}>
                  <td>{afastamento.colaboradorNome}</td>
                  <td>{TIPO_AFASTAMENTO_LABEL[afastamento.tipo]}</td>
                  <td>{afastamento.dataInicio}</td>
                  <td>{afastamento.dataFim}</td>
                  <td>
                    {podeEditar ? (
                      <button onClick={() => abrirSeletorAnexo(afastamento.id)} title={afastamento.documentoNomeArquivo ?? 'Anexar documento'}>
                        <Paperclip size={16} />
                        {afastamento.documentoNomeArquivo && <small> anexado</small>}
                      </button>
                    ) : (
                      afastamento.documentoNomeArquivo ?? '—'
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${afastamento.status === 'aprovado' ? 'ativo' : afastamento.status === 'rejeitado' ? 'desligado' : 'afastado'}`}>
                      {STATUS_AFASTAMENTO_LABEL[afastamento.status]}
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="col-acoes">
                      {afastamento.status === 'pendente' && (
                        <>
                          <button onClick={() => void definirStatus(afastamento.id, 'aprovado')} title="Aprovar">
                            <Check size={16} />
                          </button>
                          <button onClick={() => void definirStatus(afastamento.id, 'rejeitado')} title="Rejeitar">
                            <Ban size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && afastamentos.length === 0 && <div className="data-table-empty">Nenhum afastamento lançado.</div>}
        </div>
      </div>

      {modalAberto && (
        <AfastamentoFormModal
          colaboradores={referencias.colaboradores}
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
