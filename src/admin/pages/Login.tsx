/** Экран входа в админку. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn, TriangleAlert } from 'lucide-react';
import { loginInput } from '@shared/schemas';
import { ApiError, errorMessage } from '../api';
import { useAuth } from '../auth';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Form';
import ThemeToggle from '../../components/ThemeToggle';

export default function Login() {
  const { login, expired, bootError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [art, setArt] = useState(true);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Вход — Админка AZ Group';
    emailRef.current?.focus();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const parsed = loginInput.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const f: Record<string, string> = {};
      for (const i of parsed.error.issues) f[String(i.path[0] ?? '_')] ??= i.message;
      setFields(f);
      setError(null);
      (f.email ? emailRef : passRef).current?.focus();
      return;
    }
    setFields({});
    setError(null);
    setLoading(true);
    try {
      await login(parsed.data.email, parsed.data.password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError(err.message || 'Слишком много попыток входа. Подождите и попробуйте снова');
        else if (err.status === 401) { setError(err.message || 'Неверный e-mail или пароль'); setPassword(''); passRef.current?.focus(); }
        else if (Object.keys(err.fields).length) setFields(err.fields);
        else setError(err.message);
      } else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 20 }}>
        <ThemeToggle />
      </div>
      <div className="login-card">
        {art && (
          <div className="login-art" aria-hidden="true">
            <img src="/illustrations/admin-login.svg" alt="" onError={() => setArt(false)} />
          </div>
        )}
        <div className="login-body">
          <img className="login-logo" src="/logos/azgroup.png" alt="AZ Group" width="160" height="20" />
          <h1>Вход в админку</h1>
          <p className="login-lead">Управление содержимым сайта AZ Group</p>

          {expired && !error && <p className="notice notice-info" role="status">Сессия истекла. Войдите снова.</p>}
          {bootError && !error && <p className="notice notice-warn" role="status"><TriangleAlert size={16} aria-hidden="true" />{bootError}</p>}
          {error && <p className="notice notice-error" role="alert"><TriangleAlert size={16} aria-hidden="true" />{error}</p>}

          <form onSubmit={submit} noValidate className="login-form">
            <Field label="E-mail" error={fields.email}>
              <Input
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFields(f => ({ ...f, email: '' })); }}
                placeholder="Например: admin@az-group.kz"
                disabled={loading}
              />
            </Field>
            <Field label="Пароль" error={fields.password}>
              <span className="password-wrap">
                <Input
                  ref={passRef}
                  type={show ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFields(f => ({ ...f, password: '' })); }}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShow(s => !s)}
                  aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-pressed={show}
                  title={show ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </span>
            </Field>
            <Button type="submit" block loading={loading} icon={LogIn}>{loading ? 'Входим…' : 'Войти'}</Button>
          </form>
          <a className="login-back" href="/">← Вернуться на сайт</a>
        </div>
      </div>
    </main>
  );
}
