import { useSyncExternalStore } from 'react'
import { ArrowLeft, ArrowUpFromLine, Download, Smartphone, CheckCircle2 } from 'lucide-react'
import { Header, Footer } from '~/modules/guide/components/shared'
import { GuideShell } from '~/modules/guide/GuideShell'
import {
  installSnapshot,
  installServerSnapshot,
  subscribeInstall,
  promptInstall,
} from './install-store'

export default function InstallScreen() {
  const state = useSyncExternalStore(subscribeInstall, installSnapshot, installServerSnapshot)
  return (
    <GuideShell>
      <Header />
      <main id="main-content" className="wrap install-page">
        <a className="install-back" href="/">
          <ArrowLeft size={18} />
          Voltar para o guia
        </a>
        <div className="install-intro">
          <img src="/app-icons/icon-192.png" alt="" width="96" height="96" />
          <div>
            <p className="install-eyebrow">Service Guide no seu celular</p>
            <h1>Seu guia, a um toque.</h1>
            <p>
              Adicione o Service Guide à tela inicial. Abra pelo ícone para pesquisar empresas,
              guardar favoritos e encontrar o que precisa em Cacoal.
            </p>
          </div>
        </div>
        {state.installed ? (
          <div className="install-status" role="status">
            <CheckCircle2 size={24} />
            <p>O Service Guide está pronto para abrir pelo ícone da tela inicial.</p>
          </div>
        ) : state.canPrompt || state.busy ? (
          <div className="install-action">
            <button
              className="btn primary"
              disabled={state.busy}
              onClick={() => {
                void promptInstall()
              }}
            >
              <Download size={20} />
              {state.busy ? 'Abrindo instalação…' : 'Instalar Service Guide'}
            </button>
            <p>A instalação é gratuita. Você também pode continuar pelo navegador.</p>
          </div>
        ) : (
          <p className="install-lead">
            Escolha abaixo as instruções do seu celular. A instalação é gratuita.
          </p>
        )}
        {state.message && (
          <p className="install-message" role="status">
            {state.message}
          </p>
        )}
        <div className="install-methods">
          <section aria-labelledby="install-iphone">
            <Smartphone size={28} aria-hidden="true" />
            <h2 id="install-iphone">No iPhone ou iPad</h2>
            <ol>
              <li>
                Abra este site no <strong>Safari</strong>.
              </li>
              <li>
                Toque em <strong>Compartilhar</strong>{' '}
                <ArrowUpFromLine size={17} aria-hidden="true" /> no menu do navegador.
              </li>
              <li>
                Escolha <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>
                Se aparecer, ative <strong>Abrir como App da Web</strong>. Toque em{' '}
                <strong>Adicionar</strong>.
              </li>
            </ol>
            <p>
              O ícone do Service Guide aparecerá na tela inicial. Se você veio do WhatsApp ou
              Instagram, abra o link no Safari para instalar.
            </p>
          </section>
          <section aria-labelledby="install-android">
            <Download size={28} aria-hidden="true" />
            <h2 id="install-android">No Android</h2>
            <ol>
              <li>
                Abra este site no <strong>Chrome</strong>.
              </li>
              <li>Toque no menu do navegador, no canto superior.</li>
              <li>
                Escolha <strong>Instalar aplicativo</strong> ou{' '}
                <strong>Adicionar à tela inicial</strong>.
              </li>
              <li>
                Confirme a instalação do <strong>Service Guide</strong>.
              </li>
            </ol>
            <p>
              Os nomes das opções podem variar. Se a instalação ainda não aparecer, continue
              navegando e tente pelo menu novamente.
            </p>
          </section>
        </div>
        <section className="install-notes" aria-labelledby="install-details">
          <h2 id="install-details">O mesmo guia, com acesso mais fácil.</h2>
          <p>
            Use a mesma conta do site e entre novamente se for solicitado. Seus favoritos salvos
            continuam vinculados à sua conta. A busca e as informações atualizadas precisam de
            internet. Sem conexão, mostramos uma orientação para você voltar ao guia.
          </p>
          <p>
            As atualizações são preparadas em segundo plano para o próximo uso. Seus formulários não
            serão recarregados automaticamente.
          </p>
          <a href="/privacidade">Conheça nossas práticas de privacidade</a>
        </section>
      </main>
      <Footer />
    </GuideShell>
  )
}
