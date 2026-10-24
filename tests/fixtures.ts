/** Тестовые администраторы (только для azgroup_test, создаются в global-setup). */
export const OWNER = { email: 'owner@test.local', password: 'owner-test-password-1', name: 'Test Owner', role: 'owner' as const };
export const EDITOR = { email: 'editor@test.local', password: 'editor-test-password-1', name: 'Test Editor', role: 'editor' as const };
export const CSRF = { 'X-Requested-With': 'az-admin' };
