import { Link } from "react-router-dom";
import { t } from "../i18n";
import { Avatar, categoryLabel, Money, TrustBadges } from "../ui";

export default function Landing() {
  return (
    <div className="stack" style={{ gap: 40 }}>
      <section className="hero">
        <div>
          <h1>
            {/* *word* marks the highlighted words, so each language can place them naturally */}
            {t("Home help you can *trust*. Work that *respects* you.")
              .split(/\*([^*]+)\*/)
              .map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}
          </h1>
          <p className="lead">
            {t(
              "Bharosa brings families together with maids, cooks, drivers, gardeners and cleaners. Every worker can be police verified by our team, and families who have employed them vouch for them.",
            )}
          </p>
          <div className="row">
            <Link to="/register?role=HOUSEHOLD" className="btn">
              {t("I need help at home")}
            </Link>
            <Link to="/register?role=WORKER" className="btn btn-accent">
              {t("I am looking for work")}
            </Link>
          </div>
        </div>
        <div className="hero-card" aria-label={t("Example worker profile")}>
          <div className="row">
            <Avatar name="Shabana Bibi" size={52} />
            <div>
              <div className="card-title">{t("Shabana Bibi")}</div>
              <div className="card-meta">
                <span>
                  {categoryLabel("MAID")} · {categoryLabel("CLEANER")}
                </span>
                <span>{t("{n} yrs exp.", { n: 8 })}</span>
                <span>{t("Lahore")}</span>
              </div>
            </div>
          </div>
          <TrustBadges
            trust={{
              policeVerified: true,
              verificationStatus: "VERIFIED",
              badgeSuspended: false,
              cnicInCustody: true,
              platformEndorsed: true,
              householdEndorsements: 3,
              averageRating: 5,
              placements: 3,
              upheldComplaints: 0,
            }}
          />
          <p className="muted small">"{t("Honest and hardworking. Our children love her.")}" ({t("Family in DHA Phase 5")})</p>
          <hr style={{ margin: 0 }} />
          <div className="row-between">
            <span className="muted small">{t("Asks for")}</span>
            <Money amount={35000} period="MONTHLY" />
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 14 }}>{t("How it works")}</h2>
        <div className="how">
          <div className="card">
            <span className="step-no">1</span>
            <h3>{t("Post what you need, at your price")}</h3>
            <p className="muted">
              {t("Families post a job with the wage they offer. Workers accept it or suggest their own price. You choose who to hire.")}
            </p>
          </div>
          <div className="card">
            <span className="step-no">2</span>
            <h3>{t("Hire with trust signals")}</h3>
            <p className="muted">
              {t(
                "Look for the Police verified badge. Our team checks the worker with the police and keeps their original CNIC safe. Endorsements come from real families.",
              )}
            </p>
          </div>
          <div className="card">
            <span className="step-no">3</span>
            <h3>{t("Vouch, or report a problem")}</h3>
            <p className="muted">
              {t(
                "After a month, families are asked to endorse their worker. Complaints are reviewed by our team, and serious problems lead to suspension or a ban.",
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="callout callout-accent">
        <span>
          <strong>{t("For workers:")}</strong>{" "}
          {t("joining is free. Get verified once, build your reputation with every family, and get offers from good homes in your city.")}
        </span>
        <Link to="/register?role=WORKER" className="btn btn-sm">
          {t("Create my profile")}
        </Link>
      </section>
    </div>
  );
}
