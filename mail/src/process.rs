//! MBOX stream filter. Port of the `Process` class in main.ts: reads an MBOX
//! from a reader, writes only whitelisted headers plus kept MIME parts to the
//! writer, dedupes messages by MD5 of the kept headers, and extracts base64
//! attachments into a content-addressed directory.

use std::collections::HashSet;
use std::io::{self, Error, ErrorKind, Read, Write};
use std::path::PathBuf;

use crate::base64;
use crate::headers::{self, KEEP_HEADERS, KEEP_TYPES};
use crate::md5::md5;

/// Byte needle separating messages: `\nFrom ` (the leading LF comes from the
/// initial remainder in `run`).
const NEW_MESSAGE: &[u8] = b"\nFrom ";
/// Blank line ending a header block.
const HEADER_END: &[u8] = b"\n\n";
/// Envelope line kept verbatim at the top of each message.
const FROM_LINE: &str = "From ";

/// First occurrence of `needle` in `haystack`. Port of @std/bytes
/// `indexOfNeedle`; the streaming loop in `chunk` keeps the overall scan
/// linear because each search resumes after the previous match.
pub fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() {
        return Some(0);
    }
    if haystack.len() < needle.len() {
        return None;
    }
    haystack.windows(needle.len()).position(|w| w == needle)
}

pub struct Process<R: Read, W: Write> {
    reader: R,
    writer: W,
    attachments_dir: PathBuf,
    strip_attachments: bool,
    seen_messages: HashSet<String>,
}

impl<R: Read, W: Write> Process<R, W> {
    pub fn new(reader: R, writer: W, attachments_dir: PathBuf, strip_attachments: bool) -> Self {
        Process {
            reader,
            writer,
            attachments_dir,
            strip_attachments,
            seen_messages: HashSet::new(),
        }
    }

    /// Read the whole MBOX in 8 MiB chunks, splitting messages on `\nFrom `.
    pub fn run(&mut self) -> io::Result<()> {
        let mut raw = vec![0u8; 8 * 1024 * 1024];
        // The leading LF makes the first "From " line a needle match.
        let mut remainder: Vec<u8> = b"\n".to_vec();

        loop {
            let n = self.reader.read(&mut raw)?;
            if n == 0 {
                break;
            }
            remainder.extend_from_slice(&raw[..n]);
            let input = std::mem::take(&mut remainder);
            remainder = self.chunk(&input)?;
        }

        self.message(&remainder)
    }

    /// Emit every complete message in `input`; return the unconsumed tail.
    fn chunk(&mut self, input: &[u8]) -> io::Result<Vec<u8>> {
        let mut left = 0;
        loop {
            let Some(rel) = find_subslice(&input[left..], NEW_MESSAGE) else {
                break;
            };
            // TS: index = indexOfNeedle(input, NEW_MESSAGE, left) + 1, so the
            // slice ends just after the LF and the "From " line starts the
            // next slice.
            let index = left + rel + 1;
            self.message(&input[left..index])?;
            left = index;
        }
        Ok(input[left..].to_vec())
    }

    /// Filter one message: keep whitelisted headers, dedupe on their MD5,
    /// then process the body with the collected multipart boundaries.
    fn message(&mut self, input: &[u8]) -> io::Result<()> {
        if input.len() < 2 {
            return Ok(());
        }

        let header_end = find_subslice(input, HEADER_END)
            .ok_or_else(|| Error::new(ErrorKind::InvalidData, "Malformed header."))?;

        let headers_text = String::from_utf8_lossy(&input[..header_end]);
        let mut kept = String::new();
        let mut boundaries: Vec<String> = Vec::new();

        for header in headers::split_headers(&headers_text) {
            if header.starts_with(FROM_LINE) {
                kept.push_str(header);
                kept.push('\n');
                continue;
            }

            let key = headers::header_key(header).to_lowercase();
            if !KEEP_HEADERS.contains(&key.as_str()) {
                continue;
            }
            kept.push_str(header);
            kept.push('\n');

            if key == "content-type" && header.to_lowercase().contains("multipart/") {
                if let Some(v) = headers::param_value(header, "boundary").filter(|v| !v.is_empty())
                {
                    boundaries.push(v);
                }
            }
        }

        let hash = base64::encode(&md5(kept.as_bytes()));
        if !self.seen_messages.insert(hash) {
            return Ok(());
        }

        self.writer.write_all(kept.as_bytes())?;
        self.body(&input[header_end + 1..], &mut boundaries)
    }

