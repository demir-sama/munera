import { Suspense } from "react";
import { Hero } from "@/components/Hero";
import { BountyBoard } from "@/components/BountyBoard";
import { AboutSection, CtaBand, Faq, FeaturesGrid, HowItWorks } from "@/components/landing";
import { SkeletonCards } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="space-y-14 sm:space-y-20">
      <Hero />
      <div className="space-y-12">
        <Suspense fallback={<SkeletonCards />}>
          <BountyBoard />
        </Suspense>
      </div>
      <AboutSection />
      <FeaturesGrid />
      <HowItWorks />
      <Faq />
      <CtaBand />
    </div>
  );
}
