import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, hasPerm, homeFor, isStaffRole, useAuth } from "./auth";
import { api } from "./api";
import { I18nProvider, LanguageToggle, msg, t } from "./i18n";
import { Spinner, ToastProvider } from "./ui";
import type { Me, Permission, Role } from "./types";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Notifications from "./pages/Notifications";
import ChangePassword from "./pages/ChangePassword";
import MyActivity from "./pages/MyActivity";
import HouseholdHome from "./pages/household/HouseholdHome";
import PostJob from "./pages/household/PostJob";
import JobDetail from "./pages/household/JobDetail";
import BrowseWorkers from "./pages/household/BrowseWorkers";
import WorkerPublicProfile from "./pages/household/WorkerPublicProfile";
import Hires from "./pages/household/Hires";
import HouseholdComplaints from "./pages/household/HouseholdComplaints";
import JobFeed from "./pages/worker/JobFeed";
import MyOffers from "./pages/worker/MyOffers";
import MyWork from "./pages/worker/MyWork";
import WorkerProfile from "./pages/worker/WorkerProfile";
import WorkerComplaints from "./pages/worker/WorkerComplaints";
import AdminHome from "./pages/admin/AdminHome";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminVerification from "./pages/admin/AdminVerification";
import AdminWorkers from "./pages/admin/AdminWorkers";
import AdminWorkerDetail from "./pages/admin/AdminWorkerDetail";
import AdminAssist from "./pages/admin/AdminAssist";
import AdminSignup from "./pages/admin/AdminSignup";
import AdminHouseholds from "./pages/admin/AdminHouseholds";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminGrievances from "./pages/admin/AdminGrievances";
import AdminPlacements from "./pages/admin/AdminPlacements";
import AdminCustody from "./pages/admin/AdminCustody";
import AdminMyActivity from "./pages/admin/AdminMyActivity";
import SuperAlerts from "./pages/super/SuperAlerts";
import SuperStaff from "./pages/super/SuperStaff";
import SuperAudit from "./pages/super/SuperAudit";
import SuperReports from "./pages/super/SuperReports";
import SuperMessages from "./pages/super/SuperMessages";

const ico = (d: string) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path fill="currentColor" d={d} />
  </svg>
);
const I = {
  home: ico("M12 3 2 11h3v9h5v-6h4v6h5v-9h3L12 3Z"),
  search: ico("M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"),
  users: ico("M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM1 20c0-3.3 3.6-6 8-6s8 2.7 8 6H1Zm17 0c0-1.7-.6-3.3-1.7-4.5 3.4.2 6.7 1.8 6.7 4.5h-5Z"),
  chat: ico("M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 1-2Z"),
  brief: ico("M9 3h6a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2Zm0 4h6V5H9v2Z"),
  user: ico("M12 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm-9 10c0-4.4 4-8 9-8s9 3.6 9 8H3Z"),
  shield: ico("M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z"),
  flag: ico("M5 2h2v20H5V2Zm3 1h11l-2 4 2 4H8V3Z"),
  grid: ico("M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z"),
  check: ico("M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"),
  list: ico("M3 5h18v2H3V5Zm0 6h18v2H3v-2Zm0 6h18v2H3v-2Z"),
  alert: ico("M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"),
  bell: ico("M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"),
};

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  /** staff only: hide unless the user holds one of these */
  perms?: Permission[];
}

