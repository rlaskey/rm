use std::io::{Error, ErrorKind};
use std::path::PathBuf;

use clap::Parser;

/// Filter an MBOX stream: keep a whitelist of headers, dedupe messages, and
/// extract base64 attachments to a content-addressed directory.
#[derive(Debug, Parser)]
#[command(after_help = "Example: mail --input 2026-06.mbox --output filtered.mbox")]
pub struct Cli {
    /// MBOX file to read (reads STDIN when omitted)
    #[arg(long)]
    pub input: Option<PathBuf>,

    /// File to write the filtered MBOX to (writes STDOUT when omitted)
    #[arg(long)]
    pub output: Option<PathBuf>,

    /// Directory that receives extracted attachments, named by content MD5
    #[arg(long, default_value = "/tmp/content")]
    pub attachments: PathBuf,

    /// Drop base64 attachments from the output (they are still extracted)
    #[arg(long)]
    pub strip_attachments: bool,
}

impl Cli {
    pub fn validate(&self) -> std::io::Result<()> {
        if let Some(input) = &self.input {
            if !input.is_file() {
                return Err(Error::new(
                    ErrorKind::NotFound,
                    format!("{} is not a file.", input.display()),
                ));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_input_file() {
        let cli = Cli {
            input: Some(PathBuf::from("/definitely/not/here-mail-test.mbox")),
            output: None,
            attachments: PathBuf::from("/tmp/content"),
            strip_attachments: false,
        };
        let err = cli.validate().unwrap_err();
        assert_eq!(err.kind(), ErrorKind::NotFound);
    }

    #[test]
    fn accepts_no_input() {
        let cli = Cli {
            input: None,
            output: None,
            attachments: PathBuf::from("/tmp/content"),
            strip_attachments: false,
        };
        cli.validate().unwrap();
    }
}
