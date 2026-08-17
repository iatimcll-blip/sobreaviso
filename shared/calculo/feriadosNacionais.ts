import { datasMoveis } from './pascoa';

export interface FeriadoNacionalGerado {
  data: string;
  nome: string;
  tipo: 'feriado' | 'ponto_facultativo';
}

/** Feriados e pontos facultativos nacionais brasileiros para um ano — datas fixas + móveis (via Páscoa). */
export function gerarFeriadosNacionais(ano: number): FeriadoNacionalGerado[] {
  const moveis = datasMoveis(ano);
  const fixo = (mes: number, dia: number) => `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  return [
    { data: fixo(1, 1), nome: 'Confraternização Universal', tipo: 'feriado' },
    { data: moveis.carnavalSegunda, nome: 'Carnaval (segunda-feira)', tipo: 'ponto_facultativo' },
    { data: moveis.carnavalTerca, nome: 'Carnaval (terça-feira)', tipo: 'ponto_facultativo' },
    { data: moveis.sextaFeiraSanta, nome: 'Sexta-Feira Santa', tipo: 'feriado' },
    { data: fixo(4, 21), nome: 'Tiradentes', tipo: 'feriado' },
    { data: fixo(5, 1), nome: 'Dia do Trabalho', tipo: 'feriado' },
    { data: moveis.corpusChristi, nome: 'Corpus Christi', tipo: 'ponto_facultativo' },
    { data: fixo(9, 7), nome: 'Independência do Brasil', tipo: 'feriado' },
    { data: fixo(10, 12), nome: 'Nossa Senhora Aparecida', tipo: 'feriado' },
    { data: fixo(11, 2), nome: 'Finados', tipo: 'feriado' },
    { data: fixo(11, 15), nome: 'Proclamação da República', tipo: 'feriado' },
    { data: fixo(11, 20), nome: 'Dia Nacional de Zumbi e da Consciência Negra', tipo: 'feriado' },
    { data: fixo(12, 25), nome: 'Natal', tipo: 'feriado' },
  ];
}
