import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-stone/20 bg-bg/95 px-4 py-3 backdrop-blur-sm">
        <span className="font-serif text-xl font-bold tracking-tight">
          bury.lol
        </span>
        <span className="hidden text-sm text-stone sm:block">
          0 souls at rest
        </span>
        <Link
          href="/bury"
          className="rounded bg-cream px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Dig a grave &rarr;
        </Link>
      </header>

      {/* Main graveyard area */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="max-w-md text-center text-stone">
          Nothing buried yet. Suspicious. The internet has never lost anything?
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone/20 px-4 py-4 text-center text-xs text-stone">
        Made by the internet, for the internet. No one is in charge here.
      </footer>
    </div>
  );
}
