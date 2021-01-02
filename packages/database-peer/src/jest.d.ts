declare global {
  namespace jest {
    interface Matchers<R> {
      toResolve(): Promise<R>;
      toReject(): Promise<R>;
    }
  }
}

export {};
