import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultCustomStateStore } from '../../src/custom-state-store';
import type { Request } from 'express';
import type { Session } from 'express-session';
import type { StateStoreStoreCallback, StateStoreVerifyCallback } from 'passport-oauth2';

describe('DefaultCustomStateStore', () => {
  let stateStore: DefaultCustomStateStore;
  let mockRequest: Partial<Request>;
  let mockSession: { [key: string]: any };

  beforeEach(() => {
    mockSession = {
      id: 'test-session-id',
      regenerate: jest.fn((cb: any) => cb()),
      destroy: jest.fn((cb: any) => cb()),
      reload: jest.fn((cb: any) => cb()),
      resetMaxAge: jest.fn(),
      save: jest.fn((cb: any) => cb()),
      touch: jest.fn((cb: any) => cb()),
      cookie: {
        maxAge: 3600000
      }
    };

    mockRequest = {
      session: mockSession as Session
    };

    stateStore = new DefaultCustomStateStore();
  });

  describe('store method', () => {
    it('should generate and store state when not provided', (done: any) => {
      const callback: StateStoreStoreCallback = (error: Error | null, state?: string) => {
        expect(error).toBeNull();
        expect(state).toBeDefined();
        expect(typeof state).toBe('string');
        expect(mockSession.oauthState.state).toBe(state);
        done();
      };

      stateStore.store(mockRequest as Request, callback);
    });

    it('should store provided state', (done: any) => {
      const providedState = 'custom-state';
      const callback: StateStoreStoreCallback = (error: Error | null, state?: string) => {
        expect(error).toBeNull();
        expect(state).toBe(providedState);
        expect(mockSession.oauthState.state).toBe(providedState);
        done();
      };

      stateStore.store(mockRequest as Request, { state: providedState }, callback);
    });

    it('should store code_verifier if present in session', (done: any) => {
      const codeVerifier = 'test-verifier';
      (mockRequest as any).session.code_verifier = codeVerifier;

      const callback: StateStoreStoreCallback = (error: Error | null, _state?: string) => {
        expect(error).toBeNull();
        expect(mockSession.oauthState.code_verifier).toBe(codeVerifier);
        done();
      };

      stateStore.store(mockRequest as Request, callback);
    });
  });

  describe('verify method', () => {
    it('should verify matching state', (done: any) => {
      const storedState = 'test-state';
      mockSession.oauthState = { state: storedState };

      const callback: StateStoreVerifyCallback = (error: Error | null, valid: boolean, state?: any) => {
        expect(error).toBeNull();
        expect(valid).toBe(true);
        expect(state.state).toBe(storedState);
        done();
      };

      stateStore.verify(mockRequest as Request, storedState, callback);
    });

    it('should fail on state mismatch', (done: any) => {
      mockSession.oauthState = { state: 'stored-state' };

      const callback: StateStoreVerifyCallback = (error: Error | null, valid: boolean) => {
        expect(error).toBeDefined();
        expect(error?.message).toBe('State does not match');
        expect(valid).toBe(false);
        done();
      };

      stateStore.verify(mockRequest as Request, 'wrong-state', callback);
    });

    it('should fail when no state stored', (done: any) => {
      const callback: StateStoreVerifyCallback = (error: Error | null, valid: boolean) => {
        expect(error).toBeDefined();
        expect(error?.message).toBe('No state stored in session');
        expect(valid).toBe(false);
        done();
      };

      stateStore.verify(mockRequest as Request, 'any-state', callback);
    });

    it('should remove state from session after verification', (done: any) => {
      const storedState = 'test-state';
      mockSession.oauthState = { state: storedState };

      const callback: StateStoreVerifyCallback = () => {
        expect(mockSession.oauthState).toBeUndefined();
        done();
      };

      stateStore.verify(mockRequest as Request, storedState, callback);
    });
  });
});
