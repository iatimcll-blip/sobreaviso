import { UserCog, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { permissaoVazia, TELAS, type PermissaoTela, type Tela } from '@shared/types/permissao';
import type { PapelUsuario, UsuarioComPermissoes } from '@shared/types/usuario';
import { ApiError, api } from '../../lib/api-client';
import { useToast } from '../../app/layout/ToastProvider';

const TELAS_CONFIGURAVEIS: Tela[] = TELAS.filter((tela) => tela !== 'usuarios');

const LABEL_TELA: Record<Tela, string> = {
  dashboard: 'Visão geral',
  escalas: 'Escalas',
  sobreaviso: 'Sobreaviso',
  colaboradores: 'Colaboradores',
  inconsistencias: 'Inconsistências',
  configuracoes: 'Configurações',
  equipes: 'Equipes',
  duplas: 'Duplas',
  afastamentos: 'Afastamentos',
  localidades: 'Localidades/UF',
  feriados: 'Feriados',
  usuarios: 'Usuários e permissões',
};

interface Props {
  usuario: UsuarioComPermissoes | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function UsuarioFormModal({ usuario, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<PapelUsuario>('usuario');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [permissoes, setPermissoes] = useState<PermissaoTela[]>(TELAS_CONFIGURAVEIS.map(permissaoVazia));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (usuario) {
      setUsername(usuario.username);
      setPassword('');
      setRole(usuario.role);
      setNomeCompleto(usuario.nomeCompleto);
      setAtivo(usuario.ativo);
      setPermissoes(
        TELAS_CONFIGURAVEIS.map((tela) => usuario.permissoes.find((p) => p.tela === tela) ?? permissaoVazia(tela)),
      );
    } else {
      setUsername('');
      setPassword('');
      setRole('usuario');
      setNomeCompleto('');
      setAtivo(true);
      setPermissoes(TELAS_CONFIGURAVEIS.map(permissaoVazia));
    }
    setErro(null);
  }, [usuario]);

  function alternar(tela: Tela, campo: keyof Omit<PermissaoTela, 'tela'>) {
    setPermissoes((atual) => atual.map((p) => (p.tela === tela ? { ...p, [campo]: !p[campo] } : p)));
  }

  async function aoSubmeter() {
    setErro(null);
    if (!username.trim() || !nomeCompleto.trim()) {
      setErro('Preencha usuário e nome completo.');
      return;
    }
    if (!usuario && password.length < 8) {
      setErro('A senha deve ter ao menos 8 caracteres.');
      return;
    }

    setSalvando(true);
    try {
      const payload = { username, role, nomeCompleto, colaboradorId: null, ativo, permissoes };
      if (usuario) {
        await api.put(`/usuarios/${usuario.id}`, payload);
        notificar('Usuário atualizado.', 'sucesso');
      } else {
        await api.post('/usuarios', { ...payload, password });
        notificar('Usuário criado.', 'sucesso');
      }
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar o usuário.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal modal-wide">
        <button className="modal-x" onClick={aoFechar} aria-label="Fechar">
          <X />
        </button>
        <span className="modal-icon">
          <UserCog />
        </span>
        <h2>{usuario ? 'Editar usuário' : 'Novo usuário'}</h2>
        <p>Defina o acesso e as permissões por tela.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <div className="field-grid-2">
          <label className="field">
            Usuário
            <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!usuario} />
          </label>
          <label className="field">
            Nome completo
            <input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
          </label>
        </div>

        {!usuario && (
          <label className="field">
            Senha inicial
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}

        <div className="field-grid-2">
          <label className="field">
            Papel
            <select value={role} onChange={(e) => setRole(e.target.value as PapelUsuario)}>
              <option value="usuario">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label className="field checkbox-field">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Usuário ativo
          </label>
        </div>

        {role === 'usuario' && (
          <div className="field">
            Permissões por tela
            <div className="data-table-wrap">
              <table className="permissions-grid">
                <thead>
                  <tr>
                    <th>Tela</th>
                    <th>Ver</th>
                    <th>Criar</th>
                    <th>Editar</th>
                    <th>Excluir</th>
                    <th>Exportar</th>
                    <th>Importar</th>
                  </tr>
                </thead>
                <tbody>
                  {permissoes.map((permissao) => (
                    <tr key={permissao.tela}>
                      <td>{LABEL_TELA[permissao.tela]}</td>
                      <td>
                        <input type="checkbox" checked={permissao.podeVisualizar} onChange={() => alternar(permissao.tela, 'podeVisualizar')} />
                      </td>
                      <td>
                        <input type="checkbox" checked={permissao.podeCriar} onChange={() => alternar(permissao.tela, 'podeCriar')} />
                      </td>
                      <td>
                        <input type="checkbox" checked={permissao.podeEditar} onChange={() => alternar(permissao.tela, 'podeEditar')} />
                      </td>
                      <td>
                        <input type="checkbox" checked={permissao.podeExcluir} onChange={() => alternar(permissao.tela, 'podeExcluir')} />
                      </td>
                      <td>
                        <input type="checkbox" checked={permissao.podeExportar} onChange={() => alternar(permissao.tela, 'podeExportar')} />
                      </td>
                      <td>
                        <input type="checkbox" checked={permissao.podeImportar} onChange={() => alternar(permissao.tela, 'podeImportar')} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar usuário'}
          </button>
        </div>
      </div>
    </div>
  );
}
