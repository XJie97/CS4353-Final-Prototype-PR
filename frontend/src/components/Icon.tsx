type IconProps = {
  name: string;
  width: number;
  height?: number;
  className?: string;
};

// Files exported from the corresponding Figma icon layers.
export function Icon({ name, width, height = width, className }: IconProps) {
  return (
    // Load a named bundled SVG icon; the alt text controls its accessible meaning.
    <img
      className={className}
      src={`/assets/${name}.svg`}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}
