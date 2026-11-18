use std::io::{Error, ErrorKind};
use std::path::Path;
use std::process::{Command, Stdio};

use serde::{Deserialize, Deserializer};

const AVIF_Q: u8 = 79;

/// A conversion this tool can perform, selected by source file extension.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Converter {
    Av1,
    Avif,
    Copy3gp,
    CopyAvif,
    CopyHeic,
    Raw,
}

/// What to do with a source file, decided by [`Converter::check_skip`].
#[derive(Debug, PartialEq, Eq)]
pub enum SkipDecision {
    /// Target is missing or empty: run the conversion.
    Convert,
    /// Target exists and is non-empty: leave it alone.
    Skip,
    /// Skip, but show the user a note (e.g. the target is larger than the source).
    SkipWithNote(String),
}

impl Converter {
    pub fn from_extension(ext: &str) -> Option<Converter> {
        // Extensions are ASCII, so an ASCII case-insensitive compare avoids
        // allocating a lowercased copy of the extension.
        if ext.eq_ignore_ascii_case("3gp") {
            Some(Converter::Copy3gp)
        } else if ext.eq_ignore_ascii_case("avif") {
            Some(Converter::CopyAvif)
        } else if ext.eq_ignore_ascii_case("cr2") {
            Some(Converter::Raw)
        } else if ext.eq_ignore_ascii_case("heic") {
            Some(Converter::CopyHeic)
        } else if ext.eq_ignore_ascii_case("jpeg")
            || ext.eq_ignore_ascii_case("jpg")
            || ext.eq_ignore_ascii_case("png")
        {
            Some(Converter::Avif)
        } else if ["mkv", "mov", "mp4", "mpg", "mts"]
            .iter()
            .any(|e| ext.eq_ignore_ascii_case(e))
        {
            Some(Converter::Av1)
        } else {
            None
        }
    }

    /// Extension of the converted file.
    pub fn suffix(&self) -> &'static str {
        match self {
            Converter::Av1 => ".mp4",
            Converter::Avif | Converter::CopyAvif | Converter::Raw => ".avif",
            Converter::Copy3gp => ".3gp",
            Converter::CopyHeic => ".heic",
        }
    }

    /// Decide what to do with a source file, given its target path.
    pub fn check_skip(&self, source: &Path, target: &Path) -> SkipDecision {
        let Ok(target_meta) = std::fs::metadata(target) else {
            return SkipDecision::Convert;
        };
        if !target_meta.is_file() || target_meta.len() == 0 {
            return SkipDecision::Convert;
        }
        if *self == Converter::Av1 {
            let source_len = std::fs::metadata(source).map(|m| m.len()).unwrap_or(0);
            if target_meta.len() > source_len {
                let note = format!(
                    "## {} is larger than {}.\nrm {}\ncp {} {}",
                    target.display(),
                    source.display(),
                    target.display(),
                    source.display(),
                    target.parent().unwrap_or(Path::new("")).display()
                );
                return SkipDecision::SkipWithNote(note);
            }
        }
        SkipDecision::Skip
    }

    pub fn run(&self, source: &Path, target: &Path) -> std::io::Result<()> {
        match self {
            Converter::Av1 => run_av1(source, target),
            Converter::Avif => run_avif(source, target),
            Converter::Copy3gp | Converter::CopyAvif | Converter::CopyHeic => {
                std::fs::copy(source, target).map_err(|e| {
                    Error::new(
                        e.kind(),
                        format!(
                            "failed to copy {} to {}: {e}",
                            source.display(),
                            target.display()
                        ),
                    )
                })?;
                Ok(())
            }
            Converter::Raw => run_raw(source, target),
        }
    }
}

/// The subset of `ffprobe -of json` output this tool reads.
#[derive(Deserialize)]
struct Probe {
    streams: Option<Vec<Stream>>,
}

