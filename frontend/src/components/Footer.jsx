const Footer = () => {
  return (
    <footer
      className="
        border-t border-slate-300 dark:border-slate-800
        bg-white/60 dark:bg-slate-950/60
        backdrop-blur
        text-sm
      "
    >
      <div
        className="
          max-w-7xl mx-auto
          px-6 py-6
          flex flex-col md:flex-row
          items-center justify-between
          gap-4
          text-slate-600 dark:text-slate-400
        "
      >
        {/* LEFT */}
        <span>
          © {new Date().getFullYear()} StudySync
        </span>

        {/* RIGHT */}
        <div className="flex gap-4">
          <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
            Privacy
          </span>
          <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
            Terms
          </span>
          <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
            Contact
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
