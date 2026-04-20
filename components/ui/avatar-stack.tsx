export type AvatarStackPerson = {
  id: string;
  initials: string;
  hue: number;
};

type AvatarStackProps = {
  people: AvatarStackPerson[];
  size?: number;
  max?: number;
};

export function AvatarStack({ people, size = 22, max = 4 }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const fontSize = size * 0.38;

  return (
    <span className="inline-flex" aria-label={`${people.length} people`}>
      {shown.map((person, i) => (
        <span
          key={person.id}
          aria-hidden
          className="inline-flex items-center justify-center rounded-full font-semibold"
          style={{
            width: size,
            height: size,
            fontSize,
            marginLeft: i === 0 ? 0 : -6,
            background: `oklch(88% 0.06 ${person.hue})`,
            color: `oklch(32% 0.08 ${person.hue})`,
            letterSpacing: '-0.02em',
            boxShadow: '0 0 0 2px var(--surface), 0 0 0 3px var(--line-2)',
          }}
        >
          {person.initials}
        </span>
      ))}
      {extra > 0 ? (
        <span
          aria-hidden
          className="inline-flex items-center justify-center rounded-full border-2 font-medium text-[var(--text-mute)]"
          style={{
            width: size,
            height: size,
            marginLeft: -6,
            fontSize: size * 0.36,
            background: 'var(--surface-hi)',
            borderColor: 'var(--surface)',
          }}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