#[derive(Deserialize)]
struct Stream {
    codec_type: Option<String>,
    codec_name: Option<String>,
    pix_fmt: Option<String>,
    #[serde(default, deserialize_with = "de_u64_from_str")]
    bit_rate: Option<u64>,
}

/// ffprobe emits bit_rate as a JSON string ("116307", or "N/A" when unknown),
/// so parse it into an integer; missing or unparseable values become None.
fn de_u64_from_str<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: Deserializer<'de>,
{
    Ok(Option::<String>::deserialize(deserializer)?.and_then(|s| s.parse().ok()))
}

/// Re-encode video to AV1 with ffmpeg, copying streams that are already
/// AV1 (or 10-bit) and re-encoding audio that is PCM or over 320 kbps.
fn run_av1(source: &Path, target: &Path) -> std::io::Result<()> {
    let output = Command::new("ffprobe")
        .args(["-v", "warning"])
        .args([
            "-show_entries",
            "stream=codec_type,codec_name,pix_fmt,bit_rate",
        ])
        .args(["-of", "json"])
        .arg(source)
        .output()
        .map_err(|e| {
            Error::new(
                e.kind(),
                format!("failed to run ffprobe on {}: {e}", source.display()),
            )
        })?;
    if !output.status.success() {
        return Err(Error::other(format!(
            "ffprobe failed on {}: {}",
            source.display(),
            String::from_utf8_lossy(&output.stderr)
        )));
    }
    let probe: Probe = serde_json::from_slice(&output.stdout).map_err(|e| {
        Error::new(
            ErrorKind::InvalidData,
            format!(
                "failed to parse ffprobe output for {}: {e}",
                source.display()
            ),
        )
    })?;
    let streams = probe.streams.ok_or_else(|| {
        Error::other(format!(
            "ffprobe returned no streams for {}",
            source.display()
        ))
    })?;

    let status = Command::new("ffmpeg")
        .arg("-nostdin")
        .arg("-i")
        .arg(source)
        .args(["-map_metadata", "0"])
        .args(["-movflags", "+faststart"])
        .args(audio_args(&streams))
        .args(video_args(&streams))
        .arg(target)
        .status()
        .map_err(|e| {
            Error::new(
                e.kind(),
                format!("failed to run ffmpeg on {}: {e}", source.display()),
            )
        })?;
    if !status.success() {
        return Err(Error::other(format!(
            "ffmpeg failed on {}",
            source.display()
        )));
    }
    Ok(())
}

/// ffmpeg audio arguments: copy, unless the stream is PCM or over 320 kbps,
/// in which case re-encode to Opus at 256 kbps.
fn audio_args(streams: &[Stream]) -> Vec<String> {
    let mut args = Vec::new();
    let mut i = 0;
    for stream in streams {
        if stream.codec_type.as_deref() != Some("audio") {
            continue;
        }
        let codec_name = stream.codec_name.as_deref().unwrap_or("");
        args.push(format!("-c:a:{i}"));
        if codec_name.starts_with("pcm") || stream.bit_rate.unwrap_or(0) > 320_000 {
            args.push("libopus".into());
            args.push(format!("-b:a:{i}"));
            args.push("256k".into());
        } else {
            args.push("copy".into());
        }
        // The specifier index counts every audio stream, not just copied ones.
        i += 1;
    }
    args
}

/// ffmpeg video arguments: copy AV1 and 10-bit streams, re-encode the rest
/// to AV1.
fn video_args(streams: &[Stream]) -> Vec<String> {
    let mut args = Vec::new();
    let mut i = 0;
    for stream in streams {
        if stream.codec_type.as_deref() != Some("video") {
            continue;
        }
        let codec_name = stream.codec_name.as_deref().unwrap_or("");
        let pix_fmt = stream.pix_fmt.as_deref().unwrap_or("");
        args.push(format!("-c:v:{i}"));
        if codec_name == "av1" || pix_fmt.contains("10") {
            args.push("copy".into());
        } else {
            args.push("libsvtav1".into());
        }
        // The specifier index counts every video stream, not just encoded ones.
        i += 1;
    }
    args
}

