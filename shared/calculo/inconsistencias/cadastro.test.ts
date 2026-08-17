import { describe, expect, it } from 'vitest';
import { detectarCadastroIncompleto, detectarDuplaIncompleta } from './cadastro';

describe('detectarCadastroIncompleto', () => {
  it('sinaliza quando falta equipe, localidade ou gestor', () => {
    const resultado = detectarCadastroIncompleto(
      { id: 1, equipeId: null, localidadeId: 5, ufSigla: 'CE', gestorAdministrativoId: null, gestorOperacionalId: null },
      '2026-08-15',
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].descricao).toContain('equipe');
    expect(resultado[0].descricao).toContain('gestor');
  });

  it('não sinaliza cadastro completo', () => {
    const resultado = detectarCadastroIncompleto(
      { id: 1, equipeId: 3, localidadeId: 5, ufSigla: 'CE', gestorAdministrativoId: 9, gestorOperacionalId: null },
      '2026-08-15',
    );
    expect(resultado).toHaveLength(0);
  });
});

describe('detectarDuplaIncompleta', () => {
  it('sinaliza dupla sem segundo colaborador', () => {
    const resultado = detectarDuplaIncompleta(
      { id: 1, equipeId: 10, ativo: true, colaborador1Id: 1, colaborador2Id: null, colaborador1EquipeId: 10, colaborador2EquipeId: null },
      '2026-08-15',
    );
    expect(resultado).toHaveLength(1);
  });

  it('sinaliza dupla com colaboradores em equipes diferentes', () => {
    const resultado = detectarDuplaIncompleta(
      { id: 1, equipeId: 10, ativo: true, colaborador1Id: 1, colaborador2Id: 2, colaborador1EquipeId: 10, colaborador2EquipeId: 20 },
      '2026-08-15',
    );
    expect(resultado).toHaveLength(1);
  });

  it('não sinaliza dupla completa e consistente', () => {
    const resultado = detectarDuplaIncompleta(
      { id: 1, equipeId: 10, ativo: true, colaborador1Id: 1, colaborador2Id: 2, colaborador1EquipeId: 10, colaborador2EquipeId: 10 },
      '2026-08-15',
    );
    expect(resultado).toHaveLength(0);
  });

  it('ignora duplas inativas', () => {
    const resultado = detectarDuplaIncompleta(
      { id: 1, equipeId: 10, ativo: false, colaborador1Id: 1, colaborador2Id: null, colaborador1EquipeId: 10, colaborador2EquipeId: null },
      '2026-08-15',
    );
    expect(resultado).toHaveLength(0);
  });
});