const NAV: Record<"HOUSEHOLD" | "WORKER" | "STAFF" | "SUPER", NavItem[]> = {
  HOUSEHOLD: [
    { to: "/household", label: "Home", icon: I.home, end: true },
    { to: "/household/workers", label: "Find workers", icon: I.search },
    { to: "/household/hires", label: "My hires", icon: I.users },
    { to: "/household/complaints", label: "Complaints", icon: I.flag },
    { to: "/me/activity", label: "Activity", icon: I.list },
  ],
  WORKER: [
    { to: "/worker", label: msg("Jobs"), icon: I.brief, end: true },
    { to: "/worker/offers", label: msg("Offers"), icon: I.chat },
    { to: "/worker/work", label: msg("My work"), icon: I.home },
    { to: "/worker/profile", label: msg("Profile"), icon: I.user },
    { to: "/me/activity", label: msg("Activity"), icon: I.list },
  ],
  STAFF: [
    { to: "/admin", label: "Overview", icon: I.grid, end: true },
    { to: "/admin/approvals", label: "Approvals", icon: I.check },
    { to: "/admin/workers", label: "Workers", icon: I.users, perms: ["WORKERS_ASSIST", "VERIFY", "REPORTS", "PENALTIES", "COMPLAINTS"] },
    { to: "/admin/households", label: "Households", icon: I.home, perms: ["HOUSEHOLDS_ASSIST", "PLACEMENTS", "REPORTS"] },
    { to: "/admin/verification", label: "Verification", icon: I.shield, perms: ["VERIFY"] },
    { to: "/admin/complaints", label: "Complaints", icon: I.flag, perms: ["COMPLAINTS", "REPORTS"] },
    { to: "/admin/grievances", label: "Worker grievances", icon: I.alert, perms: ["COMPLAINTS", "REPORTS"] },
    { to: "/admin/placements", label: "Placements", icon: I.brief, perms: ["PLACEMENTS"] },
    { to: "/admin/custody", label: "CNIC custody", icon: I.shield, perms: ["CNIC_CUSTODY"] },
    { to: "/admin/my-activity", label: "My activity", icon: I.list },
  ],
  SUPER: [
    { to: "/super", label: "Red flags", icon: I.alert, end: true },
    { to: "/super/staff", label: "Staff", icon: I.users },
    { to: "/super/audit", label: "Audit log", icon: I.list },
    { to: "/super/reports", label: "Staff reports", icon: I.flag },
    { to: "/super/messages", label: "SMS log", icon: I.chat },
  ],
};

function navFor(user: Me): NavItem[] {
  if (user.role === "WORKER") return NAV.WORKER;
  if (user.role === "HOUSEHOLD") return NAV.HOUSEHOLD;
  const staff = NAV.STAFF.filter((n) => !n.perms || n.perms.some((p) => hasPerm(user, p)));
  return user.role === "SUPER_ADMIN" ? [...NAV.SUPER, ...staff] : staff;
}

function useUnreadCount() {
  const { user } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () =>
      api
        .get<{ unread: number }>("/notifications")
        .then((r) => alive && setCount(r.unread))
        .catch(() => undefined);
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user, location.pathname]);
  return count;
}

