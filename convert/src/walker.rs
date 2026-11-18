use std::ffi::OsStr;
use std::io::{Error, ErrorKind};
use std::path::Path;

/// Walk `subdirectory` under `source`, mirroring the directory structure into
/// `target` and calling `on_file(source_path, target_dir)` for every regular
/// file. Symlinks are not followed.
pub fn walk(
    source: &Path,
    target: &Path,
    subdirectory: &OsStr,
    mut on_file: impl FnMut(&Path, &Path) -> std::io::Result<()>,
) -> std::io::Result<()> {
    let root = source
        .join(subdirectory)
        .canonicalize()
        .map_err(|_| Error::new(ErrorKind::NotFound, "Could not find the subdirectory."))?;
    if !root.is_dir() {
        return Err(Error::new(
            ErrorKind::NotFound,
            "Could not find the subdirectory.",
        ));
    }
    if root == source {
        return Err(Error::new(
            ErrorKind::InvalidInput,
            "You must filter to a subdirectory.",
        ));
    }
    if !root.starts_with(source) {
        return Err(Error::new(
            ErrorKind::InvalidInput,
            "You cannot break out of the source directory.",
        ));
    }
    walk_dir(source, target, &root, &mut on_file)
}

fn walk_dir(
    source: &Path,
    target: &Path,
    dir: &Path,
    on_file: &mut dyn FnMut(&Path, &Path) -> std::io::Result<()>,
) -> std::io::Result<()> {
    let rel = dir
        .strip_prefix(source)
        .expect("walk_dir: directory outside source");
    let target_dir = target.join(rel);
    std::fs::create_dir_all(&target_dir).map_err(|e| {
        Error::new(
            e.kind(),
            format!("failed to create directory {}: {e}", target_dir.display()),
        )
    })?;

    let mut subdirs = Vec::new();
    let mut files = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|e| {
        Error::new(
            e.kind(),
            format!("failed to read directory {}: {e}", dir.display()),
        )
    })? {
        let entry = entry.map_err(|e| {
            Error::new(
                e.kind(),
                format!("failed to read an entry in {}: {e}", dir.display()),
            )
        })?;
        let path = entry.path();
        // file_type() does not follow symlinks, so symlinks are skipped
        // entirely rather than converted through to their target.
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            subdirs.push(path);
        } else if file_type.is_file() {
            files.push(path);
        }
    }

    // read_dir order is filesystem-dependent; sort so files are visited in a
    // deterministic order.
    files.sort();
    subdirs.sort();

    for path in files {
        on_file(&path, &target_dir)?;
    }
    for path in subdirs {
        walk_dir(source, target, &path, on_file)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    /// Builds:
    /// source/
    ///   outside.txt
    ///   sub/
    ///     a.txt
    ///     empty/
    ///     nested/
    ///       b.txt
    ///
    /// Returns the TempDirs (which delete themselves on drop) plus the
    /// canonicalized paths, matching the canonicalized paths Cli produces
    /// (e.g. /var vs /private/var on macOS).
    fn setup() -> (tempfile::TempDir, tempfile::TempDir, PathBuf, PathBuf) {
        let source_dir = tempfile::tempdir().unwrap();
        let target_dir = tempfile::tempdir().unwrap();
        let source = source_dir.path().canonicalize().unwrap();
        let target = target_dir.path().canonicalize().unwrap();
        std::fs::create_dir_all(source.join("sub/nested")).unwrap();
        std::fs::create_dir_all(source.join("sub/empty")).unwrap();
        std::fs::write(source.join("sub/a.txt"), b"a").unwrap();
        std::fs::write(source.join("sub/nested/b.txt"), b"b").unwrap();
        std::fs::write(source.join("outside.txt"), b"x").unwrap();
        (source_dir, target_dir, source, target)
    }

    #[test]
    fn walks_files_recursively_and_mirrors_dirs() {
        let (_source_dir, _target_dir, source, target) = setup();
        let mut seen: Vec<(PathBuf, PathBuf)> = Vec::new();
        walk(&source, &target, OsStr::new("sub"), |path, dir| {
            seen.push((path.to_path_buf(), dir.to_path_buf()));
            Ok(())
        })
        .unwrap();
        seen.sort();
        assert_eq!(
            seen,
            vec![
                (source.join("sub/a.txt"), target.join("sub")),
                (source.join("sub/nested/b.txt"), target.join("sub/nested")),
            ]
        );
        // Empty directories are mirrored too.
        assert!(target.join("sub/empty").is_dir());
    }

    #[test]
    fn visits_files_in_sorted_order() {
        let (_source_dir, _target_dir, source, target) = setup();
        std::fs::write(source.join("sub/z.txt"), b"z").unwrap();
        std::fs::write(source.join("sub/m.txt"), b"m").unwrap();
        let mut seen = Vec::new();
        walk(&source, &target, OsStr::new("sub"), |path, _| {
            seen.push(path.file_name().unwrap().to_string_lossy().into_owned());
            Ok(())
        })
        .unwrap();
        // Files of a directory are visited sorted, before its subdirectories.
        assert_eq!(seen, vec!["a.txt", "m.txt", "z.txt", "b.txt"]);
    }

    #[test]
    fn rejects_missing_subdirectory() {
        let (_source_dir, _target_dir, source, target) = setup();
        let err = walk(&source, &target, OsStr::new("nope"), |_, _| Ok(())).unwrap_err();
        assert_eq!(err.kind(), ErrorKind::NotFound);
    }

    #[test]
    fn rejects_source_root_itself() {
        let (_source_dir, _target_dir, source, target) = setup();
        for sub in [".", ""] {
            let err = walk(&source, &target, OsStr::new(sub), |_, _| Ok(())).unwrap_err();
            assert_eq!(err.kind(), ErrorKind::InvalidInput);
        }
    }

    #[test]
    fn rejects_breaking_out_of_source() {
        let (_source_dir, _target_dir, source, target) = setup();
        let err = walk(&source, &target, OsStr::new("../"), |_, _| Ok(())).unwrap_err();
        assert_eq!(err.kind(), ErrorKind::InvalidInput);
    }

    #[test]
    fn propagates_callback_errors() {
        let (_source_dir, _target_dir, source, target) = setup();
        let err = walk(&source, &target, OsStr::new("sub"), |_, _| {
            Err(std::io::Error::other("boom"))
        })
        .unwrap_err();
        assert_eq!(err.to_string(), "boom");
    }

    #[cfg(unix)]
    #[test]
    fn skips_symlinks() {
        let (_source_dir, _target_dir, source, target) = setup();
        std::os::unix::fs::symlink(source.join("outside.txt"), source.join("sub/link.txt"))
            .unwrap();
        let mut seen = Vec::new();
        walk(&source, &target, OsStr::new("sub"), |path, _| {
            seen.push(path.to_path_buf());
            Ok(())
        })
        .unwrap();
        assert!(!seen.iter().any(|p| p.ends_with("link.txt")));
        assert_eq!(seen.len(), 2);
    }
}