    /// Walk MIME parts. `boundaries` is a stack: the last entry is the
    /// innermost multipart boundary currently being processed.
    fn body(&mut self, input: &[u8], boundaries: &mut Vec<String>) -> io::Result<()> {
        let Some(last) = boundaries.last() else {
            return self.writer.write_all(input).map(|_| ());
        };
        let separator = format!("\n--{last}");
        let sep_lf = format!("{separator}\n");

        let Some(start) = find_subslice(input, sep_lf.as_bytes()) else {
            boundaries.pop();
            return self.body(input, boundaries);
        };

        self.writer.write_all(&input[..start])?;

        let header_end = match find_subslice(&input[start..], HEADER_END) {
            Some(rel) => start + rel + 1,
            None => return Err(Error::new(ErrorKind::InvalidData, "Malformed part header.")),
        };

        let headers = &input[start..header_end];
        let headers_text = String::from_utf8_lossy(headers);

        let next = find_subslice(&input[header_end..], sep_lf.as_bytes()).map(|rel| header_end + rel);
        let mut end = next;
        if next.is_none() {
            // TS searches for the closing "--" from index 0, not from start.
            end = find_subslice(input, format!("{separator}--\n").as_bytes());
            boundaries.pop();
        }
        let end = end.ok_or_else(|| Error::new(ErrorKind::InvalidData, "No end in sight!!"))?;

        let mut content_transfer_encoding = String::new();
        let mut ext: Option<String> = None;
        let mut filename: Option<String> = None;

        for header in headers::split_headers(&headers_text) {
            let field_name = headers::header_key(header).to_lowercase();
            let value = headers::header_value(header);

            if field_name == "content-type" {
                if let Some(new_boundary) =
                    headers::param_value(header, "boundary").filter(|v| !v.is_empty())
                {
                    boundaries.push(new_boundary);
                    self.writer.write_all(headers)?;
                    return self.body(&input[header_end..], boundaries);
                }

                let media_type = value.split(';').next().unwrap_or("").trim();
                ext = media_type.splitn(2, '/').nth(1).map(str::to_string);
                if KEEP_TYPES.iter().any(|t| media_type.starts_with(t)) {
                    self.writer.write_all(&input[start..end])?;
                    return self.body(&input[end..], boundaries);
                }
            }

            if field_name == "content-transfer-encoding" {
                content_transfer_encoding = value.to_lowercase().trim().to_string();
            }

            if field_name == "content-disposition" {
                filename = headers::param_value(header, "filename");
            }
        }

        if content_transfer_encoding != "base64" {
            self.writer.write_all(&input[start..end])?;
            return self.body(&input[end..], boundaries);
        }

        // JS quirk preserved: `"untitled." + undefined` is "untitled.undefined".
        let filename = filename
            .filter(|f| !f.is_empty())
            .unwrap_or_else(|| format!("untitled.{}", ext.as_deref().unwrap_or("undefined")));

        let encoded = String::from_utf8_lossy(&input[header_end..end])
            .replace(|c: char| c.is_whitespace(), "");
        let binary = base64::decode(&encoded).map_err(|e| {
            Error::new(ErrorKind::InvalidData, format!("Invalid base64 attachment: {e}"))
        })?;

        let digest = md5(&binary);
        let dir = self.attachments_dir.join(base64::encode_url(&digest));
        std::fs::create_dir_all(&dir)?;
        std::fs::write(dir.join(&filename), &binary)?;

        // The TS "comment this out to strip attachments" becomes a flag.
        if !self.strip_attachments {
            self.writer.write_all(&input[start..end])?;
        }

        self.body(&input[end..], boundaries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn temp_dir() -> PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!(
            "mail-test-{}-{}",
            std::process::id(),
            n
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn run_filter(mbox: &[u8], strip: bool) -> (Vec<u8>, PathBuf) {
        let dir = temp_dir();
        let mut process = Process::new(Cursor::new(mbox.to_vec()), Vec::new(), dir.clone(), strip);
        process.run().unwrap();
        let out = process.writer;
        (out, dir)
    }

    const SIMPLE: &[u8] = b"From alice@example.com Mon Jun  1 10:00:00 2026\n\
        From: Alice <alice@example.com>\n\
        To: bob@example.com\n\
        Subject: Hello\n\
        X-Secret: drop me\n\
        Content-Type: text/plain\n\
        \n\
        body one\n";

    #[test]
    fn keeps_whitelisted_headers_and_drops_the_rest() {
        let (out, _dir) = run_filter(SIMPLE, false);
        let out = String::from_utf8(out).unwrap();
        assert!(out.contains("From alice@example.com Mon Jun  1 10:00:00 2026\n"));
        assert!(out.contains("Subject: Hello\n"));
        assert!(out.contains("Content-Type: text/plain\n"));
        assert!(!out.contains("X-Secret"));
        assert!(out.ends_with("\nbody one\n"));
    }

    #[test]
    fn dedupes_identical_messages() {
        let mut mbox = SIMPLE.to_vec();
        mbox.extend_from_slice(SIMPLE);
        let (out, _dir) = run_filter(&mbox, false);
        let out = String::from_utf8(out).unwrap();
        assert_eq!(out.matches("Subject: Hello").count(), 1);
    }

    const MULTIPART: &[u8] = b"From carol@example.com Mon Jun  1 11:00:00 2026\n\
        From: Carol <carol@example.com>\n\
        Subject: Multi\n\
        Content-Type: multipart/mixed; boundary=\"BOUND\"\n\
        \n\
        --BOUND\n\
        Content-Type: text/plain\n\
        \n\
        hello part\n\
        --BOUND\n\
        Content-Type: application/octet-stream; name=\"a.bin\"\n\
        Content-Transfer-Encoding: base64\n\
        Content-Disposition: attachment; filename=\"a.bin\"\n\
        \n\
        aGVsbG8=\n\
        --BOUND--\n";

    #[test]
    fn multipart_keeps_text_part_and_extracts_base64_attachment() {
        let (out, dir) = run_filter(MULTIPART, false);
        let out = String::from_utf8(out).unwrap();
        assert!(out.contains("Content-Type: multipart/mixed; boundary=\"BOUND\"\n"));
        assert!(out.contains("hello part"));
        // The base64 part stays in the output by default...
        assert!(out.contains("aGVsbG8="));
        // ...and is extracted, content-addressed by the MD5 of "hello".
        let digest = base64::encode_url(&md5(b"hello"));
        let extracted = std::fs::read(dir.join(&digest).join("a.bin")).unwrap();
        assert_eq!(extracted, b"hello");
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn strip_attachments_removes_base64_part_but_still_extracts() {
        let (out, dir) = run_filter(MULTIPART, true);
        let out = String::from_utf8(out).unwrap();
        assert!(!out.contains("aGVsbG8="));
        assert!(out.contains("hello part"));
        let digest = base64::encode_url(&md5(b"hello"));
        assert!(dir.join(&digest).join("a.bin").is_file());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn malformed_header_is_an_error() {
        let dir = temp_dir();
        let mut process = Process::new(
            Cursor::new(b"From a@b Mon\nSubject: no blank line".to_vec()),
            Vec::new(),
            dir.clone(),
            false,
        );
        let err = process.run().unwrap_err();
        assert_eq!(err.kind(), ErrorKind::InvalidData);
        assert_eq!(err.to_string(), "Malformed header.");
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn find_subslice_basics() {
        assert_eq!(find_subslice(b"a\nFrom b", b"\nFrom "), Some(1));
        assert_eq!(find_subslice(b"nothing here", b"\nFrom "), None);
        assert_eq!(find_subslice(b"short", b"longer needle"), None);
        assert_eq!(find_subslice(b"", b""), Some(0));
    }
}
