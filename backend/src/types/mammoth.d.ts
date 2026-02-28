declare module 'mammoth' {
  interface MammothResult {
    value: string;
  }
  function convertToHtml(buffer: Buffer, options?: unknown): Promise<MammothResult>;
  function extractRawText(buffer: Buffer): Promise<MammothResult>;
}
