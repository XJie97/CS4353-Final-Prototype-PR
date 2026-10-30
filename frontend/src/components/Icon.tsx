type IconProps = { name: string; width: number; height?: number; className?: string };

// Files exported from the corresponding Figma icon layers.
export function Icon({ name, width, height = width, className }: IconProps) {
  return <img className={className} src={`/assets/${name}.svg`} width={width} height={height} alt="" aria-hidden="true" draggable="false" />;
}