/// Convert an image to AVIF with libvips.
fn run_avif(source: &Path, target: &Path) -> std::io::Result<()> {
    let mut target_arg = target.as_os_str().to_os_string();
    target_arg.push(format!("[Q={AVIF_Q}]"));
    let status = Command::new("vips")
        .arg("copy")
        .arg(source)
        .arg(&target_arg)
        .status()
        .map_err(|e| {
            Error::new(
                e.kind(),
                format!("failed to run vips on {}: {e}", source.display()),
            )
        })?;
    if !status.success() {
        return Err(Error::other(format!("vips failed on {}", source.display())));
    }
    Ok(())
}

/// A child process that is killed and reaped when the guard is dropped, so no
/// exit path — including `?` early returns — can leak a running child or a
/// zombie. `std::process::Child`'s own Drop deliberately does nothing, so this
/// guard is what makes the cleanup automatic.
struct KillOnDrop(std::process::Child);

impl Drop for KillOnDrop {
    fn drop(&mut self) {
        // kill() fails if the child already exited, and wait() then just
        // returns the cached exit status; both errors are fine to ignore.
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

/// Convert a camera RAW file: dcraw pipes into vips, then exiftool copies
/// the metadata over.
fn run_raw(source: &Path, target: &Path) -> std::io::Result<()> {
    let mut dcraw = KillOnDrop(
        Command::new("dcraw")
            .arg("-c")
            .arg(source)
            .stdout(Stdio::piped())
            .spawn()
            .map_err(|e| {
                Error::new(
                    e.kind(),
                    format!("failed to run dcraw on {}: {e}", source.display()),
                )
            })?,
    );
    let dcraw_stdout = dcraw.0.stdout.take().expect("dcraw stdout was piped");

    let mut target_arg = target.as_os_str().to_os_string();
    target_arg.push(format!("[Q={AVIF_Q}]"));
    // If this spawn fails, dcraw is killed and reaped by KillOnDrop on return.
    let vips = Command::new("vips")
        .arg("copy")
        .arg("stdin")
        .arg(&target_arg)
        .stdin(Stdio::from(dcraw_stdout))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            Error::new(
                e.kind(),
                format!("failed to run vips on {}: {e}", source.display()),
            )
        })?;

    // The parent's copy of dcraw's stdout was moved into vips's stdin, so
    // dcraw gets EPIPE if vips exits first.
    let output = vips
        .wait_with_output()
        .map_err(|e| Error::new(e.kind(), format!("failed to wait on vips: {e}")))?;
    if !output.status.success() {
        // dcraw is killed and reaped by KillOnDrop when we return here.
        return Err(Error::other(format!(
            "vips failed, w/ {}; {:?}",
            source.display(),
            output
        )));
    }
    let status = dcraw
        .0
        .wait()
        .map_err(|e| Error::new(e.kind(), format!("failed to wait on dcraw: {e}")))?;
    if !status.success() {
        return Err(Error::other(format!(
            "dcraw failed, w/ {}.",
            source.display()
        )));
    }

