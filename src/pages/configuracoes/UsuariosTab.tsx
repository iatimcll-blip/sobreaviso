import { KeyRound, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { UsuarioComPermissoes } from '@shared/types/usuario';
import { useToast } from '../../app/layout/ToastProvider';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { PlaceholderCard } from '../../components/PlaceholderCard';
import { UsuarioFormModal } from './UsuarioFormModal';

export function UsuariosTab() {
  const { usuario: usuarioLogado } = useAuth();
  const { notificar } = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioComPermissoes[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<UsuarioComPermissoes | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await api.get<{ usuarios: UsuarioComPermissoes[] }>('/usuarios');
      setUsuarios(resposta.usuarios);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar os usuários.', 'erro');
    }
  }, [notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function redefinirSenha(alvo: UsuarioComPermissoes, evento: React.MouseEvent) {
    evento.stopPropagation();
    const novaSenha = prompt(`Nova senha para "${alvo.username}" (mínimo 8 caracteres):`);
    if (!novaSenha) return;
    try {
      await api.patch(`/usuarios/${alvo.id}/senha`, { password: novaSenha });
      notificar('Senha redefinida.', 'sucesso');
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível redefinir a senha.', 'erro');
    }
  }

  if (usuarioLogado?.role !== 'admin') {
    return <PlaceholderCard title="Acesso restrito" description="Somente administradores podem gerenciar usuários e permissões." fase="" />;
  }

  return (
    <>
      <div className="card card-padded">
        <div className="table-toolbar">
          <p>Controle quem acessa o painel e o que cada pessoa pode fazer em cada tela.</p>
          <div className="table-toolbar-actions">
            <button
              className="primary"
              onClick={() => {
                setEmEdicao(null);
                setModalAberto(true);
              }}
            >
              <Plus size={18} />
              Novo usuário
            </button>
          </div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Nome</th>
                <th>Papel</th>
                <th>Situação</th>
                <th>Último acesso</th>
                <th className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    setEmEdicao(item);
                    setModalAberto(true);
                  }}
                >
                  <td>{item.username}</td>
                  <td>{item.nomeCompleto}</td>
                  <td>
                    <span className={`badge badge-${item.role}`}>{item.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${item.ativo ? 'ativo' : 'inativo'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td>{item.ultimoLoginEm ?? 'Nunca acessou'}</td>
                  <td className="col-acoes">
                    <button onClick={(e) => void redefinirSenha(item, e)} title="Redefinir senha">
                      <KeyRound size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuarios.length === 0 && <div className="data-table-empty">Nenhum usuário cadastrado.</div>}
        </div>
      </div>

      {modalAberto && (
        <UsuarioFormModal
          usuario={emEdicao}
          aoFechar={() => setModalAberto(false)}
          aoSalvar={() => {
            setModalAberto(false);
            void carregar();
          }}
        />
      )}
    </>
  );
}
