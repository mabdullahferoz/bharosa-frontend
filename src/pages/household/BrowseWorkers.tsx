import { useState } from "react";
import { api, qs } from "../../api";
import { useAuth } from "../../auth";
import type { PublicWorker } from "../../types";
import WorkerCard from "../../components/WorkerCard";
import { categoryLabel, Empty, Loaded, PageHeader, Select, useLoad } from "../../ui";

export default function BrowseWorkers() {
  const { user, meta } = useAuth();
  const [category, setCategory] = useState("");
  const [city, setCity] = useState(user?.city ?? "");
  const [verified, setVerified] = useState(false);
  const [endorsed, setEndorsed] = useState(false);
  const [q, setQ] = useState("");
  const state = useLoad(
    () => api.get<PublicWorker[]>(`/workers${qs({ category, city, verified: verified ? 1 : "", endorsed: endorsed ? 1 : "", q })}`),
    [category, city, verified, endorsed, q],
  );

  return (
    <div>
      <PageHeader title="Find workers" subtitle="Most trusted first: police verified, then team-endorsed, then families' endorsements." />
      <div className="filters">
        <Select value={category} onChange={setCategory} options={meta?.categories ?? []} placeholder="All types of work" labelFn={categoryLabel} />
        <Select value={city} onChange={setCity} options={meta?.cities ?? []} placeholder="All cities" labelFn={(c) => c} />
        <input type="search" placeholder="Search name or skills" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />
        <button className="chip" aria-pressed={verified} onClick={() => setVerified((v) => !v)}>
          Police verified
        </button>
        <button className="chip" aria-pressed={endorsed} onClick={() => setEndorsed((v) => !v)}>
          Endorsed
        </button>
      </div>
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty title="No workers match">Try another city or type of work, or post a job and let workers come to you.</Empty>
          ) : (
            <div className="grid">
              {list.map((w) => (
                <WorkerCard key={w.id} worker={w} to={`/household/workers/${w.id}`} />
              ))}
            </div>
          )
        }
      </Loaded>
    </div>
  );
}
