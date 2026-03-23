import { z } from 'zod';

export const uuid = z.string().uuid();

/** Empty args for parameterless SDK methods. */
export const emptyArgs = z.object({}).strict();

/** Loose JSON object for complex RPC payloads (validated again by Postgres / SDK). */
export const jsonRecord = z.record(z.unknown());

export const optionalUuid = uuid.nullish();
