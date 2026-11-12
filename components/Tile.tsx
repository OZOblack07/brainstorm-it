export default function Tile({ ch, small, brass, className = '' }: { ch: string; small?: boolean; brass?: boolean; className?: string }) {
  return <span className={`tile ${small ? 'tile-sm' : ''} ${brass ? 'tile-brass' : ''} ${className}`}>{ch}</span>;
}
