import { createFileRoute } from '@tanstack/react-router'
import { GuideShell } from '~/modules/guide/GuideShell'
import { Header, Footer } from '~/modules/guide/components/shared'

export const Route = createFileRoute('/privacidade')({
  head: () => ({ meta: [{ title: 'Privacidade | Service Guide' }] }),
  component: Privacy,
})
function Privacy() {
  return (
    <GuideShell>
      <Header />
      <main id="main-content" className="wrap guide-privacy">
        <h1>Privacidade no Service Guide</h1>
        <p>Você pode pesquisar empresas, produtos e serviços sem criar uma conta.</p>
        <h2>Conta e atendimento</h2>
        <p>
          O cadastro usa nome, e-mail, telefone e senha. A autenticação é realizada pelo Supabase.
          Favoritos, avaliações e solicitações de contato ficam associados à sua conta. A
          administração acessa as informações necessárias para analisar avaliações e acompanhar
          pedidos.
        </p>
        <h2>Estatísticas opcionais</h2>
        <p>
          Com sua autorização, registramos pesquisas, páginas visitadas, cliques e medições de
          desempenho. Os eventos não incluem senha, gravação de tela ou conteúdo de formulários. Uma
          sessão aleatória identifica a navegação. Um clique em contato não comprova uma venda.
        </p>
        <h2>Sua escolha</h2>
        <p>
          Você pode recusar as estatísticas e continuar usando o guia. Para mudar sua decisão, use
          “Preferências de estatísticas” no rodapé. Dados de conta e atendimento necessários às
          funcionalidades são tratados independentemente dessa escolha.
        </p>
        <h2>Contatos externos</h2>
        <p>
          WhatsApp, telefone, mapas e sites abrem serviços externos, que têm suas próprias condições
          de uso e privacidade. As informações comerciais são cadastradas pela administração.
        </p>
        <h2>Solicitações sobre seus dados</h2>
        <p>
          Use o formulário de <a href="/ajuda?tipo=privacy#contato">ajuda e privacidade</a> para
          solicitar acesso, correção ou exclusão. A equipe acompanha cada pedido por protocolo. A
          equipe responderá usando os dados de contato informados na solicitação.
        </p>
      </main>
      <Footer />
    </GuideShell>
  )
}
