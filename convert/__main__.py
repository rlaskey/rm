from pathlib import Path
from time import monotonic
import argparse
import converters


class Main:
    def __init__(self, source: str, target: str):
        self.source = Path(source).resolve()
        if not self.source.is_dir():
            raise Exception("Source must be a directory.")

        self.target = Path(target).resolve()
        if not self.target.is_dir():
            raise Exception("Target must be a directory.")

        if self.source.is_relative_to(self.target):
            raise Exception("Source cannot be relative to the target.")
        if self.target.is_relative_to(self.source):
            raise Exception("Target cannot be relative to the source.")

    def walk(self, subdirectory: str = ""):
        if not subdirectory:
            raise Exception("You must filter to a subdirectory.")

        root = (self.source / subdirectory).resolve()
        if not root.is_dir():
            raise Exception("Could not find the subdirectory.")
        if root == self.source:
            raise Exception("You must filter to a subdirectory.")
        if not root.is_relative_to(self.source):
            raise Exception("You cannot break out of the source directory.")

        for dirpath, dirnames, filenames in root.walk():
            rel = dirpath.relative_to(self.source)
            target_dir = self.target / rel
            target_dir.mkdir(parents=True, exist_ok=True)

            for filename in filenames:
                started = monotonic()
                source_path = dirpath / filename
                converter = converters.REGISTRY.get(source_path.suffix.lower())
                if not converter:
                    print(f"NOTE: skipping {source_path}. Not a supported file format.")
                    continue

                target_path = target_dir / (source_path.stem + converter.suffix())
                if target_path.exists():
                    # print(f"NOTE: {target_path} already exists. Moving on.")
                    continue

                try:
                    converter(source_path, target_path).run()
                except Exception:
                    if target_path.exists():
                        print(f"NOTE: we got an error. Deleting {target_path}.")
                        target_path.unlink()
                    raise
                print(
                    f"- created {target_path.relative_to(self.target)} in {(monotonic() - started):.3f} seconds."
                )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="convert a directory.",
        epilog="Example: '/originals' '/converted' 'only/these/files'",
    )

    parser.add_argument("source", type=str, help="Source directory (e.g. '/originals')")

    parser.add_argument("target", type=str, help="Target directory (e.g. '/converted')")

    parser.add_argument(
        "subdirectory", type=str, help="Subdirectory (e.g. 'only/these/files')"
    )

    args = parser.parse_args()

    main = Main(args.source, args.target)
    main.walk(args.subdirectory)
