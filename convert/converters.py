from abc import ABC, abstractmethod
from pathlib import Path
import json
import subprocess

AVIF_Q = 79


class Converter(ABC):
    def __init__(self, source: Path, target: Path):
        self.source = source
        if not source:
            raise ValueError("`source` missing")
        self.target = target
        if not target:
            raise ValueError("`target` missing")

    @classmethod
    def suffix(cls) -> str:
        raise NotImplementedError

    @abstractmethod
    def run(self) -> None:
        raise NotImplementedError

    def skip(self) -> bool:
        return (
            self.target.exists()
            and self.target.is_file()
            and self.target.stat().st_size > 0
        )


class AV1(Converter):
    @classmethod
    def suffix(cls) -> str:
        return ".mp4"

    @staticmethod
    def audio(streams: list[dict]) -> list[str]:
        codec_type = "audio"
        result = []

        i = 0
        for stream in streams:
            if stream.get("codec_type") != codec_type:
                continue
            if (
                stream.get("codec_name", "").startswith("pcm")
                or int(stream.get("bit_rate", "0")) > 320_000
            ):
                result.extend((f"-c:a:{i}", "libopus"))
                result.extend((f"-b:a:{i}", "256k"))
                continue
            result.extend((f"-c:a:{i}", "copy"))
            i += 1
        return result

    @staticmethod
    def video(streams: list[dict]) -> list[str]:
        codec_type = "video"
        result = []

        i = 0
        for stream in streams:
            if stream.get("codec_type") != codec_type:
                continue
            if (
                stream.get("codec_name", "") == "av1"
                or "10" in stream.get("pix_fmt", "")  # 10 bit
            ):
                # Leave these cases as-is.
                # We may end up where a `cp` is just better, but,
                # `copy` basically does that anyway.
                result.extend((f"-c:v:{i}", "copy"))
                continue
            result.extend((f"-c:v:{i}", "libsvtav1"))
            i += 1
        return result

    def run(self) -> None:
        probe = subprocess.run(
            (
                "ffprobe",
                "-v",
                "warning",
                "-show_entries",
                "stream=codec_type,codec_name,pix_fmt,bit_rate",
                "-of",
                "json",
                self.source,
            ),
            capture_output=True,
            check=True,
        )
        streams = json.loads(probe.stdout).get("streams")

        ffmpeg = ["ffmpeg", "-nostdin", "-i", self.source]
        ffmpeg.extend(("-map_metadata", "0"))
        ffmpeg.extend(("-movflags", "+faststart"))
        ffmpeg.extend(self.audio(streams))
        ffmpeg.extend(self.video(streams))
        ffmpeg.append(self.target)

        subprocess.run(ffmpeg, check=True)

    def skip(self) -> bool:
        if not self.target.exists() or not self.target.is_file():
            return False

        target_size = self.target.stat().st_size
        if not target_size:
            return False

        if target_size > self.source.stat().st_size:
            print()
            print(f"## {self.target} is larger than {self.source}.")
            print(f"rm {self.target}")
            print(f"cp {self.source} {self.target.parent}")
        return True


class AVIF(Converter):
    @classmethod
    def suffix(cls) -> str:
        return ".avif"

    def run(self) -> None:
        subprocess.run(
            ("vips", "copy", self.source, f"{self.target}[Q={AVIF_Q}]"), check=True
        )


class Copy(Converter):
    # NOTE: these are for the cases where we do NOT want to re-encode.

    def run(self) -> None:
        subprocess.run(("cp", self.source, self.target), check=True)


class Copy3GP(Copy):
    @classmethod
    def suffix(cls) -> str:
        return ".3gp"


class CopyAVIF(Copy):
    # AVIF in, AVIF out.

    @classmethod
    def suffix(cls) -> str:
        return ".avif"


class CopyHEIC(Copy):
    # Depending on licensing, it could make sense to go w/ AVIF instead.

    @classmethod
    def suffix(cls) -> str:
        return ".heic"
        subprocess.run(("cp", self.source, self.target), check=True)


class Raw(Converter):
    @classmethod
    def suffix(cls) -> str:
        return ".avif"

    def run(self) -> None:
        p1 = subprocess.Popen(("dcraw", "-c", self.source), stdout=subprocess.PIPE)
        p2 = subprocess.Popen(
            ("vips", "copy", "stdin", f"{self.target}[Q={AVIF_Q}]"),
            stdin=p1.stdout,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        p1.stdout.close()  # if p2 stops, p1 should stop
        result = p2.communicate()
        if p2.returncode != 0:
            raise Exception(f"vips failed, w/ {self.source}; {result}")
        if p1.wait() != 0:
            raise Exception(f"dcraw failed, w/ {self.source}.")

        subprocess.run(
            (
                "exiftool",
                "-q",
                "-overwrite_original",
                "-tagsfromfile",
                self.source,
                "-all:all",
                self.target,
            ),
            check=True,
        )


REGISTRY: dict[str, Converter] = {
    ".3gp": Copy3GP,
    ".avif": CopyAVIF,
    ".cr2": Raw,
    ".heic": CopyHEIC,
    ".jpeg": AVIF,
    ".jpg": AVIF,
    ".mkv": AV1,
    ".mov": AV1,
    ".mp4": AV1,
    ".mpg": AV1,
    ".mts": AV1,
    ".png": AVIF,
}
