import { useState } from 'react';
import {
  AlertTriangle, Gauge, Award, DollarSign, TrendingUp, ShieldAlert,
  Building2, FileX, Users, FileWarning, FileText, User, Hash, Tag,
  CheckCircle, CreditCard, BarChart3, Globe, Shield, Lock, Briefcase,
  Phone, Mail, MapPin, Calendar, Clock, Star, Heart, Zap, Target,
  type LucideIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ICON_CATALOG: { name: string; icon: LucideIcon }[] = [
  { name: 'AlertTriangle', icon: AlertTriangle },
  { name: 'Gauge', icon: Gauge },
  { name: 'Award', icon: Award },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'ShieldAlert', icon: ShieldAlert },
  { name: 'Building2', icon: Building2 },
  { name: 'FileX', icon: FileX },
  { name: 'Users', icon: Users },
  { name: 'FileWarning', icon: FileWarning },
  { name: 'FileText', icon: FileText },
  { name: 'User', icon: User },
  { name: 'Hash', icon: Hash },
  { name: 'Tag', icon: Tag },
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'BarChart3', icon: BarChart3 },
  { name: 'Globe', icon: Globe },
  { name: 'Shield', icon: Shield },
  { name: 'Lock', icon: Lock },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Phone', icon: Phone },
  { name: 'Mail', icon: Mail },
  { name: 'MapPin', icon: MapPin },
  { name: 'Calendar', icon: Calendar },
  { name: 'Clock', icon: Clock },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Zap', icon: Zap },
  { name: 'Target', icon: Target },
];

interface IconPickerProps {
  currentIcon: LucideIcon;
  onSelect: (iconName: string, icon: LucideIcon) => void;
  size?: number;
}

export default function IconPicker({ currentIcon: CurrentIcon, onSelect, size = 18 }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer group">
          <CurrentIcon style={{ width: size, height: size }} className="text-muted-foreground group-hover:text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 px-1">Trocar ícone</p>
        <div className="grid grid-cols-6 gap-1">
          {ICON_CATALOG.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => { onSelect(name, Icon); setOpen(false); }}
              className="w-9 h-9 rounded-md flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-primary/30"
              title={name}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { ICON_CATALOG };
export function getIconByName(name: string): LucideIcon {
  return ICON_CATALOG.find((i) => i.name === name)?.icon ?? FileText;
}
