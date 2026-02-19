import { DisplayFile } from "../src/files.tsx";
import { useFile } from "../src/use-file.ts";

export const ReadFile = () => {
  const { file } = useFile();

  return file.id && <DisplayFile {...file} />;
};
