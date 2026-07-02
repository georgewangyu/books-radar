export type ReadingQueueBook = {
  id: string;
  title: string;
  author: string;
  lane: "Business conversion" | "Future ideas";
  reason: string;
  readFor: string;
};

export const readingQueue: ReadingQueueBook[] = [
  {
    id: "100m-offers",
    title: "$100M Offers",
    author: "Alex Hormozi",
    lane: "Business conversion",
    reason:
      "Start here for turning attention into a concrete offer people understand quickly.",
    readFor: "Offer structure, pricing, guarantees, and the first paid course shape.",
  },
  {
    id: "100m-leads",
    title: "$100M Leads",
    author: "Alex Hormozi",
    lane: "Business conversion",
    reason:
      "Useful for the path from video viewer to lead magnet, email list, and sales conversation.",
    readFor: "Lead magnets, traffic, list growth, and simple acquisition loops.",
  },
  {
    id: "expert-secrets",
    title: "Expert Secrets",
    author: "Russell Brunson",
    lane: "Business conversion",
    reason:
      "Good candidate for packaging expertise into a teachable transformation instead of loose content.",
    readFor: "Course positioning, workshop arcs, and audience belief shifts.",
  },
  {
    id: "dotcom-secrets",
    title: "DotCom Secrets",
    author: "Russell Brunson",
    lane: "Business conversion",
    reason:
      "A funnel mechanics book for connecting free material, email capture, and paid products.",
    readFor: "Landing pages, email paths, webinars, and simple offer funnels.",
  },
  {
    id: "obviously-awesome",
    title: "Obviously Awesome",
    author: "April Dunford",
    lane: "Business conversion",
    reason:
      "Useful before building too much, because the offer needs a clear category in the buyer's head.",
    readFor: "Positioning, alternatives, buyer context, and why-this-now language.",
  },
  {
    id: "the-mom-test",
    title: "The Mom Test",
    author: "Rob Fitzpatrick",
    lane: "Business conversion",
    reason:
      "A practical check against building a course from polite praise instead of real buying pressure.",
    readFor: "Customer interviews, problem discovery, and validation questions.",
  },
  {
    id: "destined-for-war",
    title: "Destined for War",
    author: "Graham Allison",
    lane: "Future ideas",
    reason:
      "A power-transition candidate for thinking about the Thucydides Trap and US-China rivalry without letting the analogy become destiny.",
    readFor:
      "Rising powers, ruling powers, escalation paths, and when historical analogies help or overfit.",
  },
  {
    id: "ai-2041",
    title: "AI 2041",
    author: "Kai-Fu Lee and Chen Qiufan",
    lane: "Future ideas",
    reason:
      "A useful bridge between AI forecasting and fiction, with scenarios that can become product prompts.",
    readFor: "AI futures, social change, and product ideas beyond today's model limits.",
  },
  {
    id: "the-lifecycle-of-software-objects",
    title: "The Lifecycle of Software Objects",
    author: "Ted Chiang",
    lane: "Future ideas",
    reason:
      "Strong candidate for thinking about agents that learn over time and need care, context, and trust.",
    readFor: "Training, attachment, autonomy, and long-lived software companions.",
  },
  {
    id: "the-player-of-games",
    title: "The Player of Games",
    author: "Iain M. Banks",
    lane: "Future ideas",
    reason:
      "A cleaner Culture entry point for status, games, institutions, and AI-run civilization.",
    readFor: "Post-scarcity systems, incentives, status, and institutional design.",
  },
  {
    id: "permutation-city",
    title: "Permutation City",
    author: "Greg Egan",
    lane: "Future ideas",
    reason:
      "A hard sci-fi candidate for stretching intuition about digital minds and simulation worlds.",
    readFor: "Identity, uploaded minds, simulations, and software as a substrate for life.",
  },
];
