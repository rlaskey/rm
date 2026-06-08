// main.ts - MBOX processor for Deno
// Reads MBOX from STDIN, writes parsed messages to STDOUT
import { concat, indexOfNeedle } from "@std/bytes";
import { crypto } from "@std/crypto";
import { decodeBase64 } from "@std/encoding";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const LF = "\n";
const FROM = "From ";
const NEW_MESSAGE = encoder.encode(LF + FROM);
const HEADER_END = encoder.encode(LF.repeat(2));
const KEEP_TYPES = ["text/", "message/", "application/ics"];

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

const HEADER_SPLIT = /\n(?!\s)/;
const HEADER_JOIN = /\n[ \t]+/g;
const ESCAPE = /\\(.)/g;

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

	public static v = (input: string, key: string): string | undefined => {
		for (
			const kv of input.replace(HEADER_JOIN, " ").split(";").map((x) =>
				x.trim()
			)
		) {
			const i = kv.indexOf("=");
			if (i === -1) continue;

			const [k, rawV] = [kv.slice(0, i), kv.slice(i + 1).trim()];
			if (k.toLowerCase() !== key) continue;

			if (rawV.startsWith('"') && rawV.endsWith('"')) {
				return rawV.slice(1, -1).replace(ESCAPE, "$1");
			}

			return rawV;
		}
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
		if (headerEndIndex === -1) throw new Error("Malformed header.");

		const headersText = decoder.decode(input.subarray(0, headerEndIndex));
		let keptHeaders = "";
		const boundaries: string[] = [];

		for (const header of headersText.split(HEADER_SPLIT)) {
			if (header.startsWith(FROM)) {
				keptHeaders += header + LF;
				continue;
			}

			const key = header.slice(0, header.indexOf(":")).toLowerCase();
			if (!KEEP_HEADERS.has(key)) continue;
			keptHeaders += header + LF;

			if (
				key === "content-type" &&
				header.toLowerCase().indexOf("multipart/") !== -1
			) {
				const v = Process.v(header, "boundary");
				if (v) boundaries.push(v);
			}
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
		await this.body(input.subarray(headerEndIndex + 1), boundaries);
	};

	private body = async (
		input: Uint8Array,
		boundaries: string[],
	): Promise<void> => {
		if (!boundaries.length) {
			await this.stdout.write(input);
			return;
		}

		const separator = LF + "--" + boundaries[boundaries.length - 1];
		const start = indexOfNeedle(input, encoder.encode(separator + LF));

		if (start === -1) {
			boundaries.pop();
			await this.body(input, boundaries);
			return;
		}

		await this.stdout.write(input.subarray(0, start));
		const headerEnd = indexOfNeedle(input, HEADER_END, start) + 1;
		if (headerEnd === 0) throw new Error("Malformed part header.");

		const headers = input.subarray(start, headerEnd);
		const headersText = decoder.decode(headers);

		const next = indexOfNeedle(
			input,
			encoder.encode(separator + LF),
			headerEnd,
		);

		let end = next;
		if (next === -1) {
			end = indexOfNeedle(input, encoder.encode(separator + "--" + LF));
			boundaries.pop();
		}
		if (end === -1) throw new Error("No end in sight!!");

		let contentTransferEncoding = "";
		let ext: string | undefined;
		let filename: string | undefined;
		for (const header of headersText.split(HEADER_SPLIT)) {
			const fieldName = header.slice(0, header.indexOf(":")).toLowerCase();

			if (fieldName === "content-type") {
				const newBoundary = Process.v(header, "boundary");

				if (newBoundary) {
					boundaries.push(newBoundary);
					await this.stdout.write(headers);
					await this.body(input.subarray(headerEnd), boundaries);
					return;
				}

				const mediaType = header.slice(fieldName.length + 1).split(";", 1)[0]
					.trim();
				ext = mediaType.split("/", 2)[1];
				if (KEEP_TYPES.some((x) => mediaType.startsWith(x))) {
					await this.stdout.write(input.subarray(start, end));
					await this.body(input.subarray(end), boundaries);
					return;
				}
			}

			if (fieldName === "content-transfer-encoding") {
				contentTransferEncoding = header.slice(fieldName.length + 1)
					.toLowerCase().trim();
			}

			if (fieldName === "content-disposition") {
				filename = Process.v(header, "filename");
			}
		}

		if (contentTransferEncoding !== "base64") {
			await this.stdout.write(input.subarray(start, end));
			await this.body(input.subarray(end), boundaries);
			return;
		}

		if (!filename) filename = "untitled." + ext;

		const binary = decodeBase64(
			decoder.decode(input.subarray(headerEnd, end)).replace(/\s+/g, ""),
		);
		const md5 = new Uint8Array(await crypto.subtle.digest("MD5", binary));
		const dir = `/tmp/content/${md5.toBase64({ alphabet: "base64url" })}`;
		await Deno.mkdir(dir, { recursive: true });
		await Deno.writeFile(`${dir}/${filename}`, binary);

		// comment this out to strip attachments. Be careful! Make backups.
		await this.stdout.write(input.subarray(start, end));

		await this.body(input.subarray(end), boundaries);
	};
}

(new Process()).run();
