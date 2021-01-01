export function act<T = void>(
  operation: (
    resolve: (value: T) => void,
    reject: (error: unknown) => void
  ) => void
): Promise<T> {
  return new Promise(operation);
}

export function timeout<T>(
  timeout: number,
  cb:
    | Promise<T>
    | ((resolve: (value: T) => void, reject: (error: unknown) => void) => void)
): Promise<T> {
  return Promise.race([
    cb instanceof Promise ? cb : new Promise<T>(cb),
    new Promise<T>((resolve, reject) =>
      setTimeout(() => reject("Timed out"), timeout)
    ),
  ]);
}
