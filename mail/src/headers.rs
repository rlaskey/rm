//! RFC 5322 header helpers: splitting, unfolding, and `key=value` parameter
//! parsing. Ports of the regexes in the original main.ts:
//!   HEADER_SPLIT = /\n(?!\s)/   HEADER_JOIN = /\n[ \t]+/g   ESCAPE = /\\(.)/g

/// Media types whose MIME parts are kept; everything else is dropped
/// unless it is base64 (which is extracted as an attachment).
pub const KEEP_TYPES: [&str; 3] = ["text/", "message/", "application/ics"];

/// Header fields kept in the output, lowercased.
pub const KEEP_HEADERS: &[&str] = &[
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
];

/// Split a header block on every `\n` NOT followed by whitespace, i.e. keep
/// folded continuation lines attached to their header. Matches JS
/// `text.split(/\n(?!\s)/)`, including a trailing empty piece when the text
/// ends with a split point.
pub fn split_headers(text: &str) -> Vec<&str> {
    let bytes = text.as_bytes();
    let mut out = Vec::new();
    let mut start = 0;
    for i in 0..bytes.len() {
        if bytes[i] == b'\n' {
            // b'\n' never occurs inside a multi-byte UTF-8 sequence, so
            // text[i + 1..] is a valid char boundary (or the end).
            let next_is_ws = text[i + 1..]
                .chars()
                .next()
                .is_some_and(|c| c.is_whitespace());
            if !next_is_ws {
                out.push(&text[start..i]);
                start = i + 1;
            }
        }
    }
    out.push(&text[start..]);
    out
}

/// Unfold continuation lines: replace every `\n` followed by spaces/tabs
/// (plus those spaces/tabs) with a single space. Matches JS `text.replace(/\n[ \t]+/g, " ")`.
pub fn unfold(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'\n' && matches!(bytes.get(i + 1), Some(b' ') | Some(b'\t')) {
            out.push(' ');
            i += 1;
            while matches!(bytes.get(i), Some(b' ') | Some(b'\t')) {
                i += 1;
            }
        } else {
            let ch = text[i..].chars().next().expect("i is a char boundary");
            out.push(ch);
            i += ch.len_utf8();
        }
    }
    out
}

/// The header field name: everything before the first `:`. When there is no
/// colon, the original JS `header.slice(0, header.indexOf(":"))` with
/// `indexOf` returning -1 yields all but the last character.
pub fn header_key(header: &str) -> &str {
    match header.find(':') {
        Some(i) => &header[..i],
        None => {
            let mut end = header.len().saturating_sub(1);
            while !header.is_char_boundary(end) {
                end -= 1;
            }
            &header[..end]
        }
    }
}

/// The header value: everything after the first `:`, or "" when absent
/// (JS `header.slice(fieldName.length + 1)` past the end yields "").
pub fn header_value(header: &str) -> &str {
    match header.find(':') {
        Some(i) => &header[i + 1..],
        None => "",
    }
}

/// Remove quoted-pair escapes: JS `s.replace(/\\(.)/g, "$1")`. A backslash
/// before a line terminator (which `.` does not match) or at the end of the
/// string is kept literally.
fn unescape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '\\' {
            match chars.next() {
                Some(n) if !matches!(n, '\n' | '\r' | '\u{2028}' | '\u{2029}') => out.push(n),
                Some(n) => {
                    out.push('\\');
                    out.push(n);
                }
                None => out.push('\\'),
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// Look up a `key=value` parameter in a header value, e.g. `boundary` in a
/// Content-Type. Port of `Process.v`: the input is unfolded, split on `;`,
/// each piece trimmed, and the key compared after lowercasing — so `key` must
/// be passed lowercase. Quoted values are unquoted and unescaped.
pub fn param_value(input: &str, key: &str) -> Option<String> {
    let unfolded = unfold(input);
    for kv in unfolded.split(';').map(str::trim) {
        let Some(eq) = kv.find('=') else { continue };
        let (k, raw_v) = (&kv[..eq], kv[eq + 1..].trim());
        if k.to_lowercase() != key {
            continue;
        }
        if raw_v.starts_with('"') && raw_v.ends_with('"') {
            // JS slice(1, -1) on a lone '"' yields "".
            let inner = if raw_v.len() >= 2 {
                &raw_v[1..raw_v.len() - 1]
            } else {
                ""
            };
            return Some(unescape(inner));
        }
        return Some(raw_v.to_string());
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Ported 1:1 from main.test.ts.
    #[test]
    fn param_value_cases() {
        assert_eq!(param_value("foo=bar", "foo").as_deref(), Some("bar"));

        // always ask for lowercase
        assert_eq!(param_value("foo=bar", "FOO"), None);

        assert_eq!(param_value("a=1;b=2;c=3", "b").as_deref(), Some("2"));
        assert_eq!(param_value("a=1;b= 2;c=3", "b").as_deref(), Some("2"));
        assert_eq!(param_value("a=1; b=2 ; c=3", "b").as_deref(), Some("2"));
        assert_eq!(param_value("a=\"1\";b=2;c=3", "a").as_deref(), Some("1"));

        assert_eq!(param_value("a=\"1=2\"", "a").as_deref(), Some("1=2"));

        assert_eq!(
            param_value("a=1;b=2;c=\"3\\\"\"", "c").as_deref(),
            Some("3\"")
        );
        assert_eq!(
            param_value("a=1;b=2;c=\"3\"\"", "c").as_deref(),
            Some("3\"")
        );
    }

    #[test]
    fn split_keeps_folded_lines() {
        assert_eq!(
            split_headers("A: 1\n\tcontinued\nB: 2"),
            vec!["A: 1\n\tcontinued", "B: 2"]
        );
        // "\n\n" is not a split point (next char is whitespace).
        assert_eq!(split_headers("A: 1\n\nB: 2"), vec!["A: 1\n", "B: 2"]);
        // Trailing newline splits and yields a trailing empty piece, like JS.
        assert_eq!(split_headers("A: 1\n"), vec!["A: 1", ""]);
    }

    #[test]
    fn unfold_replaces_newline_plus_ws_with_space() {
        assert_eq!(unfold("a\n\tb"), "a b");
        assert_eq!(unfold("a\n  \t b"), "a b");
        // A newline not followed by space/tab is left alone.
        assert_eq!(unfold("a\nb"), "a\nb");
        assert_eq!(unfold("a\n"), "a\n");
    }

    #[test]
    fn header_key_and_value() {
        assert_eq!(header_key("Content-Type: text/html"), "Content-Type");
        assert_eq!(header_value("Content-Type: text/html"), " text/html");
        // No colon: JS slice(0, -1) drops the last char; value is "".
        assert_eq!(header_key("NoColon"), "NoColo");
        assert_eq!(header_value("NoColon"), "");
    }

    #[test]
    fn param_value_unfolds_and_unquotes() {
        assert_eq!(
            param_value("multipart/mixed; \n\tboundary=\"B 1\"", "boundary").as_deref(),
            Some("B 1")
        );
        assert_eq!(param_value("x; a=\"q\\\\w\"", "a").as_deref(), Some("q\\w"));
        assert_eq!(param_value("a=", "a").as_deref(), Some(""));
        assert_eq!(param_value("novalue", "novalue"), None);
    }
}