    let status = Command::new("exiftool")
        .args(["-q", "-overwrite_original", "-tagsfromfile"])
        .arg(source)
        .args(["-all:all"])
        .arg(target)
        .status()
        .map_err(|e| {
            Error::new(
                e.kind(),
                format!("failed to run exiftool on {}: {e}", source.display()),
            )
        })?;
    if !status.success() {
        return Err(Error::other(format!(
            "exiftool failed on {}",
            source.display()
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_stream(
        codec_type: &str,
        codec_name: Option<&str>,
        pix_fmt: Option<&str>,
        bit_rate: Option<u64>,
    ) -> Stream {
        Stream {
            codec_type: Some(codec_type.to_string()),
            codec_name: codec_name.map(str::to_string),
            pix_fmt: pix_fmt.map(str::to_string),
            bit_rate,
        }
    }

    #[test]
    fn registry_lookup() {
        assert_eq!(Converter::from_extension("mp4"), Some(Converter::Av1));
        assert_eq!(Converter::from_extension("jpg"), Some(Converter::Avif));
        assert_eq!(Converter::from_extension("cr2"), Some(Converter::Raw));
        assert_eq!(Converter::from_extension("txt"), None);
        assert_eq!(Converter::from_extension("MP4"), Some(Converter::Av1));
        assert_eq!(Converter::from_extension("JPG"), Some(Converter::Avif));
        assert_eq!(Converter::Av1.suffix(), ".mp4");
        assert_eq!(Converter::Copy3gp.suffix(), ".3gp");
        assert_eq!(Converter::Raw.suffix(), ".avif");
    }

    #[test]
    fn audio_copy_for_low_bitrate() {
        let streams = vec![
            make_stream("video", Some("h264"), Some("yuv420p"), Some(23_968)),
            make_stream("audio", Some("aac"), None, Some(116_307)),
        ];
        assert_eq!(audio_args(&streams), vec!["-c:a:0", "copy"]);
    }

    #[test]
    fn audio_opus_for_pcm() {
        let streams = vec![make_stream(
            "audio",
            Some("pcm_s16le"),
            None,
            Some(1_411_200),
        )];
        assert_eq!(
            audio_args(&streams),
            vec!["-c:a:0", "libopus", "-b:a:0", "256k"]
        );
    }

    #[test]
    fn audio_opus_over_320kbps() {
        let streams = vec![make_stream("audio", Some("aac"), None, Some(400_000))];
        assert_eq!(
            audio_args(&streams),
            vec!["-c:a:0", "libopus", "-b:a:0", "256k"]
        );
    }

    #[test]
    fn audio_missing_bit_rate_copies() {
        let streams = vec![make_stream("audio", Some("aac"), None, None)];
        assert_eq!(audio_args(&streams), vec!["-c:a:0", "copy"]);
    }

    #[test]
    fn audio_index_counts_every_audio_stream() {
        // The specifier index is the ordinal of the audio stream, so a
        // re-encoded stream advances it just like a copied one.
        let streams = vec![
            make_stream("audio", Some("aac"), None, Some(400_000)),
            make_stream("audio", Some("aac"), None, Some(128_000)),
        ];
        assert_eq!(
            audio_args(&streams),
            vec!["-c:a:0", "libopus", "-b:a:0", "256k", "-c:a:1", "copy"]
        );
    }

    #[test]
    fn video_libsvtav1_for_h264() {
        let streams = vec![make_stream(
            "video",
            Some("h264"),
            Some("yuv420p"),
            Some(23_968),
        )];
        assert_eq!(video_args(&streams), vec!["-c:v:0", "libsvtav1"]);
    }

    #[test]
    fn video_copy_for_av1() {
        let streams = vec![make_stream("video", Some("av1"), Some("yuv420p10le"), None)];
        assert_eq!(video_args(&streams), vec!["-c:v:0", "copy"]);
    }

    #[test]
    fn video_copy_for_10bit() {
        let streams = vec![make_stream(
            "video",
            Some("h264"),
            Some("yuv420p10le"),
            None,
        )];
        assert_eq!(video_args(&streams), vec!["-c:v:0", "copy"]);
    }

    #[test]
    fn video_missing_pix_fmt_encodes() {
        let streams = vec![make_stream("video", Some("h264"), None, None)];
        assert_eq!(video_args(&streams), vec!["-c:v:0", "libsvtav1"]);
    }

    #[test]
    fn video_index_counts_every_video_stream() {
        // The specifier index is the ordinal of the video stream, so a
        // copied stream advances it just like an encoded one.
        let streams = vec![
            make_stream("video", Some("av1"), Some("yuv420p10le"), None),
            make_stream("video", Some("h264"), Some("yuv420p"), None),
        ];
        assert_eq!(
            video_args(&streams),
            vec!["-c:v:0", "copy", "-c:v:1", "libsvtav1"]
        );
    }

    #[test]
    fn non_av_streams_are_ignored() {
        let streams = vec![make_stream("subtitle", Some("mov_text"), None, None)];
        assert!(audio_args(&streams).is_empty());
        assert!(video_args(&streams).is_empty());
    }

    #[test]
    fn probe_parses_bit_rate_strings() {
        let json = r#"{
            "streams": [
                {"codec_type": "audio", "codec_name": "aac", "bit_rate": "116307"},
                {"codec_type": "video", "codec_name": "h264", "pix_fmt": "yuv420p", "bit_rate": "N/A"},
                {"codec_type": "video", "codec_name": "h264", "pix_fmt": "yuv420p"}
            ]
        }"#;
        let probe: Probe = serde_json::from_str(json).unwrap();
        let streams = probe.streams.unwrap();
        assert_eq!(streams[0].bit_rate, Some(116_307));
        assert_eq!(streams[1].bit_rate, None);
        assert_eq!(streams[2].bit_rate, None);
    }

    #[test]
    fn check_skip_converts_when_target_missing_or_empty() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.mp4");
        let target = dir.path().join("out/a.mp4");
        std::fs::create_dir_all(target.parent().unwrap()).unwrap();
        std::fs::write(&source, b"12345").unwrap();
        assert_eq!(
            Converter::Av1.check_skip(&source, &target),
            SkipDecision::Convert
        );
        std::fs::write(&target, b"").unwrap();
        assert_eq!(
            Converter::Av1.check_skip(&source, &target),
            SkipDecision::Convert
        );
    }

    #[test]
    fn check_skip_skips_when_target_nonempty() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.mp4");
        let target = dir.path().join("a.mp4.out");
        std::fs::write(&source, b"12345").unwrap();
        std::fs::write(&target, b"1234").unwrap();
        assert_eq!(
            Converter::Av1.check_skip(&source, &target),
            SkipDecision::Skip
        );
        // Non-Av1 converters skip without a note even when the target is larger.
        assert_eq!(
            Converter::CopyHeic.check_skip(&source, &target),
            SkipDecision::Skip
        );
    }

    #[test]
    fn check_skip_notes_when_av1_target_larger_than_source() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.mp4");
        let target = dir.path().join("out/a.mp4");
        std::fs::create_dir_all(target.parent().unwrap()).unwrap();
        std::fs::write(&source, b"1").unwrap();
        std::fs::write(&target, b"12345").unwrap();
        match Converter::Av1.check_skip(&source, &target) {
            SkipDecision::SkipWithNote(note) => {
                assert!(note.contains("is larger than"));
                assert!(note.contains("rm "));
            }
            other => panic!("expected SkipWithNote, got {other:?}"),
        }
    }

    #[cfg(unix)]
    #[test]
    fn kill_on_drop_kills_and_reaps_child() {
        let child = Command::new("sleep").arg("60").spawn().unwrap();
        let pid = child.id();
        drop(KillOnDrop(child));
        // `kill -0` exits successfully only if a process with that pid exists.
        let probe = Command::new("kill")
            .arg("-0")
            .arg(pid.to_string())
            .status()
            .unwrap();
        assert!(!probe.success(), "child {pid} should be gone after drop");
    }

    #[cfg(unix)]
    #[test]
    fn kill_on_drop_tolerates_already_exited_child() {
        let child = Command::new("true").spawn().unwrap();
        let mut guard = KillOnDrop(child);
        assert!(guard.0.wait().unwrap().success());
        // kill() now fails and wait() returns the cached status; drop must not panic.
        drop(guard);
    }
}
