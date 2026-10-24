declare namespace NodeJS {
  interface ProcessEnv {
    STANDARD_USERNAME: string;
    PASSWORD: string;
    LOCKED_OUT_USER: string;
    PETSTORE_API_KEY: string;
    WORKERS?: string;
    CI?: string;
  }
}
