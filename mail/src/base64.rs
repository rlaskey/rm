//! Base64 encode/decode, RFC 4648. Hand-rolled so the crate's only dependency
//! stays `clap`; the test module pins the codec to the RFC's test vectors.
//!
//! Decode is lenient about missing padding at the end of the input but strict
//! about invalid characters and misplaced `=`, matching what the original
//! `@std/encoding` `decodeBase64` accepts for well-formed mail bodies.

const STD_ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const URL_ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

fn encode_with(data: &[u8], alphabet: &[u8; 64]) -> String {
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let n = ((chunk[0] as u32) << 16)
            | ((chunk.get(1).copied().unwrap_or(0) as u32) << 8)
            | (chunk.get(2).copied().unwrap_or(0) as u32);
        out.push(alphabet[((n >> 18) & 63) as usize] as char);
        out.push(alphabet[((n >> 12) & 63) as usize] as char);
        if chunk.len() > 1 {
            out.push(alphabet[((n >> 6) & 63) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(alphabet[(n & 63) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

/// Standard base64 with `+`/`/` and `=` padding, RFC 4648 section 4.
pub fn encode(data: &[u8]) -> String {
    encode_with(data, STD_ALPHABET)
}

/// URL-safe alphabet with `-`/`_`, still `=`-padded — matches Deno's
/// `toBase64({ alphabet: "base64url" })`, RFC 4648 section 5.
pub fn encode_url(data: &[u8]) -> String {
    encode_with(data, URL_ALPHABET)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DecodeError(pub String);

impl std::fmt::Display for DecodeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "invalid base64: {}", self.0)
    }
}

impl std::error::Error for DecodeError {}

/// Reverse lookup for the standard alphabet; 0xFF marks invalid bytes.
const DECODE_TABLE: [u8; 256] = {
    let mut table = [0xFFu8; 256];
    let mut i = 0;
    while i < 64 {
        table[STD_ALPHABET[i] as usize] = i as u8;
        i += 1;
    }
    table
};

/// Decode standard base64. Accepts a padded or unpadded final quantum;
/// rejects characters outside the alphabet and `=` anywhere but trailing.
pub fn decode(input: &str) -> Result<Vec<u8>, DecodeError> {
    let table = &DECODE_TABLE;
    let b = input.as_bytes();
    if b.len() % 4 == 1 {
        return Err(DecodeError("length mod 4 == 1".to_string()));
    }

    let invalid = |c: u8| DecodeError(format!("invalid character 0x{c:02x}"));
    let mut out = Vec::with_capacity(b.len() / 4 * 3 + 3);
    let mut i = 0;

    while i + 4 <= b.len() {
        let g = &b[i..i + 4];
        let pad = match (g[3] == b'=', g[2] == b'=') {
            (true, true) => 2,
            (true, false) => 1,
            (false, true) => return Err(DecodeError("misplaced '='".to_string())),
            (false, false) => 0,
        };
        // RFC 4648: padding may only appear at the very end of the input.
        if pad > 0 && i + 4 != b.len() {
            return Err(DecodeError("padding only allowed at the end".to_string()));
        }
        for (j, &c) in g.iter().enumerate() {
            if c == b'=' {
                if j < 4 - pad {
                    return Err(DecodeError("misplaced '='".to_string()));
                }
            } else if table[c as usize] == 0xFF {
                return Err(invalid(c));
            }
        }
        let v = |c: u8| {
            if c == b'=' {
                0
            } else {
                table[c as usize] as u32
            }
        };
        let n = (v(g[0]) << 18) | (v(g[1]) << 12) | (v(g[2]) << 6) | v(g[3]);
        out.push((n >> 16) as u8);
        if pad < 2 {
            out.push((n >> 8) as u8);
        }
        if pad < 1 {
            out.push(n as u8);
        }
        i += 4;
    }

    // Unpadded final quantum of 2 or 3 characters.
    let rem = &b[i..];
    if !rem.is_empty() {
        let mut vals = [0u32; 4];
        for (j, &c) in rem.iter().enumerate() {
            if c == b'=' || table[c as usize] == 0xFF {
                return Err(invalid(c));
            }
            vals[j] = table[c as usize] as u32;
        }
        let n = (vals[0] << 18) | (vals[1] << 12) | (vals[2] << 6) | vals[3];
        out.push((n >> 16) as u8);
        if rem.len() == 3 {
            out.push((n >> 8) as u8);
        }
    }

    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test vectors from RFC 4648, section 10.
    #[test]
    fn rfc_4648_vectors() {
        let cases = [
            ("", ""),
            ("f", "Zg=="),
            ("fo", "Zm8="),
            ("foo", "Zm9v"),
            ("foob", "Zm9vYg=="),
            ("fooba", "Zm9vYmE="),
            ("foobar", "Zm9vYmFy"),
        ];
        for (plain, encoded) in cases {
            assert_eq!(encode(plain.as_bytes()), encoded, "encode {plain:?}");
            assert_eq!(
                decode(encoded).unwrap(),
                plain.as_bytes(),
                "decode {encoded:?}"
            );
        }
    }

    /// Section 5: the URL-safe alphabet swaps `+`/`/` for `-`/`_`.
    #[test]
    fn url_safe_alphabet() {
        let bytes = [0xfbu8, 0xff, 0xfe];
        assert_eq!(encode(&bytes), "+//+");
        assert_eq!(encode_url(&bytes), "-__-");
        // A 16-byte digest (like our MD5 use) keeps its "==" padding.
        let digest = [0u8; 16];
        assert!(encode_url(&digest).ends_with("=="));
        assert_eq!(encode_url(&digest).len(), 24);
    }

    #[test]
    fn decode_accepts_missing_padding() {
        assert_eq!(decode("Zg").unwrap(), b"f");
        assert_eq!(decode("Zm8").unwrap(), b"fo");
        assert_eq!(decode("Zm9vYmFy").unwrap(), b"foobar");
    }

    #[test]
    fn decode_rejects_garbage() {
        assert!(decode("Zm9v!bcd").is_err());
        assert!(decode("Z").is_err()); // len % 4 == 1
        assert!(decode("Zg==Zg==").is_err()); // '=' not trailing
        assert!(decode("=g==").is_err());
    }

    #[test]
    fn roundtrip_all_lengths() {
        for len in 0..64usize {
            let data: Vec<u8> = (0..len).map(|i| (i * 31 + 7) as u8).collect();
            assert_eq!(decode(&encode(&data)).unwrap(), data, "len {len}");
        }
    }
}
