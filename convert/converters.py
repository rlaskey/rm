from abc import ABC, abstractmethod
import json
import subprocess

AVIF_Q = 79


class Converter(ABC):
    def __init__(self, source: str, target: str):
        self.source = source
        if not source:
            raise ValueError("`source` missing")
        self.target = target
        if not target:
            raise ValueError("`target` missing")

    @abstractmethod
    def run(self) -> None:
        pass

    @classmethod
    def suffix(cls) -> str:
        raise NotImplementedError


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
                or int(stream.get("bit_rate", "1536000")) > 320_000
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
            if stream.get("codec_name", "") == "av1":
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
                "stream=codec_type,codec_name,bit_rate",
                "-of",
                "json",
                self.source,
            ),
            capture_output=True,
            check=True,
        )
        streams = json.loads(probe.stdout).get("streams")

        ffmpeg = ["ffmpeg", "-i", self.source]
        ffmpeg.extend(("-map_metadata", "0"))
        ffmpeg.extend(("-movflags", "+faststart"))
        ffmpeg.extend(self.audio(streams))
        ffmpeg.extend(self.video(streams))
        ffmpeg.append(self.target)

        subprocess.run(ffmpeg, check=True)


class AVIF(Converter):
    @classmethod
    def suffix(cls) -> str:
        return ".avif"

    def run(self) -> None:
        subprocess.run(
            ("vips", "copy", self.source, f"{self.target}[Q={AVIF_Q}]"), check=True
        )


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
    ".jpg": AVIF,
    ".jpeg": AVIF,
    ".cr2": Raw,
    ".mts": AV1,
    ".mov": AV1,
}
