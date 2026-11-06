import { useMemo } from "react";
import { qrcodegen } from "../../vendor/qrcodegen";
export function QrCode({ value }: { value: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.MEDIUM);
    const commands = [];
    for (let y = 0; y < qr.size; y++)
      for (let x = 0; x < qr.size; x++)
        // Add a path square only for a dark QR-code module.
        if (qr.getModule(x, y)) commands.push(`M${x + 4},${y + 4}h1v1h-1z`);
    return { size: qr.size + 8, path: commands.join("") };
  }, [value]);
  return (
    // Draw the handover payload as vector QR modules with a surrounding quiet zone.
    <svg
      className="handover-qr"
      width={220}
      height={220}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Handover QR code"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}
