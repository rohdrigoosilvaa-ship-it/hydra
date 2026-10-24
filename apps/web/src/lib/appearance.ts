import {
  Briefcase,
  Building2,
  Droplets,
  Factory,
  Flame,
  FlaskConical,
  Hammer,
  HardHat,
  Laptop,
  Store,
  Stethoscope,
  Truck,
  Users,
  Utensils,
  Warehouse,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Cores e ícones oferecidos ao cadastrar ambientes e cargos. */
export const COLOR_CHOICES = ["#0e9f4a", "#0a6e34", "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#0891b2", "#475569"];

export const ICON_CHOICES: { name: string; label: string; icon: LucideIcon }[] = [
  { name: "building", label: "Prédio", icon: Building2 },
  { name: "factory", label: "Fábrica", icon: Factory },
  { name: "warehouse", label: "Galpão", icon: Warehouse },
  { name: "store", label: "Loja", icon: Store },
  { name: "truck", label: "Transporte", icon: Truck },
  { name: "hardhat", label: "Obra", icon: HardHat },
  { name: "wrench", label: "Manutenção", icon: Wrench },
  { name: "hammer", label: "Oficina", icon: Hammer },
  { name: "flask", label: "Laboratório", icon: FlaskConical },
  { name: "stethoscope", label: "Saúde", icon: Stethoscope },
  { name: "briefcase", label: "Escritório", icon: Briefcase },
  { name: "laptop", label: "Administrativo", icon: Laptop },
  { name: "users", label: "Equipe", icon: Users },
  { name: "utensils", label: "Refeitório", icon: Utensils },
  { name: "zap", label: "Elétrica", icon: Zap },
  { name: "flame", label: "Caldeira", icon: Flame },
  { name: "droplets", label: "Hidráulica", icon: Droplets },
];

export const iconByName = (name: string | null | undefined): LucideIcon => ICON_CHOICES.find((i) => i.name === name)?.icon ?? Building2;
