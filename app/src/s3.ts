const encoder = new TextEncoder();

const hmac = async (
  key: string | Uint8Array,
  data: string,
): Promise<Uint8Array> => {
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );

  return new Uint8Array(signature);
};

const hash = async (data: string | Uint8Array): Promise<string> =>
  new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      (typeof data === "string" ? encoder.encode(data) : data) as BufferSource,
    ),
  ).toHex();

export class GetObjectCommand {
  public readonly method: string = "GET";
  constructor(
    public input: { Bucket: string; Key: string; Body?: undefined },
  ) {}
}

export class PubObjectCommand {
  public readonly method: string = "PUT";
  constructor(
    public input: { Bucket: string; Key: string; Body: string | Uint8Array },
  ) {}
}

type S3Command = GetObjectCommand | PubObjectCommand;

class S3Client {
  constructor(
    private config: {
      region: string;
      endpoint: string;
      credentials: { accessKeyId: string; secretAccessKey: string };
    },
  ) {}

  async send(command: S3Command): Promise<Response> {
    const bodyEncoded = typeof command.input.Body === "string"
      ? encoder.encode(command.input.Body)
      : command.input.Body;

    const url = new URL(
      this.config.endpoint + "/" + command.input.Bucket + "/" +
        command.input.Key,
    );
    const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const date = datetime.slice(0, 8);
    const hashedPayload = command.input.Body
      ? await hash(command.input.Body)
      : await hash("");

    const headers: Record<string, string> = {
      "host": url.host,
      "x-amz-content-sha256": hashedPayload,
      "x-amz-date": datetime,
    };

    if (bodyEncoded) headers["content-length"] = bodyEncoded.length.toString();

    // 1. Create Canonical Request
    const canonicalHeaders = Object.keys(headers).sort()
      .map((k) => `${k}:${headers[k]}\n`).join("");
    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalRequest = [
      command.method,
      url.pathname,
      url.search.slice(1),
      canonicalHeaders,
      signedHeaders,
      hashedPayload,
    ].join("\n");

    // 2. Create String to Sign
    const credentialScope = `${date}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      datetime,
      credentialScope,
      await hash(canonicalRequest),
    ].join("\n");

    // 3. Calculate Signature
    const kDate = await hmac(
      `AWS4${this.config.credentials.secretAccessKey}`,
      date,
    );
    const kRegion = await hmac(kDate, this.config.region);
    const kService = await hmac(kRegion, "s3");
    const kSigning = await hmac(kService, "aws4_request");
    const signature = (await hmac(kSigning, stringToSign)).toHex();

    // 4. Construct Authorization Header
    headers["Authorization"] = "AWS4-HMAC-SHA256 Credential=" +
      this.config.credentials.accessKeyId + "/" + credentialScope +
      ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;

    const response = await fetch(url, {
      method: command.method,
      headers,
      body: bodyEncoded,
    });

    if (!response.ok) {
      throw new Error(
        "S3 Error (" + response.status + "): " + await response.text(),
      );
    }

    return response;
  }
}

export const s3 = new S3Client({
  region: Deno.env.get("AWS_REGION") ?? "auto",
  endpoint: Deno.env.get("AWS_ENDPOINT_URL") ??
    "https://nah.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "nah",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "nah",
  },
});

export const Bucket = Deno.env.get("S3_BUCKET") ?? "rm";
