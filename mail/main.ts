// main.ts - MBOX processor for Deno
// Reads MBOX from STDIN, writes parsed messages to STDOUT
import { concat, indexOfNeedle } from "@std/bytes";
import { crypto } from "@std/crypto";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const LF = "\n";
const FROM = "From ";
const NEW_MESSAGE = encoder.encode(LF + FROM);
const HEADER_END = encoder.encode(LF.repeat(2));

const KEEP_HEADERS = new Set([
  "return-path",
  "original-recipient",

  "from",
  "to",
  "cc",
  "bcc",
  "subject",
  "date",
  "reply-to",
  "sender",

  "message-id",
  "references",
  "in-reply-to",
  "content-type",
  "content-language",
  "content-transfer-encoding",
  "mime-version",

  "user-agent",

  "thread-topic",
  "thread-index",

  "list-help",
  "list-id",
  "list-unsubscribe",
  "list-unsubscribe-post",
]);

export class Process {
  constructor(
    private stdin: typeof Deno.stdin = Deno.stdin,
    private stdout: typeof Deno.stdout = Deno.stdout,
    private seenMessages = new Set<string>(),
  ) {}

  public run = async (): Promise<void> => {
    const raw = new Uint8Array(8 * 1024 * 1024);
    let remainder: Uint8Array = encoder.encode(LF);

    while (true) {
      const n = await this.stdin.read(raw);
      if (n === null || n === 0) break;

      remainder = await this.chunk(concat([remainder, raw.subarray(0, n)]));
    }

    await this.message(remainder);
  };

  private chunk = async (input: Uint8Array): Promise<Uint8Array> => {
    let left = 0;

    while (true) {
      const index = indexOfNeedle(input, NEW_MESSAGE, left) + 1;
      if (index === 0) break;

      await this.message(input.subarray(left, index));
      left = index;
    }

    return input.subarray(left);
  };

  private message = async (input: Uint8Array): Promise<void> => {
    if (input.length < 2) return;

    const headerEndIndex = indexOfNeedle(input, HEADER_END);
    if (headerEndIndex === -1) return;

    const headersText = decoder.decode(input.subarray(0, headerEndIndex));
    let keptHeaders = "";

    for (const header of headersText.split(/\n(?!\s)/)) {
      if (header.startsWith(FROM)) {
        keptHeaders += header + LF;
        continue;
      }

      const key = header.slice(0, header.indexOf(":")).toLowerCase();
      if (KEEP_HEADERS.has(key)) keptHeaders += header + LF;
    }

    const keptHeadersHash = new Uint8Array(
      await crypto.subtle.digest(
        "MD5",
        encoder.encode(keptHeaders),
      ),
    ).toBase64();
    if (this.seenMessages.has(keptHeadersHash)) return;
    this.seenMessages.add(keptHeadersHash);
    await this.stdout.write(encoder.encode(keptHeaders));

    await this.stdout.write(
      encoder.encode(decoder.decode(input.subarray(headerEndIndex + 1))),
    );
  };
}

(new Process()).run();
