export default function Footer() {
  return (
    <footer className="w-full border-t bg-background py-8 mt-auto">
      <div className="container">
        <div className="flex flex-col items-center gap-4">
          <a 
            href="https://linktr.ee/samahbalkhair" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-12 w-auto mx-auto"
            />
          </a>
          <p className="text-sm text-muted-foreground">@SamahBalkhair2025</p>
        </div>
      </div>
    </footer>
  );
}

