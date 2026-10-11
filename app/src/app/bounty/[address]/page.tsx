import { BountyDetail } from "@/components/BountyDetail";

export default function BountyPage({ params }: { params: { address: string } }) {
  return <BountyDetail address={params.address} />;
}
