export function PromoVideo() {
  return (
    <div className="relative overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/72 shadow-[0_40px_96px_-56px_rgba(15,84,43,0.2)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.94),rgba(236,253,245,0.74))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,112,58,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2.2rem-1px)] border border-white/35" />

      <div className="relative flex min-h-[350px] items-center justify-center p-4 sm:min-h-[392px] sm:p-5 lg:min-h-[420px]">
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.9rem] border border-white/85 bg-white/55 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.18)] backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.1))]" />

          <video
            className="relative z-10 h-full w-full rounded-[1.5rem] object-contain"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/images/modo-de-uso.png"
            aria-label="Video del modo de aplicacion de INHALEX"
          >
            <source src="/videos/Aplicar.mp4" type="video/mp4" />
            Tu navegador no soporta la reproduccion de video.
          </video>
        </div>
      </div>
    </div>
  )
}
