import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Handshake, Languages, ShieldCheck, Users } from "lucide-react";
import { t } from "../i18n";
import type { PublicWorker } from "../types";
import WorkerCard from "../components/WorkerCard";
import BlurText from "../components/reactbits/BlurText";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import ShinyText from "../components/reactbits/ShinyText";

// Illustrative profiles for the landing page only (labelled "Example profiles" on the page).
const ex = (id: string, name: string, area: string, endorsers: string[], team: boolean, partial: Partial<PublicWorker["trust"]>, profile: Partial<NonNullable<PublicWorker["profile"]>>): PublicWorker => ({
  id,
  name,
  city: "Lahore",
  area,
  status: "ACTIVE",
  memberSince: "2026-01-01",
  profile: { skills: [], bio: null, experienceYears: 0, expectedWage: null, availability: "FULL_TIME", hometown: null, languages: "Urdu", gender: null, ...profile },
  trust: { policeVerified: false, verificationStatus: "NONE", badgeSuspended: false, cnicInCustody: false, platformEndorsed: team, householdEndorsements: endorsers.length, averageRating: null, placements: 0, upheldComplaints: 0, ...partial },
  endorsements: [
    ...(team ? [{ id: id + "-t", type: "PLATFORM" as const, trustworthy: true, rating: 5, comment: null, createdAt: "2026-01-01", endorser: { name: "Bharosa team" } }] : []),
    ...endorsers.map((n, i) => ({ id: `${id}-${i}`, type: "HOUSEHOLD" as const, trustworthy: true, rating: 5, comment: null, createdAt: "2026-01-01", endorser: { name: n } })),
  ],
});

const EXAMPLES: PublicWorker[] = [
  ex("e1", "Shabana Bibi", "Township", ["Sana Malik", "Hamid Qureshi", "Mehreen Siddiqui"], true, { policeVerified: true, verificationStatus: "VERIFIED" }, {
    skills: ["MAID", "CLEANER"], experienceYears: 8, expectedWage: 42000,
  }),
  ex("e2", "Rukhsana Akhtar", "Model Town", ["Sana Malik"], true, {}, { skills: ["COOK"], experienceYears: 10, expectedWage: 45000 }),
  ex("e3", "Muhammad Aslam", "Shadman", ["Hamid Qureshi", "Ayesha Raza"], false, { policeVerified: true, verificationStatus: "VERIFIED" }, {
    skills: ["DRIVER"], experienceYears: 12, expectedWage: 45000,
  }),
];

export default function Landing() {
  return (
    <div className="stack" style={{ gap: 64 }}>
      <section className="hero">
        <div>
          <h1>
            <BlurText as="span" text={t("Home help you can trust.")} animateBy="words" direction="bottom" delay={70} trigger="load" />
            <BlurText as="span" className="accent" text={t("Work that respects you.")} animateBy="words" direction="bottom" delay={70} trigger="load" />
          </h1>
          <p className="lead">
            {t(
              "Bharosa brings families together with maids, cooks, drivers, gardeners and cleaners. Every worker can be police verified by our team, and families who have employed them vouch for them.",
            )}
          </p>
          <div className="row" style={{ gap: 12 }}>
            <Link to="/register?role=HOUSEHOLD" className="btn">
              {t("I need help at home")} <ArrowRight size={18} aria-hidden />
            </Link>
            <Link to="/register?role=WORKER" className="btn btn-ghost">
              {t("I am looking for work")}
            </Link>
          </div>
          <div className="hero-proof">
            <span><ShieldCheck size={18} aria-hidden /> {t("Police verified by our team")}</span>
            <span><Users size={18} aria-hidden /> {t("Endorsed by real families")}</span>
            <span><Languages size={18} aria-hidden /> {t("English and Urdu")}</span>
          </div>
        </div>
        <div>
          <div className="hero-cards" aria-label={t("Example worker profiles")}>
            {EXAMPLES.map((w) => (
              <SpotlightCard key={w.id} theme="light" spotlightColor="rgba(8, 127, 91, 0.14)" className="hero-spot">
                <WorkerCard worker={w} />
              </SpotlightCard>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>
            {t("Example profiles")}
          </p>
        </div>
      </section>

      <section className="stack" style={{ gap: 18 }}>
        <h2 style={{ fontSize: "1.6rem" }}>{t("How it works")}</h2>
        <div className="how card" style={{ padding: 0, gap: 0 }}>
          {[
            { icon: <ClipboardCheck size={22} aria-hidden />, title: t("Post what you need, at your price"), body: t("Families post a job with the wage they offer. Workers accept it or suggest their own price. You choose who to hire.") },
            { icon: <ShieldCheck size={22} aria-hidden />, title: t("Hire with trust signals"), body: t("Look for the Police verified badge. Our team checks the worker with the police and keeps their original CNIC safe. Endorsements come from real families.") },
            { icon: <Handshake size={22} aria-hidden />, title: t("Vouch, or report a problem"), body: t("After a month, families are asked to endorse their worker. Complaints are reviewed by our team, and serious problems lead to suspension or a ban.") },
          ].map((s, i) => (
            <div key={i} className="how-step">
              <div className="icon">{s.icon}</div>
              <h3>
                <span className="muted" style={{ marginInlineEnd: 6 }}>{i + 1}.</span>
                {s.title}
              </h3>
              <p className="muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <div>
          <h2 style={{ fontSize: "1.4rem" }}>
            <ShinyText text={t("For workers: joining is free.")} color="#ffffff" shineColor="#7fd6b2" speed={3} />
          </h2>
          <p>{t("Get verified once, build your reputation with every family, and get offers from good homes in your city.")}</p>
        </div>
        <Link to="/register?role=WORKER" className="btn">
          {t("Create my profile")} <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
