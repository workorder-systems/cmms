import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser, signInTestUser, signOutUser } from './helpers/auth';
import { makeUser } from './helpers/faker';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Authentication', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('User Signup', () => {
    it('should create a new user with email and password', async () => {
      const { email, password } = makeUser('planner');

      const { user, session } = await createTestUser(client, email, password);

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(session).toBeDefined();
      expect(session.access_token).toBeDefined();
    });

    it('should create multiple users with unique emails', async () => {
      const { email: email1, password } = makeUser('planner');
      const { email: email2 } = makeUser('technician');

      const { user: user1 } = await createTestUser(client, email1, password);
      const { user: user2 } = await createTestUser(client, email2, password);

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).toBe(email1);
      expect(user2.email).toBe(email2);
    });
  });

  describe('User Sign In', () => {
    it('should sign in an existing user', async () => {
      const { email, password } = makeUser('planner');

      // Create user first
      await createTestUser(client, email, password);

      // Sign out
      await signOutUser(client);

      // Sign in
      const { user, session } = await signInTestUser(client, email, password);

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(session).toBeDefined();
      expect(session.access_token).toBeDefined();
    });

    it('should fail to sign in with wrong password', async () => {
      const { email, password } = makeUser('planner');
      const wrongPassword = 'wrong-password';

      // Create user
      await createTestUser(client, email, password);
      await signOutUser(client);

      // Try to sign in with wrong password
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: wrongPassword,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid login credentials');
      expect(data.session).toBeNull();
    });

    it('should fail to sign in with non-existent email', async () => {
      const { email } = makeUser('planner');

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: 'any-password',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid login credentials');
      expect(data.session).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should maintain session after sign in', async () => {
      const { email, password } = makeUser('planner');

      const { session: initialSession } = await createTestUser(
        client,
        email,
        password
      );

      // Check current session
      const { data: sessionData } = await client.auth.getSession();
      expect(sessionData.session).toBeDefined();
      expect(sessionData.session?.access_token).toBe(initialSession.access_token);
    });

    it('should clear session after sign out', async () => {
      const { email, password } = makeUser('planner');

      await createTestUser(client, email, password);
      await signOutUser(client);

      // Check session is cleared
      const { data: sessionData } = await client.auth.getSession();
      expect(sessionData.session).toBeNull();
    });
  });
});
