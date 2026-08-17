import { describe, expect, it } from 'vitest';
import { dataPascoaISO, datasMoveis } from './pascoa';

describe('dataPascoaISO', () => {
  it('calcula corretamente datas de Páscoa conhecidas', () => {
    expect(dataPascoaISO(2024)).toBe('2024-03-31');
    expect(dataPascoaISO(2025)).toBe('2025-04-20');
    expect(dataPascoaISO(2026)).toBe('2026-04-05');
    expect(dataPascoaISO(2027)).toBe('2027-03-28');
  });
});

describe('datasMoveis', () => {
  it('deriva Corpus Christi, Sexta-Feira Santa e Carnaval a partir da Páscoa de 2026', () => {
    const datas = datasMoveis(2026);
    expect(datas.pascoa).toBe('2026-04-05');
    expect(datas.sextaFeiraSanta).toBe('2026-04-03');
    expect(datas.corpusChristi).toBe('2026-06-04');
    expect(datas.carnavalTerca).toBe('2026-02-17');
    expect(datas.carnavalSegunda).toBe('2026-02-16');
  });
});
