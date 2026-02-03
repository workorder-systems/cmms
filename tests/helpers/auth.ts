import { SupabaseClient } from '@supabase/supabase-js';
import { makeUser } from './faker';
import { formatPostgrestError } from './errors.js';

/** Standard password used for all test users */
export const TEST_PASSWORD = 'StrongPassword!123';

/**
 * Type helper for test users with email property
 */
export interface TestUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Create a test user and return the session.
 * If email/password are not provided, a realistic CMMS user is generated.
 */
export async function createTestUser(
  client: SupabaseClient,
  email?: string,
  password?: string
): Promise<{ user: TestUser; session: { access_token: string; [key: string]: unknown } }> {
  const generated = makeUser();
  const finalEmail = email ?? generated.email;
  const finalPassword = password ?? generated.password;

  const { data, error } = await client.auth.signUp({
    email: finalEmail,
    password: finalPassword,
  });

  if (error) {
    // If sign-up fails for any reason (e.g. user already exists), fall back to sign-in.
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: finalEmail,
      password: finalPassword,
    });
    if (signInError) {
      throw new Error(
        `${formatPostgrestError('Failed to create or sign in test user (signup)', error)}; signin: ${formatPostgrestError('signin', signInError)}`
      );
    }
    return {
      user: signInData.user,
      session: signInData.session,
    };
  }

  // Local Supabase may be configured to not return a session on sign-up (e.g. email confirmation flows).
  // Many tests expect the client to be authenticated immediately after user creation, so we sign in if needed.
  if (!data.session) {
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: finalEmail,
      password: finalPassword,
    });
    if (signInError) {
      throw new Error(formatPostgrestError('Failed to sign in test user after sign up', signInError));
    }
    return {
      user: signInData.user as TestUser,
      session: signInData.session as { access_token: string; [key: string]: unknown },
    };
  }

  return {
    user: data.user as TestUser,
    session: data.session as { access_token: string; [key: string]: unknown },
  };
}

/**
 * Sign in as a test user
 */
export async function signInTestUser(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<{ user: TestUser; session: { access_token: string; [key: string]: unknown } }> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to sign in test user', error));
  }

  return {
    user: data.user as TestUser,
    session: data.session as { access_token: string; [key: string]: unknown },
  };
}

/**
 * Sign out the current user
 */
export async function signOutUser(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(formatPostgrestError('Failed to sign out', error));
  }
}

/**
 * Get email from test user
 */
export function getUserEmail(user: TestUser): string {
  if (!user.email) {
    throw new Error('User does not have an email property');
  }
  return user.email;
}
