'use client'
import { useState } from 'react'
import { CheckCircle2, LifeBuoy, Store, ShieldCheck } from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '~/modules/ui/primitives/accordion'
import { Header, Footer, Consent, Picker, useCatalog } from '../components/shared'
import { api } from '~/modules/guide/api'
const questions = [
  [
    'Preciso criar uma conta para usar o guia?',
    'Você pode pesquisar e consultar perfis sem criar conta. A conta gratuita é usada para favoritos, avaliações e solicitações de contato pelo guia. Você entra com seu e-mail e senha.',
  ],
  [
    'Como encontro um produto ou serviço?',
    'Digite o que precisa, como “tinta emborrachada” ou “eletricista”. Os resultados mostram empresas que oferecem esse item. Use categoria, bairro, valor e disponibilidade para refinar a busca. Confirme preço e estoque diretamente com a empresa.',
  ],
  [
    'O Service Guide vende ou contrata serviços?',
    'O guia aproxima você dos negócios de Cacoal. Atendimento, contratação, prazos, valores e pagamentos são combinados diretamente com cada empresa ou profissional.',
  ],
  [
    'Como funcionam as avaliações?',
    'Avalie somente se teve experiência com o negócio. Cada usuário pode avaliar uma empresa, e o comentário passa por moderação. A contratação não é verificada pelo guia. Comentários inadequados podem ser denunciados para análise.',
  ],
  [
    'Por que alguns perfis aparecem como exemplos?',
    'Esses perfis são fictícios e demonstram como o guia funciona. Suas fotos, produtos, serviços e valores são ilustrativos. Eles não recebem avaliações ou solicitações de contato.',
  ],
  [
    'Como incluo minha loja ou meu trabalho no guia?',
    'Envie uma solicitação abaixo, escolhendo “Incluir meu negócio”. Conte o nome do negócio, o que oferece e um contato. O dono do Service Guide acompanha o pedido e combina a inclusão e as condições pessoalmente. O envio não ativa um perfil automaticamente.',
  ],
  [
    'Posso corrigir informações de um perfil?',
    'Envie o nome do negócio e a informação que precisa ser corrigida no formulário abaixo. A equipe analisa a solicitação antes de alterar o cadastro.',
  ],
  [
    'Como altero minha escolha sobre estatísticas?',
    'Use “Preferências de estatísticas” no rodapé. Você pode permitir ou manter somente os dados essenciais. Pedidos sobre seus dados pessoais também podem ser enviados pelo formulário abaixo.',
  ],
]
export default function Help({ initialKind = 'help' }: { initialKind?: string }) {
  const { viewer } = useCatalog(null, undefined, false)
  const [kind, setKind] = useState<string>(initialKind),
    [nameInput, setName] = useState<string | null>(null),
    [emailInput, setEmail] = useState<string | null>(null),
    [phoneInput, setPhone] = useState<string | null>(null),
    [message, setMessage] = useState(''),
    [website, setWebsite] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reference, setReference] = useState('')
  const name = nameInput ?? viewer?.name ?? ''
  const email = emailInput ?? viewer?.email ?? ''
  const phone = phoneInput ?? viewer?.phone ?? ''
  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const r = await api('/api/support', { kind, name, email, phone, message, website })
      setReference(r.reference)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Header viewer={viewer} />
      <main id="main-content" className="wrap help-page">
        <div className="help-heading">
          <LifeBuoy size={34} />
          <div>
            <h1>Como podemos ajudar?</h1>
            <p>Respostas rápidas e um contato direto com a equipe do guia.</p>
          </div>
        </div>
        <div className="help-layout">
          <section aria-labelledby="questions-title">
            <h2 id="questions-title">Sobre o Service Guide</h2>
            <Accordion type="single" collapsible className="help-questions">
              {questions.map(([title, text], i) => (
                <AccordionItem key={title} value={'question-' + String(i)}>
                  <AccordionTrigger>{title}</AccordionTrigger>
                  <AccordionContent>{text}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
          <section className="support-form-panel" id="contato" aria-labelledby="contact-title">
            {reference ? (
              <div className="support-success" role="status">
                <CheckCircle2 size={36} />
                <h2>Solicitação registrada.</h2>
                <p>
                  Guarde seu protocolo: <strong>{reference}</strong>.
                </p>
                <p>
                  A equipe acompanha seu pedido pelo painel e usará o contato informado para
                  retornar. Ainda não há prazo de resposta definido.
                </p>
                <a className="btn primary" href="/">
                  Voltar ao guia
                </a>
                <button
                  className="text-button"
                  onClick={() => {
                    setReference('')
                    setMessage('')
                  }}
                >
                  Enviar outra solicitação
                </button>
              </div>
            ) : (
              <>
                <h2 id="contact-title">Fale com o guia</h2>
                <p className="secondary">
                  Inclusão de negócios, correções, dúvidas e pedidos sobre seus dados.
                </p>
                <form
                  className="support-form"
                  onSubmit={(event) => {
                    void submit(event)
                  }}
                >
                  <label>
                    Assunto
                    <Picker
                      label="Assunto da solicitação"
                      value={kind}
                      onChange={setKind}
                      options={[
                        { id: 'help', name: 'Dúvida ou correção' },
                        { id: 'business', name: 'Incluir meu negócio' },
                        { id: 'privacy', name: 'Privacidade e meus dados' },
                      ]}
                    />
                  </label>
                  <label>
                    Seu nome
                    <input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                      }}
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    E-mail para retorno
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                      }}
                      required
                      maxLength={200}
                      autoComplete="email"
                    />
                  </label>
                  <label>
                    Telefone ou WhatsApp <span className="optional">opcional</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                      }}
                      maxLength={25}
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    {kind === 'business' ? 'Conte sobre seu negócio' : 'Sua mensagem'}
                    <textarea
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value)
                      }}
                      required
                      minLength={20}
                      maxLength={2000}
                      rows={5}
                      placeholder={
                        kind === 'business'
                          ? 'Nome, segmento, bairro e o que você oferece…'
                          : 'Descreva seu pedido. Se for uma correção, informe o nome do negócio.'
                      }
                    />
                  </label>
                  <div className="honeypot" aria-hidden="true">
                    <label>
                      Site
                      <input
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => {
                          setWebsite(e.target.value)
                        }}
                      />
                    </label>
                  </div>
                  {kind === 'business' && (
                    <p className="form-note">
                      <Store size={18} />O dono combina a inclusão e as condições pessoalmente com
                      você.
                    </p>
                  )}
                  <p className="form-note">
                    <ShieldCheck size={18} />
                    Seus dados de contato ficam disponíveis somente para a equipe.{' '}
                    <a href="/privacidade">Privacidade</a>
                  </p>
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="btn primary" disabled={busy}>
                    {busy ? 'Registrando…' : 'Enviar solicitação'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <Consent />
    </>
  )
}