function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const unread = useUnreadCount();
  const items = user && !user.mustChangePassword ? navFor(user) : [];
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to={user ? homeFor(user.role) : "/"} className="brand">
            <img src="/icon-192.png" alt="" />
            <span className="brand-name">Bharosa</span>
          </Link>
          {items.length > 0 && (
            <nav className="nav" aria-label="Main">
              {items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}>
                  {t(n.label)}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="topbar-right">
            <LanguageToggle />
            {user ? (
              <>
                <Link to="/notifications" className="icon-btn bell" aria-label={t("Notifications ({n} unread)", { n: unread })}>
                  {I.bell}
                  {unread > 0 && <span className="bell-dot">{unread > 9 ? "9+" : unread}</span>}
                </Link>
                <span className="muted small topbar-name">
                  {user.name}
                  {user.staff && <span className="staff-code"> · {user.staff.staffCode}</span>}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={logout}>
                  {t("Log out")}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  {t("Log in")}
                </Link>
                <Link to="/register" className="btn btn-sm">
                  {t("Sign up")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {user?.status === "SUSPENDED" && (
        <div className="callout callout-warn" style={{ borderRadius: 0, justifyContent: "center" }}>
          {t("Your account is suspended. You can look around but cannot respond to jobs. Contact support to resolve it.")}
        </div>
      )}
      {user && isStaffRole(user.role) && (
        <div className="staff-banner">
          Staff mode · {user.staff?.staffCode} · Every action you take is recorded and reviewed by the super admins.
        </div>
      )}
      <main className="main">{children}</main>
      {items.length > 0 && (
        <nav className="bottom-nav" aria-label="Main">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.icon}
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

/** Logged-in users on a temporary password see only the change-password screen. */
function PasswordGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.mustChangePassword) return <ChangePassword forced />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <PasswordGate>{children}</PasswordGate>;
}

function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <PasswordGate>{children}</PasswordGate>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

const H = (el: ReactNode) => <RequireRole roles={["HOUSEHOLD"]}>{el}</RequireRole>;
const W = (el: ReactNode) => <RequireRole roles={["WORKER"]}>{el}</RequireRole>;
const P = (el: ReactNode) => <RequireRole roles={["WORKER", "HOUSEHOLD"]}>{el}</RequireRole>;
const A = (el: ReactNode) => <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>{el}</RequireRole>;
const S = (el: ReactNode) => <RequireRole roles={["SUPER_ADMIN"]}>{el}</RequireRole>;

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <I18nProvider>
            <Shell>
              <Routes>
                <Route path="/" element={<GuestOnly><Landing /></GuestOnly>} />
                <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
                <Route path="/notifications" element={<RequireUser><Notifications /></RequireUser>} />
                <Route path="/account/password" element={<RequireUser><ChangePassword /></RequireUser>} />
                <Route path="/me/activity" element={P(<MyActivity />)} />

                <Route path="/household" element={H(<HouseholdHome />)} />
                <Route path="/household/jobs/new" element={H(<PostJob />)} />
                <Route path="/household/jobs/:id" element={H(<JobDetail />)} />
                <Route path="/household/workers" element={H(<BrowseWorkers />)} />
                <Route path="/household/workers/:id" element={H(<WorkerPublicProfile />)} />
                <Route path="/household/hires" element={H(<Hires />)} />
                <Route path="/household/complaints" element={H(<HouseholdComplaints />)} />

                <Route path="/worker" element={W(<JobFeed />)} />
                <Route path="/worker/offers" element={W(<MyOffers />)} />
                <Route path="/worker/work" element={W(<MyWork />)} />
                <Route path="/worker/profile" element={W(<WorkerProfile />)} />
                <Route path="/worker/complaints" element={W(<WorkerComplaints />)} />

                <Route path="/admin" element={A(<AdminHome />)} />
                <Route path="/admin/approvals" element={A(<AdminApprovals />)} />
                <Route path="/admin/verification" element={A(<AdminVerification />)} />
                <Route path="/admin/workers" element={A(<AdminWorkers />)} />
                <Route path="/admin/workers/:id" element={A(<AdminWorkerDetail />)} />
                <Route path="/admin/workers/:id/assist" element={A(<AdminAssist />)} />
                <Route path="/admin/signup" element={A(<AdminSignup />)} />
                <Route path="/admin/households" element={A(<AdminHouseholds />)} />
                <Route path="/admin/complaints" element={A(<AdminComplaints />)} />
                <Route path="/admin/grievances" element={A(<AdminGrievances />)} />
                <Route path="/admin/placements" element={A(<AdminPlacements />)} />
                <Route path="/admin/custody" element={A(<AdminCustody />)} />
                <Route path="/admin/my-activity" element={A(<AdminMyActivity />)} />

                <Route path="/super" element={S(<SuperAlerts />)} />
                <Route path="/super/staff" element={S(<SuperStaff />)} />
                <Route path="/super/audit" element={S(<SuperAudit />)} />
                <Route path="/super/reports" element={S(<SuperReports />)} />
                <Route path="/super/messages" element={S(<SuperMessages />)} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </I18nProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
