import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ title, children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Topbar title={title} />
        <main className="mx-auto max-w-6xl px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
