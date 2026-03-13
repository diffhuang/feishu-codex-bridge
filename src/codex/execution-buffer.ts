export type ExecutionBuffer = {
  append: (line: string) => void;
  snapshot: () => string;
};

export function createExecutionBuffer(maxLines: number): ExecutionBuffer {
  const lines: string[] = [];

  return {
    append(line: string) {
      lines.push(line);
      if (lines.length > maxLines) {
        lines.splice(0, lines.length - maxLines);
      }
    },
    snapshot() {
      return lines.join("\n");
    },
  };
}
