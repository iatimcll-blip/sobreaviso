import { useEffect, useState } from 'react';
import type { UfInfo } from '@shared/constants/ufs';
import type { Equipe } from '@shared/types/equipe';
import type { Localidade } from '@shared/types/localidade';
import { api } from './api-client';

export interface ColaboradorResumo {
  id: number;
  nome: string;
  funcao: string;
  situacaoCadastral: string;
}

export function useReferencias() {
  const [uf, setUf] = useState<UfInfo[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ uf: UfInfo[] }>('/referencias/uf').catch(() => ({ uf: [] as UfInfo[] })),
      api.get<{ localidades: Localidade[] }>('/referencias/localidades').catch(() => ({ localidades: [] as Localidade[] })),
      api.get<{ equipes: Equipe[] }>('/referencias/equipes').catch(() => ({ equipes: [] as Equipe[] })),
      api.get<{ colaboradores: ColaboradorResumo[] }>('/referencias/colaboradores').catch(() => ({ colaboradores: [] as ColaboradorResumo[] })),
    ])
      .then(([respUf, respLocalidades, respEquipes, respColaboradores]) => {
        setUf(respUf.uf);
        setLocalidades(respLocalidades.localidades);
        setEquipes(respEquipes.equipes);
        setColaboradores(respColaboradores.colaboradores);
      })
      .finally(() => setCarregando(false));
  }, []);

  return { uf, localidades, equipes, colaboradores, carregando };
}
