/** Curated subset of lucide-react icons grouped by category. Keeps bundle small. */
export const ICON_CATALOG: { category: string; names: string[] }[] = [
  {
    category: "UI & ações",
    names: [
      "Check", "CheckCircle", "CircleAlert", "Info", "Star", "Heart", "Bookmark",
      "Plus", "Minus", "X", "Search", "Settings", "Filter", "Eye", "EyeOff",
      "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "ChevronRight",
      "ChevronDown", "MoreHorizontal", "Sparkles", "Zap", "Flag",
    ],
  },
  {
    category: "Documento",
    names: [
      "FileText", "File", "FileCheck", "FileWarning", "Folder", "FolderOpen",
      "Clipboard", "ClipboardCheck", "BookOpen", "Book", "Printer", "Download",
      "Upload", "Save", "Pencil", "PenLine", "PenTool",
    ],
  },
  {
    category: "Comércio & financeiro",
    names: [
      "DollarSign", "Banknote", "Coins", "CreditCard", "Wallet", "Receipt",
      "ShoppingCart", "ShoppingBag", "Tag", "Tags", "Percent", "TrendingUp",
      "TrendingDown", "BarChart3", "PieChart", "LineChart", "Calculator",
      "Landmark", "Scale", "Gavel",
    ],
  },
  {
    category: "Comunicação",
    names: [
      "Mail", "MessageCircle", "MessageSquare", "Phone", "PhoneCall", "Send",
      "Bell", "BellRing", "Megaphone", "AtSign", "Hash", "Globe",
    ],
  },
  {
    category: "Pessoas & lugar",
    names: [
      "User", "Users", "UserCheck", "UserCog", "Building2", "Home", "MapPin",
      "Map", "Navigation", "Briefcase", "GraduationCap", "Award", "Calendar",
      "CalendarDays", "Clock", "AlarmClock",
    ],
  },
  {
    category: "Mídia & tecnologia",
    names: [
      "Image", "Camera", "Video", "Mic", "Music", "Play", "Pause", "Volume2",
      "Monitor", "Smartphone", "Laptop", "Server", "Database", "Wifi",
      "Lock", "Unlock", "Shield", "ShieldCheck", "Key",
    ],
  },
];

export const ALL_ICON_NAMES = ICON_CATALOG.flatMap((c) => c.names);