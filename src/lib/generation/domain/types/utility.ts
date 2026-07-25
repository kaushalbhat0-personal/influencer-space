export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type Maybe<T> = T | null | undefined;

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Record<string, unknown>
    ? DeepReadonly<T[P]>
    : T[P];
};
