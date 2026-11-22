import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

const navLink = "text-georgetown-blue no-underline hover:text-bright-blue";

export function Header() {
  return (
    <header className="print:hidden">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4 px-6 py-[22px]">
        <Link href="/" className="font-display text-2xl font-bold text-georgetown-blue no-underline">
          Pathway<span className="text-bright-blue">AI</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] font-medium">
          <Link href="/browse" className={navLink}>
            Browse careers
          </Link>
          <Link href="/#how-it-works" className={navLink}>
            How it works
          </Link>
          <Link href="/quiz" className={buttonStyles.header}>
            Start the quiz
          </Link>
        </nav>
      </div>
    </header>
  );
}
