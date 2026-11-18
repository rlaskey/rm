use std::ffi::{OsStr, OsString};
use std::io::{Error, ErrorKind};
use std::path::{Path, PathBuf};

use clap::Parser;

/// Convert a directory of media files.
#[derive(Debug, Parser)]
#[command(after_help = "Example: convert '/originals' '/converted' 'only/these/files'")]
pub struct Cli {
    /// Source directory (e.g. '/originals')
    pub source: PathBuf,
    /// Target directory (e.g. '/converted')
    pub target: PathBuf,
    /// Subdirectory to convert (e.g. 'only/these/files')
    pub subdirectory: OsString,
}

impl Cli {
    /// Build from raw arguments and validate them. Used by tests; the binary
    /// itself goes through [`Cli::parse`] + [`Cli::validate`].
    pub fn new(source: &OsStr, target: &OsStr, subdirectory: &OsStr) -> std::io::Result<Cli> {
        let mut cli = Cli {
            source: PathBuf::from(source),
            target: PathBuf::from(target),
            subdirectory: subdirectory.to_os_string(),
        };
        cli.validate()?;
        Ok(cli)
    }

    /// Canonicalize the directories and check the arguments are valid: both
    /// directories exist, neither contains the other, and a subdirectory is
    /// given.
    pub fn validate(&mut self) -> std::io::Result<()> {
        self.source = canonical_dir(&self.source, "Source")?;
        self.target = canonical_dir(&self.target, "Target")?;
        if self.source.starts_with(&self.target) {
            return Err(Error::new(
                ErrorKind::InvalidInput,
                "Source cannot be inside the target.",
            ));
        }
        if self.target.starts_with(&self.source) {
            return Err(Error::new(
                ErrorKind::InvalidInput,
                "Target cannot be inside the source.",
            ));
        }
        if self.subdirectory.is_empty() {
            return Err(Error::new(
                ErrorKind::InvalidInput,
                "You must filter to a subdirectory.",
            ));
        }
        Ok(())
    }
}

fn canonical_dir(path: &Path, label: &str) -> std::io::Result<PathBuf> {
    let canonical = path
        .canonicalize()
        .map_err(|_| Error::new(ErrorKind::NotFound, format!("{label} must exist.")))?;
    if !canonical.is_dir() {
        return Err(Error::new(
            ErrorKind::InvalidInput,
            format!("{label} must be a directory."),
        ));
    }
    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_source() {
        let target = tempfile::tempdir().unwrap();
        let err = Cli::new(
            OsStr::new("/definitely/not/here-convert-test"),
            target.path().as_os_str(),
            OsStr::new("sub"),
        )
        .unwrap_err();
        assert_eq!(err.kind(), ErrorKind::NotFound);
    }

    #[test]
    fn rejects_file_as_source() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.txt");
        std::fs::write(&file, b"x").unwrap();
        let target = tempfile::tempdir().unwrap();
        let err = Cli::new(
            file.as_os_str(),
            target.path().as_os_str(),
            OsStr::new("sub"),
        )
        .unwrap_err();
        assert_eq!(err.kind(), ErrorKind::InvalidInput);
    }

    #[test]
    fn rejects_target_inside_source() {
        let source = tempfile::tempdir().unwrap();
        let target = source.path().join("inner");
        std::fs::create_dir_all(&target).unwrap();
        let err = Cli::new(
            source.path().as_os_str(),
            target.as_os_str(),
            OsStr::new("sub"),
        )
        .unwrap_err();
        assert_eq!(err.kind(), ErrorKind::InvalidInput);
    }

    #[test]
    fn rejects_source_inside_target() {
        let target = tempfile::tempdir().unwrap();
        let source = target.path().join("inner");
        std::fs::create_dir_all(&source).unwrap();
        let err = Cli::new(
            source.as_os_str(),
            target.path().as_os_str(),
            OsStr::new("sub"),
        )
        .unwrap_err();
        assert_eq!(err.kind(), ErrorKind::InvalidInput);
    }

    #[test]
    fn rejects_empty_subdirectory() {
        let source = tempfile::tempdir().unwrap();
        let target = tempfile::tempdir().unwrap();
        let err = Cli::new(
            source.path().as_os_str(),
            target.path().as_os_str(),
            OsStr::new(""),
        )
        .unwrap_err();
        assert_eq!(err.kind(), ErrorKind::InvalidInput);
    }

    #[test]
    fn accepts_valid_args_and_canonicalizes() {
        let source = tempfile::tempdir().unwrap();
        let target = tempfile::tempdir().unwrap();
        let cli = Cli::new(
            source.path().as_os_str(),
            target.path().as_os_str(),
            OsStr::new("sub"),
        )
        .unwrap();
        assert_eq!(cli.source, source.path().canonicalize().unwrap());
        assert_eq!(cli.target, target.path().canonicalize().unwrap());
        assert_eq!(cli.subdirectory, OsString::from("sub"));
    }
}
