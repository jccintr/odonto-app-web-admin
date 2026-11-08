import Icon from './Icon.jsx';

export default function Brand({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-fg"><Icon name="tooth" className="size-5" /></span>
      <span className="text-lg">OdontoApp</span>
    </span>
  );
}
