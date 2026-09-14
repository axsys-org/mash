/** Compare rendered sRGB channels, independent of the browser's CSS color serialization. */
export function colorChannels(color: string): number[] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { colorSpace: "srgb" })!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data);
}
