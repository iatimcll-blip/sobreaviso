import type { ConfiguracoesClt } from '../../../shared/constants/clt';
import { execute, queryOne } from '../client';

interface ConfiguracoesCltRow {
  interjornada_minima_horas: number;
  jornada_maxima_diaria_horas: number;
  intrajornada_jornada_longa_horas: number;
  intrajornada_minima_longa_minutos: number;
  intrajornada_minima_longa_com_acordo_minutos: number;
  intrajornada_jornada_media_horas: number;
  intrajornada_minima_media_minutos: number;
  hora_noturna_inicio: string;
  hora_noturna_fim: string;
  hora_noturna_fator_reducao: number;
  hora_noturna_adicional_pct: number;
  sobreaviso_fator: number;
  descanso_semanal_horas: number;
  descanso_12x36_horas: number;
  teto_horas_extras_dia: number;
}

function map(row: ConfiguracoesCltRow): ConfiguracoesClt {
  return {
    interjornadaMinimaHoras: row.interjornada_minima_horas,
    jornadaMaximaDiariaHoras: row.jornada_maxima_diaria_horas,
    intrajornadaJornadaLongaHoras: row.intrajornada_jornada_longa_horas,
    intrajornadaMinimaLongaMinutos: row.intrajornada_minima_longa_minutos,
    intrajornadaMinimaLongaComAcordoMinutos: row.intrajornada_minima_longa_com_acordo_minutos,
    intrajornadaJornadaMediaHoras: row.intrajornada_jornada_media_horas,
    intrajornadaMinimaMediaMinutos: row.intrajornada_minima_media_minutos,
    horaNoturnaInicio: row.hora_noturna_inicio,
    horaNoturnaFim: row.hora_noturna_fim,
    horaNoturnaFatorReducao: row.hora_noturna_fator_reducao,
    horaNoturnaAdicionalPct: row.hora_noturna_adicional_pct,
    sobreavisoFator: row.sobreaviso_fator,
    descansoSemanalHoras: row.descanso_semanal_horas,
    descanso12x36Horas: row.descanso_12x36_horas,
    tetoHorasExtrasDia: row.teto_horas_extras_dia,
  };
}

export async function buscarConfiguracoesClt(db: D1Database): Promise<ConfiguracoesClt> {
  const row = await queryOne<ConfiguracoesCltRow>(db, 'SELECT * FROM configuracoes_clt WHERE id = 1');
  if (!row) throw new Error('Configurações CLT não inicializadas.');
  return map(row);
}

export async function atualizarConfiguracoesClt(db: D1Database, dado: ConfiguracoesClt): Promise<void> {
  await execute(
    db,
    `UPDATE configuracoes_clt SET
      interjornada_minima_horas = ?, jornada_maxima_diaria_horas = ?,
      intrajornada_jornada_longa_horas = ?, intrajornada_minima_longa_minutos = ?, intrajornada_minima_longa_com_acordo_minutos = ?,
      intrajornada_jornada_media_horas = ?, intrajornada_minima_media_minutos = ?,
      hora_noturna_inicio = ?, hora_noturna_fim = ?, hora_noturna_fator_reducao = ?, hora_noturna_adicional_pct = ?,
      sobreaviso_fator = ?, descanso_semanal_horas = ?, descanso_12x36_horas = ?, teto_horas_extras_dia = ?,
      atualizado_em = datetime('now')
    WHERE id = 1`,
    [
      dado.interjornadaMinimaHoras,
      dado.jornadaMaximaDiariaHoras,
      dado.intrajornadaJornadaLongaHoras,
      dado.intrajornadaMinimaLongaMinutos,
      dado.intrajornadaMinimaLongaComAcordoMinutos,
      dado.intrajornadaJornadaMediaHoras,
      dado.intrajornadaMinimaMediaMinutos,
      dado.horaNoturnaInicio,
      dado.horaNoturnaFim,
      dado.horaNoturnaFatorReducao,
      dado.horaNoturnaAdicionalPct,
      dado.sobreavisoFator,
      dado.descansoSemanalHoras,
      dado.descanso12x36Horas,
      dado.tetoHorasExtrasDia,
    ],
  );
}
