import { useEffect, useState } from 'react';
import type { ConfiguracoesClt } from '@shared/constants/clt';
import { useToast } from '../../app/layout/ToastProvider';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';

function Campo({
  label,
  valor,
  onChange,
  sufixo,
  step = 1,
}: {
  label: string;
  valor: number;
  onChange: (v: number) => void;
  sufixo?: string;
  step?: number;
}) {
  return (
    <label className="field">
      {label} {sufixo && <small>({sufixo})</small>}
      <input type="number" step={step} value={valor} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function ParametrosCltTab() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const podeEditar = temPermissao(usuario, permissoes, 'configuracoes', 'editar');

  const [config, setConfig] = useState<ConfiguracoesClt | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get<{ configuracoes: ConfiguracoesClt }>('/calculos/configuracoes-clt')
      .then((r) => setConfig(r.configuracoes))
      .catch((erro) => notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar os parâmetros.', 'erro'));
  }, [notificar]);

  async function salvar() {
    if (!config) return;
    setSalvando(true);
    try {
      await api.put('/calculos/configuracoes-clt', config);
      notificar('Parâmetros CLT atualizados.', 'sucesso');
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível salvar os parâmetros.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  if (!config) return null;

  return (
    <div className="card card-padded">
      <div className="table-toolbar">
        <p>Parâmetros configuráveis do motor de cálculo de conformidade CLT. Os valores padrão seguem a legislação vigente.</p>
        {podeEditar && (
          <div className="table-toolbar-actions">
            <button className="primary" onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar parâmetros'}
            </button>
          </div>
        )}
      </div>

      <fieldset disabled={!podeEditar} className="fieldset-plano">
        <h2>Interjornada e jornada diária</h2>
        <div className="field-grid-2">
          <Campo label="Interjornada mínima" sufixo="horas" valor={config.interjornadaMinimaHoras} onChange={(v) => setConfig({ ...config, interjornadaMinimaHoras: v })} />
          <Campo label="Jornada máxima diária" sufixo="horas" valor={config.jornadaMaximaDiariaHoras} onChange={(v) => setConfig({ ...config, jornadaMaximaDiariaHoras: v })} />
        </div>

        <h2>Intrajornada (intervalo dentro da jornada)</h2>
        <div className="field-grid-2">
          <Campo label="Jornada considerada longa a partir de" sufixo="horas" valor={config.intrajornadaJornadaLongaHoras} onChange={(v) => setConfig({ ...config, intrajornadaJornadaLongaHoras: v })} />
          <Campo label="Intervalo mínimo (jornada longa)" sufixo="minutos" valor={config.intrajornadaMinimaLongaMinutos} onChange={(v) => setConfig({ ...config, intrajornadaMinimaLongaMinutos: v })} />
          <Campo label="Intervalo mínimo com acordo coletivo" sufixo="minutos" valor={config.intrajornadaMinimaLongaComAcordoMinutos} onChange={(v) => setConfig({ ...config, intrajornadaMinimaLongaComAcordoMinutos: v })} />
          <Campo label="Jornada considerada média a partir de" sufixo="horas" valor={config.intrajornadaJornadaMediaHoras} onChange={(v) => setConfig({ ...config, intrajornadaJornadaMediaHoras: v })} />
          <Campo label="Intervalo mínimo (jornada média)" sufixo="minutos" valor={config.intrajornadaMinimaMediaMinutos} onChange={(v) => setConfig({ ...config, intrajornadaMinimaMediaMinutos: v })} />
        </div>

        <h2>Hora noturna</h2>
        <div className="field-grid-2">
          <label className="field">
            Início da janela noturna
            <input type="time" value={config.horaNoturnaInicio} onChange={(e) => setConfig({ ...config, horaNoturnaInicio: e.target.value })} />
          </label>
          <label className="field">
            Fim da janela noturna
            <input type="time" value={config.horaNoturnaFim} onChange={(e) => setConfig({ ...config, horaNoturnaFim: e.target.value })} />
          </label>
          <Campo label="Fator de redução (hora noturna reduzida)" sufixo="minutos = 1h" step={0.5} valor={config.horaNoturnaFatorReducao} onChange={(v) => setConfig({ ...config, horaNoturnaFatorReducao: v })} />
          <Campo label="Adicional noturno" sufixo="%" valor={config.horaNoturnaAdicionalPct} onChange={(v) => setConfig({ ...config, horaNoturnaAdicionalPct: v })} />
        </div>

        <h2>Sobreaviso, descanso e horas extras</h2>
        <div className="field-grid-2">
          <Campo label="Fator de sobreaviso" sufixo="ex.: 0,333 = 1/3" step={0.01} valor={config.sobreavisoFator} onChange={(v) => setConfig({ ...config, sobreavisoFator: v })} />
          <Campo label="Descanso semanal mínimo" sufixo="horas" valor={config.descansoSemanalHoras} onChange={(v) => setConfig({ ...config, descansoSemanalHoras: v })} />
          <Campo label="Descanso mínimo entre turnos 12x36" sufixo="horas" valor={config.descanso12x36Horas} onChange={(v) => setConfig({ ...config, descanso12x36Horas: v })} />
          <Campo label="Teto de horas extras por dia" sufixo="horas" valor={config.tetoHorasExtrasDia} onChange={(v) => setConfig({ ...config, tetoHorasExtrasDia: v })} />
        </div>
      </fieldset>
    </div>
  );
}
