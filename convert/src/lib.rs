pub mod cli;
pub mod converters;
pub mod walker;

use std::path::Path;
use std::time::Instant;

use crate::cli::Cli;
use crate::converters::{Converter, SkipDecision};

/// Walk the requested subdirectory of the source, converting every supported
/// file into the mirrored directory under the target.
pub fn run(cli: &Cli) -> std::io::Result<()> {
    walker::walk(
        &cli.source,
        &cli.target,
        &cli.subdirectory,
        |source_path, target_dir| convert_file(&cli.target, source_path, target_dir),
    )
}

/// Convert one file into `target_dir`, printing the result.
fn convert_file(target_root: &Path, source_path: &Path, target_dir: &Path) -> std::io::Result<()> {
    let started = Instant::now();

    let converter = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .and_then(Converter::from_extension);
    let Some(converter) = converter else {
        println!(
            "NOTE: skipping {}. Not a supported file format.",
            source_path.display()
        );
        return Ok(());
    };

    let mut target_name = source_path.file_stem().unwrap_or_default().to_os_string();
    target_name.push(converter.suffix());
    let target_path = target_dir.join(target_name);

    match converter.check_skip(source_path, &target_path) {
        SkipDecision::Convert => {}
        SkipDecision::Skip => return Ok(()),
        SkipDecision::SkipWithNote(note) => {
            println!();
            println!("{note}");
            return Ok(());
        }
    }

    if let Err(err) = converter.run(source_path, &target_path) {
        if target_path.exists() {
            println!("NOTE: we got an error. Deleting {}.", target_path.display());
            // Cleanup failure must not mask the original error.
            if let Err(e) = std::fs::remove_file(&target_path) {
                eprintln!("warning: failed to delete {}: {e}", target_path.display());
            }
        }
        return Err(err);
    }

    let rel = target_path
        .strip_prefix(target_root)
        .expect("convert_file: target outside target dir");
    println!(
        "- created {} in {:.3} seconds.",
        rel.display(),
        started.elapsed().as_secs_f64()
    );
    Ok(())
}
