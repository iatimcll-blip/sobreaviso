import { useEffect, useState } from 'react';
import { CONFIGURACOES_CLT_PADRAO } from '@shared/constants/clt';
import type { EscalaModelo, EscalaModeloDetalhado, EscalaTurno } from '@shared/types/escala';
import { api } from '../lib/api-client';

interface Props {
  localidadeId: number | null;
  localidadeNome?: string | null;
}

type Categoria = 'simples' | 'dupla' | 'noturno';

const CATEGORIA_INFO: Record<Categoria, { cor: string; rotulo: string }> = {
  noturno: { cor: 'var(--green)', rotulo: 'Plantão noturno' },
  dupla: { cor: 'var(--amber)', rotulo: 'Dupla cobertura (pico)' },
  simples: { cor: 'var(--blue)', rotulo: 'Cobertura simples' },
};
const COR_GAP = 'var(--red)';
const ROTULO_GAP = 'Sem cobertura';

const RAIO = 68;
const CENTRO = 84;
const ESPESSURA = 20;
const FATIAS = 48; // resolução de 30 em 30 minutos

interface Faixa { inicio: number; fim: number }

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function paraHHMM(minutoAbsoluto: number): string {
  const m = ((minutoAbsoluto % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function turnosParaFaixas(turnos: EscalaTurno[]): Faixa[] {
  const faixas: Faixa[] = [];
  for (const turno of turnos) {
    if (turno.folga || !turno.horaEntrada || !turno.horaSaida) continue;
    const inicio = paraMinutos(turno.horaEntrada);
    let fim = paraMinutos(turno.horaSaida);
    if (fim <= inicio) fim += 1440;

    if (turno.intervaloInicio && turno.intervaloFim) {
      let intIni = paraMinutos(turno.intervaloInicio);
      let intFim = paraMinutos(turno.intervaloFim);
      if (intIni < inicio) intIni += 1440;
      if (intFim <= intIni) intFim += 1440;
      if (intIni > inicio) faixas.push({ inicio, fim: intIni });
      if (fim > intFim) faixas.push({ inicio: intFim, fim });
    } else {
      faixas.push({ inicio, fim });
    }
  }
  return faixas;
}

function cobreFatia(faixa: Faixa, minutoFatia: number): boolean {
  return (
    (minutoFatia >= faixa.inicio && minutoFatia < faixa.fim) ||
    (minutoFatia + 1440 >= faixa.inicio && minutoFatia + 1440 < faixa.fim)
  );
}

function estaNaJanelaNoturna(minutoFatia: number, inicioNoturno: number, fimNoturno: number): boolean {
  if (inicioNoturno <= fimNoturno) return minutoFatia >= inicioNoturno && minutoFatia < fimNoturno;
  return minutoFatia >= inicioNoturno || minutoFatia < fimNoturno;
}

function polarParaCartesiano(anguloGraus: number): { x: number; y: number } {
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return { x: CENTRO + RAIO * Math.cos(rad), y: CENTRO + RAIO * Math.sin(rad) };
}

function descreverArco(anguloInicio: number, anguloFim: number): string {
  const inicio = polarParaCartesiano(anguloInicio);
  const fim = polarParaCartesiano(anguloFim === 360 ? 359.99 : anguloFim);
  const arcoGrande = anguloFim - anguloInicio <= 180 ? '0' : '1';
  return `M ${inicio.x} ${inicio.y} A ${RAIO} ${RAIO} 0 ${arcoGrande} 1 ${fim.x} ${fim.y}`;
}

function agruparFaixasContiguas(minutos: number[]): Faixa[] {
  if (minutos.length === 0) return [];
  const ordenados = [...minutos].sort((a, b) => a - b);
  const grupos: Faixa[] = [{ inicio: ordenados[0], fim: ordenados[0] + 30 }];
  for (const m of ordenados.slice(1)) {
    const ultimo = grupos[grupos.length - 1];
    if (m === ultimo.fim) ultimo.fim = m + 30;
    else grupos.push({ inicio: m, fim: m + 30 });
  }
  return grupos;
}

export function AnelCobertura24h({ localidadeId, localidadeNome }: Props) {
  const [categoriasPorFatia, setCategoriasPorFatia] = useState<(Categoria | null)[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!localidadeId) {
      setCategoriasPorFatia(null);
      setCarregando(false);
      return;
    }

    let cancelado = false;
    setCarregando(true);

    async function carregar() {
      const [respEscalas, respClt] = await Promise.all([
        api.get<{ escalas: (EscalaModelo & { totalVinculos: number })[] }>('/escalas').catch(() => ({ escalas: [] })),
        api.get<{ configuracoes: typeof CONFIGURACOES_CLT_PADRAO }>('/calculos/configuracoes-clt').catch(() => ({
          configuracoes: CONFIGURACOES_CLT_PADRAO,
        })),
      ]);

      const ativas = respEscalas.escalas.filter((e) => e.ativo && e.totalVinculos > 0);

      // Sequencial de propósito: cada aba/componente aberto ao mesmo tempo já soma bastante
      // requisição simultânea contra o banco; buscar os detalhes um de cada vez evita empilhar
      // ainda mais conexões concorrentes por causa de um widget do dashboard.
      const faixasSimples: Faixa[] = [];
      for (const escalaResumo of ativas) {
        if (cancelado) return;
        const detalhe = await api
          .get<{ escala: EscalaModeloDetalhado; vinculos: { localidadeId: number | null }[] }>(`/escalas/${escalaResumo.id}`)
          .catch(() => null);
        if (!detalhe) continue;
        const vinculadaAQuiLocalidade = detalhe.vinculos.some((v) => v.localidadeId === localidadeId);
        if (!vinculadaAQuiLocalidade) continue;
        faixasSimples.push(...turnosParaFaixas(detalhe.escala.turnos));
      }

      const inicioNoturno = paraMinutos(respClt.configuracoes.horaNoturnaInicio);
      const fimNoturno = paraMinutos(respClt.configuracoes.horaNoturnaFim);

      const categorias: (Categoria | null)[] = [];
      for (let i = 0; i < FATIAS; i += 1) {
        const minutoFatia = i * (1440 / FATIAS);
        const cobrindas = faixasSimples.filter((f) => cobreFatia(f, minutoFatia)).length;
        if (cobrindas === 0) {
          categorias.push(null);
        } else if (estaNaJanelaNoturna(minutoFatia, inicioNoturno, fimNoturno)) {
          categorias.push('noturno');
        } else if (cobrindas >= 2) {
          categorias.push('dupla');
        } else {
          categorias.push('simples');
        }
      }

      if (!cancelado) {
        setCategoriasPorFatia(categorias);
        setCarregando(false);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [localidadeId]);

  if (!localidadeId) return null;

  const passoMin = 1440 / FATIAS;

  const arcos: { d: string; cor: string }[] = [];
  if (categoriasPorFatia) {
    let i = 0;
    while (i < FATIAS) {
      const atual = categoriasPorFatia[i];
      let j = i;
      while (j < FATIAS && categoriasPorFatia[j] === atual) j += 1;
      const anguloInicio = (i / FATIAS) * 360;
      const anguloFim = (j / FATIAS) * 360;
      arcos.push({ d: descreverArco(anguloInicio, anguloFim), cor: atual ? CATEGORIA_INFO[atual].cor : COR_GAP });
      i = j;
    }
  }

  const legenda = (['noturno', 'dupla', 'simples'] as Categoria[]).map((categoria) => {
    const minutos: number[] = [];
    categoriasPorFatia?.forEach((c, idx) => {
      if (c === categoria) minutos.push(idx * passoMin);
    });
    const faixas = agruparFaixasContiguas(minutos);
    return { categoria, faixas };
  });
  const temGap = categoriasPorFatia?.some((c) => c === null) ?? false;

  return (
    <div className="card anel-cobertura">
      <div className="anel-cobertura-svg-wrap">
        <svg width={CENTRO * 2} height={CENTRO * 2} viewBox={`0 0 ${CENTRO * 2} ${CENTRO * 2}`}>
          <circle cx={CENTRO} cy={CENTRO} r={RAIO} fill="none" stroke="var(--border)" strokeWidth={ESPESSURA} />
          {arcos.map((arco, idx) => (
            <path key={idx} d={arco.d} fill="none" stroke={arco.cor} strokeWidth={ESPESSURA} strokeLinecap="butt" />
          ))}
        </svg>
        <div className="anel-cobertura-centro">
          <b>24h</b>
          <span>ciclo ativo</span>
        </div>
      </div>
      <div className="anel-cobertura-legenda">
        {carregando && <p className="anel-cobertura-vazio">Carregando turnos de {localidadeNome ?? 'localidade'}…</p>}
        {!carregando && !categoriasPorFatia?.some(Boolean) && (
          <p className="anel-cobertura-vazio">Nenhuma escala com horários cadastrados para {localidadeNome ?? 'esta localidade'} ainda.</p>
        )}
        {!carregando &&
          legenda
            .filter((l) => l.faixas.length > 0)
            .map((l) => (
              <div className="anel-cobertura-item" key={l.categoria}>
                <span className="anel-cobertura-dot" style={{ background: CATEGORIA_INFO[l.categoria].cor }} />
                <div>
                  <b>{CATEGORIA_INFO[l.categoria].rotulo}</b>
                  <small>{l.faixas.map((f) => `${paraHHMM(f.inicio)}–${paraHHMM(f.fim)}`).join(', ')}</small>
                </div>
              </div>
            ))}
        {!carregando && temGap && (
          <div className="anel-cobertura-item">
            <span className="anel-cobertura-dot" style={{ background: COR_GAP }} />
            <div>
              <b>{ROTULO_GAP}</b>
              <small>Horários sem turno vinculado a esta localidade</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
