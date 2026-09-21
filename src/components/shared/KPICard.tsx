import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'amber' | 'purple' | 'green';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
  },
};

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color }) => {
  const styles = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${styles.bg} ${styles.text}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

export default KPICard;
