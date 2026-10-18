// Leitura por padrão; --apply altera somente a proteção explicitamente selecionada.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { parseEnv } from 'node:util'
import { spawnSync } from 'node:child_process'

const project = 'taabjnmsaaltsiehywbw'
const account = '67b15c81a54e3dc007b28c46d1614829'
const site = 'https://service-guide.helon280.workers.dev'

function captchaPatch(env) {
  assert.ok(/^0x[A-Za-z0-9_-]+$/.test(env.VITE_TURNSTILE_SITE_KEY ?? ''), 'Site key real ausente.')
  assert.ok(
    env.TURNSTILE_SECRET_KEY && !/^[123]x/.test(env.TURNSTILE_SECRET_KEY),
    'Chave privada real do Turnstile ausente. Chaves de teste não são permitidas.',
  )
  return {
    security_captcha_enabled: true,
    security_captcha_provider: 'turnstile',
    security_captcha_secret: env.TURNSTILE_SECRET_KEY,
  }
}
function emailPatch(env, current) {
  for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'])
    assert.ok(env[key]?.trim(), 'Variável SMTP ausente: ' + key)
  assert.ok(
    /^[a-zA-Z0-9.-]+$/.test(env.SMTP_HOST),
    'Informe o hostname SMTP, sem protocolo ou caminho.',
  )
  assert.ok([465, 587].includes(Number(env.SMTP_PORT)), 'SMTP exige TLS na porta 465 ou 587.')
  assert.ok(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.SMTP_FROM), 'Remetente SMTP inválido.')
  assert.ok(
    current.security_captcha_enabled,
    'Ative e valide o CAPTCHA antes de liberar os e-mails públicos.',
  )
  return {
    external_email_enabled: true,
    mailer_autoconfirm: false,
    smtp_host: env.SMTP_HOST,
    smtp_port: Number(env.SMTP_PORT),
    smtp_user: env.SMTP_USER,
    smtp_pass: env.SMTP_PASSWORD,
    smtp_admin_email: env.SMTP_FROM,
    smtp_sender_name: 'Service Guide',
    rate_limit_email_sent: Math.max(30, Number(current.rate_limit_email_sent) || 0),
    mailer_subjects_confirmation: 'Confirme sua conta — Service Guide',
    mailer_subjects_recovery: 'Redefina sua senha — Service Guide',
    mailer_templates_confirmation_content: fs.readFileSync(
      'supabase/templates/confirmation.html',
      'utf8',
    ),
    mailer_templates_recovery_content: fs.readFileSync('supabase/templates/recovery.html', 'utf8'),
  }
}

