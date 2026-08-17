import { FileUp, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import type { ResultadoImportacao } from '@shared/import/contract';
import { ApiError, api } from '../lib/api-client';
import { useToast } from '../app/layout/ToastProvider';

type Etapa = 'inativo' | 'carregando' | 'previa' | 'confirmando' | 'concluido';

interface ResumoConfirmacao {
  importados: number;
  atualizados: number;
  ignorados: number;
  comErro: number;
}

const LABEL_ACAO: Record<string, string> = {
  criar: 'Importar',
  atualizar: 'Atualizar',
  ignorar: 'Ignorar (duplicado)',
  erro: 'Erro',
};

interface Props<T> {
  tipo: string;
  titulo: string;
  instrucoes: ReactNode;
  colunaPrincipal: (dado: Partial<T>) => string;
  aoConcluir: () => void;
}

/** Botão + modal de importação de planilha genérico, reaproveitado por qualquer tipo de importação (colaboradores, feriados, ...). */
export function ImportButton<T>({ tipo, titulo, instrucoes, colunaPrincipal, aoConcluir }: Props<T>) {
  const { notificar } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>('inativo');
  const [importId, setImportId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao<T> | null>(null);
  const [resumoFinal, setResumoFinal] = useState<ResumoConfirmacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setEtapa('inativo');
    setImportId(null);
    setResultado(null);
    setResumoFinal(null);
    setErro(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function aoSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setEtapa('carregando');
    setErro(null);

    try {
      const form = new FormData();
      form.append('file', arquivo);
      const resposta = await api.postForm<{ importId: number; resultado: ResultadoImportacao<T> }>(`/importacoes/${tipo}/preview`, form);
      setImportId(resposta.importId);
      setResultado(resposta.resultado);
      setEtapa('previa');
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível ler a planilha.');
      setEtapa('previa');
    }
  }

  async function confirmar() {
    if (!importId) return;
    setEtapa('confirmando');
    try {
      const resposta = await api.post<{ resumo: ResumoConfirmacao; status: string }>(`/importacoes/${tipo}/confirmar`, { importId });
      setResumoFinal(resposta.resumo);
      setEtapa('concluido');
      notificar(
        `${resposta.resumo.importados} importados, ${resposta.resumo.atualizados ?? 0} atualizados, ${resposta.resumo.ignorados} ignorados, ${resposta.resumo.comErro} com erro.`,
        resposta.resumo.comErro > 0 ? 'erro' : 'sucesso',
      );
      aoConcluir();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível concluir a importação.');
      setEtapa('previa');
    }
  }

  const linhasParaExibir = resultado?.linhas.slice(0, 200) ?? [];

  return (
    <>
      <input ref={fileRef} className="file-input" type="file" accept=".xlsx,.xls" onChange={(e) => void aoSelecionarArquivo(e)} />
      <button className="export" onClick={() => fileRef.current?.click()}>
        <FileUp size={18} />
        Importar base
      </button>

      {etapa !== 'inativo' && (
        <div className="overlay">
          <div className="modal modal-wide">
            <button className="modal-x" onClick={fechar} aria-label="Fechar">
              <X />
            </button>
            <span className="modal-icon">
              <FileUp />
            </span>
            <h2>{titulo}</h2>
            <p>{instrucoes}</p>

            {erro && <div className="auth-error">{erro}</div>}

            {etapa === 'carregando' && <p>Lendo planilha…</p>}

            {(etapa === 'previa' || etapa === 'confirmando') && resultado && (
              <>
                <div className="import-summary">
                  <div>
                    <b>{resultado.resumo.importados}</b>
                    <span>A importar</span>
                  </div>
                  <div>
                    <b>{resultado.resumo.atualizados}</b>
                    <span>A atualizar</span>
                  </div>
                  <div>
                    <b>{resultado.resumo.ignorados}</b>
                    <span>Ignorados</span>
                  </div>
                  <div>
                    <b>{resultado.resumo.comErro}</b>
                    <span>Com erro</span>
                  </div>
                </div>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Linha</th>
                        <th>Registro</th>
                        <th>Ação</th>
                        <th>Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasParaExibir.map((linha) => (
                        <tr key={linha.linha}>
                          <td>{linha.linha}</td>
                          <td>{colunaPrincipal(linha.dado) || '—'}</td>
                          <td>{LABEL_ACAO[linha.acao]}</td>
                          <td>{linha.erros.join('; ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {etapa === 'concluido' && resumoFinal && (
              <div className="import-summary">
                <div>
                  <b>{resumoFinal.importados}</b>
                  <span>Importados</span>
                </div>
                <div>
                  <b>{resumoFinal.atualizados}</b>
                  <span>Atualizados</span>
                </div>
                <div>
                  <b>{resumoFinal.ignorados}</b>
                  <span>Ignorados</span>
                </div>
                <div>
                  <b>{resumoFinal.comErro}</b>
                  <span>Com erro</span>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="outline" onClick={fechar}>
                {etapa === 'concluido' ? 'Fechar' : 'Cancelar'}
              </button>
              {etapa === 'previa' && (
                <button className="primary" onClick={() => void confirmar()}>
                  Confirmar importação
                </button>
              )}
              {etapa === 'confirmando' && (
                <button className="primary" disabled>
                  Importando…
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
