from abc import ABC, abstractmethod
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


class AVIF(Converter):
    @classmethod
    def suffix(cls) -> str:
        return ".avif"

    def run(self) -> None:
        subprocess.run(
            ("vips", "copy", self.source, f"{self.target}[Q={AVIF_Q}]"), check=True
        )


class MP4(Converter):
    @classmethod
    def suffix(cls) -> str:
        return ".mp4"

    def run(self) -> None:
        subprocess.run(
            (
                "ffmpeg",
                "-i",
                self.source,
                "-c:a",
                "copy",
                "-c:v",
                "libsvtav1",
                "-map_metadata",
                "0",
                "-movflags",
                "+faststart",
                self.target,
            ),
            check=True,
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
    ".mts": MP4,
}
