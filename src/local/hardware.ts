import { arch, cpus, platform, totalmem } from "node:os";

export interface HardwareInfo {
  platform: string;
  arch: string;
  ramGb: number;
  cores: number;
  appleSilicon: boolean;
  suggestedModel: string;
  note: string;
}

export function detectHardware(): HardwareInfo {
  const ramGb = totalmem() / 1024 ** 3;
  const isApple = platform() === "darwin" && arch() === "arm64";
  let suggestedModel = "qwen2.5-coder:7b";
  let note = "Buono per modelli coder 7B con tool calling.";
  if (ramGb < 6) {
    suggestedModel = "qwen2.5-coder:3b";
    note = "RAM limitata: modello 3B piu' leggero.";
  } else if (isApple && ramGb >= 16) {
    note = "Apple Silicon: buona velocita' con modelli 7B quantizzati.";
  } else if (ramGb >= 32) {
    note = "RAM abbondante: puoi provare modelli piu' grandi.";
  }
  return {
    platform: platform(),
    arch: arch(),
    ramGb: Math.round(ramGb * 10) / 10,
    cores: cpus().length,
    appleSilicon: isApple,
    suggestedModel,
    note,
  };
}
