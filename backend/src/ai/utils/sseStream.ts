// ==========================================
// FILE: backend/src/ai/utils/sseStream.ts
// ==========================================

import { Response } from 'express';

export interface SSEEventPayload {
  event: 'chunk' | 'tool_start' | 'tool_end' | 'done' | 'error' | 'ping';
  data: Record<string, any> | string;
}

export class SSEStreamWriter {
  private res: Response;

  constructor(res: Response) {
    this.res = res;
    this.initHeaders();
  }

  /**
   * Initializes standard SSE response headers.
   */
  private initHeaders(): void {
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disables buffering in NGINX
    });
    this.res.flushHeaders?.();
  }

  /**
   * Sends a structured event payload to the client over SSE.
   */
  public send(event: SSEEventPayload['event'], data: SSEEventPayload['data']): void {
    if (this.res.writableEnded) return;

    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.res.write(`event: ${event}\n`);
    this.res.write(`data: ${payload}\n\n`);
  }

  /**
   * Sends a ping keep-alive message.
   */
  public ping(): void {
    this.send('ping', { timestamp: Date.now() });
  }

  /**
   * Sends the completion signal and closes the response stream.
   */
  public close(finalData?: Record<string, any>): void {
    if (this.res.writableEnded) return;

    this.send('done', finalData || { status: 'completed' });
    this.res.end();
  }

  /**
   * Sends an error event and closes the connection.
   */
  public error(errorMessage: string, statusCode = 500): void {
    if (this.res.writableEnded) return;

    this.send('error', { error: errorMessage, statusCode });
    this.res.end();
  }
}