const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--self-test') {
  assert.throws(() => captchaPatch({ VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }))
  assert.throws(() =>
    captchaPatch({ VITE_TURNSTILE_SITE_KEY: '0xunit', TURNSTILE_SECRET_KEY: '1xpublic-test-key' }),
  )
  const fake = {
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_USER: 'unit',
    SMTP_PASSWORD: 'unit-private-value',
    SMTP_FROM: 'unit@example.test',
  }
  assert.throws(() => emailPatch(fake, { security_captcha_enabled: false }))
  assert.throws(() => emailPatch({ ...fake, SMTP_PORT: '25' }, { security_captcha_enabled: true }))
  assert.throws(() =>
    emailPatch(
      { ...fake, SMTP_HOST: 'http://smtp.example.test/path' },
      { security_captcha_enabled: true },
    ),
  )
  const patch = emailPatch(fake, { security_captcha_enabled: true, rate_limit_email_sent: 60 })
  assert.equal(patch.mailer_autoconfirm, false)
  assert.equal(patch.rate_limit_email_sent, 60)
  assert.ok(patch.mailer_templates_confirmation_content.includes('{{ .ConfirmationURL }}'))
  assert.equal(patch.password_min_length, undefined)
  console.log(
    'OK: testes sem rede; chaves fictícias, SMTP inseguro e ativação fora de ordem recusados.',
  )
} else {
  assert.ok(
    args.every((arg) => ['--captcha', '--email', '--apply'].includes(arg)),
    'Argumento inválido.',
  )
  const kind = args.includes('--captcha') ? 'captcha' : args.includes('--email') ? 'email' : null
  assert.ok(
    !(args.includes('--captcha') && args.includes('--email')),
    'Aplique uma proteção por vez.',
  )
  assert.ok(!args.includes('--apply') || kind, 'Escolha --captcha ou --email antes de --apply.')
  const env = parseEnv(fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, ''))
  assert.equal(new URL(env.VITE_SUPABASE_URL).hostname, project + '.supabase.co')
  assert.equal(env.CLOUDFLARE_ACCOUNT_ID, account)
  assert.ok(env.SUPABASE_ACCESS_TOKEN, 'Token de gerenciamento ausente.')
  const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`
  const headers = {
    Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  }
  async function read() {
    const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(20000) })
    assert.equal(response.status, 200, 'Configuração Auth indisponível.')
    return response.json()
  }
  try {
    const before = await read()
    const report = {
      project,
      applied: false,
      selected: kind,
      captchaEnabled: before.security_captcha_enabled,
      captchaProvider: before.security_captcha_provider,
      emailConfirmationRequired: !before.mailer_autoconfirm,
      customSmtpConfigured: !!before.smtp_host && !!before.smtp_user,
      localSmtpFieldsReady: [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'SMTP_FROM',
      ].every((key) => !!env[key]),
      emailsSentByThisScript: false,
      currentPasswordsChanged: false,
    }
    let patch
    if (kind === 'captcha') patch = captchaPatch(env)
    if (kind === 'email') patch = emailPatch(env, before)
    if (args.includes('--apply')) {
      assert.equal(before.site_url, site, 'Site URL inesperada.')
      if (kind === 'captcha') {
        const widgetResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${account}/challenges/widgets/${env.VITE_TURNSTILE_SITE_KEY}`,
          {
            headers: { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN },
            signal: AbortSignal.timeout(20000),
          },
        )
        assert.equal(widgetResponse.status, 200, 'Widget Turnstile indisponível.')
        const widget = (await widgetResponse.json()).result
        assert.deepEqual(
          widget.domains,
          [new URL(site).hostname],
          'Widget fora do domínio autorizado.',
        )
        assert.ok(
          (widget.secret ?? widget.secret_key) === env.TURNSTILE_SECRET_KEY,
          'Chave privada não corresponde ao widget.',
        )
        for (const path of ['/entrar', '/cadastro', '/cadastro?confirmar=true']) {
          const page = await fetch(site + path, { signal: AbortSignal.timeout(20000) })
          assert.equal(page.status, 200, 'Formulário publicado indisponível: ' + path)
          assert.ok(
            (await page.text()).includes('data-sitekey="' + env.VITE_TURNSTILE_SITE_KEY + '"'),
            'Publique primeiro os formulários com o widget: ' + path,
          )
          assert.ok(
            page.headers
              .get('content-security-policy')
              ?.includes("frame-src 'self' https://challenges.cloudflare.com"),
            'CSP do widget ausente.',
          )
        }
      } else {
        const python = spawnSync(
          'python',
          [
            '-c',
            `import os, ssl, smtplib
try:
 p=int(os.environ['SMTP_PORT'])
 c=smtplib.SMTP_SSL(os.environ['SMTP_HOST'],p,timeout=20,context=ssl.create_default_context()) if p==465 else smtplib.SMTP(os.environ['SMTP_HOST'],p,timeout=20)
 if p==587:
  c.ehlo();c.starttls(context=ssl.create_default_context());c.ehlo()
 c.login(os.environ['SMTP_USER'],os.environ['SMTP_PASSWORD'])
 c.quit()
 print('SMTP_TLS_AUTH_OK')
except Exception:
 raise SystemExit('SMTP_TLS_AUTH_FAILED')`,
          ],
          { env: { ...process.env, ...env }, encoding: 'utf8', timeout: 30000, maxBuffer: 16384 },
        )
        assert.ok(
          python.status === 0 && python.stdout.includes('SMTP_TLS_AUTH_OK'),
          'Falha na conexão SMTP/TLS/autenticação. Nenhum e-mail enviado; configuração preservada.',
        )
      }
      fs.mkdirSync('.wrangler', { recursive: true })
      fs.writeFileSync(
        `.wrangler/auth-before-${kind}-${Date.now()}.json`,
        JSON.stringify(
          Object.fromEntries(Object.keys(patch).map((key) => [key, before[key] ?? null])),
          null,
          2,
        ),
      )
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
        signal: AbortSignal.timeout(20000),
      })
      assert.ok(response.ok, 'Falha ao configurar Auth. Confira o estado antes de repetir.')
      const after = await read()
      for (const key of [
        'site_url',
        'uri_allow_list',
        'password_min_length',
        'refresh_token_rotation_enabled',
        'external_google_enabled',
      ])
        assert.deepEqual(after[key], before[key], 'Campo não solicitado alterado: ' + key)
      if (kind === 'captcha') {
        assert.equal(after.security_captcha_enabled, true)
        assert.equal(after.security_captcha_provider, 'turnstile')
        assert.equal(after.mailer_autoconfirm, before.mailer_autoconfirm)
      } else {
        assert.equal(after.mailer_autoconfirm, false)
        assert.equal(after.smtp_host, env.SMTP_HOST)
        assert.equal(after.smtp_admin_email, env.SMTP_FROM)
        assert.equal(after.security_captcha_enabled, before.security_captcha_enabled)
      }
      report.applied = true
      report.captchaEnabled = after.security_captcha_enabled
      report.captchaProvider = after.security_captcha_provider
      report.emailConfirmationRequired = !after.mailer_autoconfirm
      report.customSmtpConfigured = !!after.smtp_host && !!after.smtp_user
      fs.writeFileSync(`.wrangler/auth-applied-${kind}.json`, JSON.stringify(report, null, 2))
    }
    console.log(JSON.stringify(report))
  } catch (error) {
    console.error(
      error instanceof assert.AssertionError
        ? error.message
        : 'Falha de conexão ou leitura na configuração Auth.',
    )
    process.exitCode = 1
  }
}
