import { z } from 'zod';
import { TIPOS_ESCALA, TURNOS_ESCALA } from '../types/escala';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const escalaTurnoSchema = z.object({
  cicloDia: z.number().int().min(0),
  horaEntrada: z.string().regex(HORA_REGEX).nullable(),
  horaSaida: z.string().regex(HORA_REGEX).nullable(),
  intervaloInicio: z.string().regex(HORA_REGEX).nullable(),
  intervaloFim: z.string().regex(HORA_REGEX).nullable(),
  folga: z.boolean(),
});

export const escalaModeloEntradaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da escala.').max(150),
  tipo: z.enum(TIPOS_ESCALA),
  turno: z.enum(TURNOS_ESCALA),
  duracaoIntervaloMinutos: z.number().int().min(0).max(240),
  dataInicioVigencia: z.string().regex(DATA_REGEX, 'Data inválida.'),
  dataFimVigencia: z.string().regex(DATA_REGEX).nullish(),
  possuiAcordoColetivo: z.boolean().default(false),
  ativo: z.boolean().default(true),
  observacoes: z.string().trim().max(500).nullish(),
  turnos: z.array(escalaTurnoSchema).min(1, 'Configure ao menos um dia no padrão de turnos.'),
});

export const escalaVinculoEntradaSchema = z
  .object({
    colaboradorId: z.number().int().positive().nullish(),
    equipeId: z.number().int().positive().nullish(),
    localidadeId: z.number().int().positive().nullish(),
    dataInicio: z.string().regex(DATA_REGEX, 'Data inválida.'),
    dataFim: z.string().regex(DATA_REGEX).nullish(),
  })
  .refine((dado) => dado.colaboradorId || dado.equipeId || dado.localidadeId, {
    message: 'Selecione ao menos um colaborador, equipe ou localidade.',
  });

export const duplicarEscalaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da nova escala.').max(150),
});
