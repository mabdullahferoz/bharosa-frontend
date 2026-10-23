import { useState } from "react";
import { api, qs } from "../../api";
import { useAuth } from "../../auth";
import type { PublicWorker } from "../../types";
import WorkerCard from "../../components/WorkerCard";
import { Search } from "lucide-react";
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
      <PageHeader title="Find trusted home help" subtitle="Most trusted first: police verified, then endorsed by our team, then by families." />
      <div className="stack" style={{ gap: 14, marginBottom: 22 }}>
        <label className="searchbar">
          <Search size={18} aria-hidden />
          <input type="search" placeholder="Search by name or skill" aria-label="Search workers" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={city} onChange={setCity} options={meta?.cities ?? []} placeholder="All cities" labelFn={(c) => c} />
        </label>
        <div className="chips">
          <button className="chip" aria-pressed={category === ""} onClick={() => setCategory("")}>
            All
          </button>
          {(meta?.categories ?? []).map((c) => (
            <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(category === c ? "" : c)}>
              {categoryLabel(c)}
            </button>
          ))}
          <button className="chip" aria-pressed={verified} onClick={() => setVerified((v) => !v)}>
            Police verified only
          </button>
          <button className="chip" aria-pressed={endorsed} onClick={() => setEndorsed((v) => !v)}>
            Endorsed only
          </button>
        </div>
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
