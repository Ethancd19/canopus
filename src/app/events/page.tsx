import { getSportsGenres } from "@/lib/public-queries";
import SportsHub from "@/components/sports/SportsHub";

export const revalidate = 60;

export default async function SportsPage() {
  const genres = await getSportsGenres();
  return <SportsHub genres={genres} />;
}
