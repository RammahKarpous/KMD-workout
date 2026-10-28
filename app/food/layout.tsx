import { FoodSubnav } from "@/features/food/FoodSubnav";

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <FoodSubnav />
      {children}
    </div>
  );
}
