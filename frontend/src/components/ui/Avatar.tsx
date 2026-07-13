import React from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

const sizes = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-14 h-14 text-base',
};

const COLORS = [
  'bg-neo-yellow', 'bg-neo-pink', 'bg-neo-lime', 'bg-neo-blue',
  'bg-neo-orange', 'bg-neo-purple', 'bg-rose-300', 'bg-amber-300',
  'bg-sky-300', 'bg-emerald-300',
];

function getColor(name: string) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export const Avatar: React.FC<AvatarProps> = ({
  name, avatarUrl, size = 'md', className = '', showTooltip = false,
}) => {
  const base = `${sizes[size]} rounded-neo flex-shrink-0 font-bold border-2 border-gray-900`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={showTooltip ? name : undefined}
        className={`${base} object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${base} ${getColor(name)} text-gray-900 flex items-center justify-center ${className}`}
      title={showTooltip ? name : name}
    >
      {getInitials(name)}
    </div>
  );
};

export const AvatarGroup: React.FC<{
  users: { name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}> = ({ users, max = 4, size = 'sm' }) => {
  const visible = users.slice(0, max);
  const rest = users.length - max;

  return (
    <div className="flex -space-x-1.5">
      {visible.map((u, i) => (
        <Avatar key={i} name={u.name} avatarUrl={u.avatarUrl} size={size}
          className="ring-2 ring-[#FFFDF5]" showTooltip />
      ))}
      {rest > 0 && (
        <div className={`${sizes[size]} rounded-neo bg-neo-yellow ring-2 ring-[#FFFDF5] border-2 border-gray-900
                         flex items-center justify-center text-[9px] font-bold text-gray-900`}>
          +{rest}
        </div>
      )}
    </div>
  );
};
