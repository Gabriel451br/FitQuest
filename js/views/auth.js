// Login (usuário + senha) e Cadastro (usuário, e-mail, senha).
import { html, useState } from '../lib.js';
import { signIn, signUp, USERNAME_RE } from '../cloud.js';
import { Field } from '../ui.js';

export function AuthView() {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [show, setShow] = useState(false);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setInfo('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signup' && f.password !== f.confirm) return setError('As senhas não conferem.');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn({ username: f.username, password: f.password });
      } else {
        const { needsConfirm } = await signUp({ username: f.username, email: f.email, password: f.password });
        if (needsConfirm) {
          setInfo(`Conta criada! Enviamos um link de confirmação para ${f.email.trim()}. Confirme e depois entre com seu usuário e senha.`);
          setMode('login');
          setF((o) => ({ ...o, password: '', confirm: '' }));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const userHint = mode === 'signup' && f.username && !USERNAME_RE.test(f.username.trim())
    ? '3 a 24 caracteres: letras, números, _ ou .'
    : null;

  return html`
    <div class="onb">
      <div class="row-sb">
        <div class="brand"><span class="brand-mark">FQ</span><span>FitQuest</span></div>
      </div>
      <h1 class="onb-title">${mode === 'login' ? html`Bem-vindo <em>de volta</em>.` : html`Crie sua <em>conta</em>.`}</h1>
      <p class="muted">${mode === 'login'
        ? 'Entre para sincronizar treinos, dieta e evolução em qualquer aparelho.'
        : 'Seus dados ficam salvos na nuvem e no aparelho, inclusive offline.'}</p>

      <div class="seg" role="tablist">
        <button type="button" role="tab" aria-selected=${mode === 'login'} class=${mode === 'login' ? 'on' : ''} onClick=${() => switchMode('login')}>Entrar</button>
        <button type="button" role="tab" aria-selected=${mode === 'signup'} class=${mode === 'signup' ? 'on' : ''} onClick=${() => switchMode('signup')}>Cadastrar</button>
      </div>

      <form class="stack" onSubmit=${submit} novalidate>
        <${Field} label="Usuário" hint=${userHint}>
          <input class="input" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false"
            value=${f.username} onInput=${set('username')} placeholder=${mode === 'login' ? 'Seu usuário' : 'ex.: gabriel_fit'} required />
        <//>
        ${mode === 'signup' && html`
          <${Field} label="E-mail">
            <input class="input" type="email" name="email" autocomplete="email" autocapitalize="none" value=${f.email} onInput=${set('email')} placeholder="voce@email.com" required />
          <//>
        `}
        <${Field} label="Senha">
          <div class="input-unit">
            <input class="input" type=${show ? 'text' : 'password'} name="password" autocomplete=${mode === 'login' ? 'current-password' : 'new-password'}
              value=${f.password} onInput=${set('password')} placeholder=${mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••'} required />
            <button type="button" class="pw-toggle" onClick=${() => setShow(!show)} aria-label=${show ? 'Ocultar senha' : 'Mostrar senha'}>${show ? 'OCULTAR' : 'VER'}</button>
          </div>
        <//>
        ${mode === 'signup' && html`
          <${Field} label="Confirmar senha">
            <input class="input" type=${show ? 'text' : 'password'} autocomplete="new-password" value=${f.confirm} onInput=${set('confirm')} required />
          <//>
        `}
        ${error && html`<div class="callout warn small" role="alert">${error}</div>`}
        ${info && html`<div class="callout small" role="status" style="border-left-color:var(--accent)">${info}</div>`}
        <button class="btn primary block" type="submit" disabled=${busy}>
          ${busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <p class="small muted center">
        ${mode === 'login'
          ? html`Não tem conta? <button class="link-btn" onClick=${() => switchMode('signup')}>Cadastre-se</button>`
          : html`Já tem conta? <button class="link-btn" onClick=${() => switchMode('login')}>Entrar</button>`}
      </p>
      <p class="tiny muted center">Você continua conectado neste aparelho até tocar em “Sair” nos Ajustes.</p>
    </div>
  `;
}

export function Splash() {
  return html`
    <div class="onb" style="justify-content:center;align-items:center">
      <div class="brand" style="font-size:28px"><span class="brand-mark" style="width:40px;height:40px;font-size:18px">FQ</span><span>FitQuest</span></div>
    </div>
  `;
}
