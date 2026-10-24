/** Хэширование паролей администраторов (bcryptjs, cost 12). */
import bcrypt from 'bcryptjs';

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try { return await bcrypt.compare(plain, hash); } catch { return false; }
}

/** Хэш-заглушка: сравниваем с ним, когда пользователя нет, чтобы время ответа не выдавало существование e-mail. */
let dummy: Promise<string> | undefined;
export const dummyHash = () => (dummy ??= bcrypt.hash('az-dummy-password-never-matches', COST));
