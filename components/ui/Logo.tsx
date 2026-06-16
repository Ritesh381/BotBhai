import Image from "next/image";

interface LogoProps {
  /** pixel height of the logo mark; the wordmark scales with it */
  size?: number;
  /** show the "BotBhai" wordmark next to the mark */
  withWordmark?: boolean;
  className?: string;
}

// Brand mark used across the app (landing, login, dashboard sidebar).
export function Logo({ size = 32, withWordmark = true, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="BotBhai logo"
        width={size}
        height={size}
        priority
        className="object-contain"
      />
      {withWordmark && <span className="font-bold">BotBhai</span>}
    </span>
  );
}
